/**
 * Browser console audit — zero-dependency CDP harness.
 *
 * Drives the running dev server in headless Chromium, captures the page
 * console, and fails when a configured pattern is observed. No npm packages:
 * it talks to the Chrome DevTools Protocol over Node's built-in WebSocket.
 *
 *   node scripts/console-audit.mjs [url ...]
 *
 * Defaults to the public routes that render the site navigation. Exits 1 when
 * a watched pattern fires, 0 when the console is clean.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Modern Chromium builds first. Ancient system browsers (e.g. an old Edge)
 * fail to parse current Next.js chunks, so the page never hydrates and the
 * audit silently passes on an empty console.
 */
const BROWSER_CANDIDATES = [
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1208\\chrome-win\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium_headless_shell-1208\\chrome-win\\headless_shell.exe`,
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/microsoft-edge-stable",
];

const BASE_URL = process.env.CONSOLE_AUDIT_BASE_URL ?? "http://localhost:3000";

const DEFAULT_PATHS = [
  "/",
  "/flights?trip_type=one_way&origin=LOS&destination=DXB&departureDate=2026-09-26&adults=1&children=0&infants=0&cabin=ECONOMY",
];

/** Console patterns that must never appear in the dev console. */
const FORBIDDEN = [
  {
    name: "base-ui-native-button",
    pattern: /component that acts as a button expected a native <button>/,
    hint: "Button rendered a non-<button> while nativeButton is true (set nativeButton={false} or render a <button>)",
  },
  {
    name: "base-ui-non-native-button",
    pattern: /component that acts as a button expected a non-<button>/,
    hint: "Button rendered a <button> while nativeButton is false",
  },
];

/**
 * Signals that the harness itself is broken — the page did not execute, so a
 * clean console proves nothing and the run must not be reported as a pass.
 */
const INFRA_PATTERNS = [
  /SyntaxError/,
  /ReferenceError: (window|self|document) is not defined/,
];

const SETTLE_MS = Number(process.env.CONSOLE_AUDIT_SETTLE_MS ?? 2500);
const NAV_TIMEOUT_MS = 45_000;

function findBrowser() {
  const fromEnv =
    process.env.CONSOLE_AUDIT_BROWSER ??
    process.env.CHROME_PATH ??
    process.env.EDGE_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const found = BROWSER_CANDIDATES.find((p) => p && existsSync(p));
  if (!found) {
    throw new Error(
      "No modern Chromium binary found. Set CONSOLE_AUDIT_BROWSER to one."
    );
  }
  return found;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function launchBrowser() {
  const profileDir = mkdtempSync(join(tmpdir(), "console-audit-"));
  const child = spawn(
    findBrowser(),
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  const endpoint = new Promise((resolve, reject) => {
    let stderr = "";
    const timer = setTimeout(
      () => reject(new Error(`Browser never reported DevTools endpoint:\n${stderr}`)),
      30_000
    );
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Browser exited early with code ${code}:\n${stderr}`));
    });
  });

  return { child, endpoint, profileDir };
}

/** Minimal CDP client over the browser-level WebSocket. */
class Cdp {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener(
        "error",
        () => reject(new Error("CDP socket error")),
        { once: true }
      );
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      for (const handler of this.listeners.get(message.method) ?? []) {
        handler({ ...message.params, sessionId: message.sessionId });
      }
    });
  }

  on(method, handler) {
    const list = this.listeners.get(method) ?? [];
    list.push(handler);
    this.listeners.set(method, list);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.socket.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.socket.close();
  }
}

function flattenRemoteObject(arg) {
  if (arg.type === "string") return arg.value ?? "";
  if (arg.type === "undefined") return "undefined";
  if (arg.value !== undefined) return String(arg.value);
  return arg.description ?? arg.type;
}

async function waitForNetworkIdle(cdp, sessionId, url) {
  const { frameId } = await cdp.send("Page.navigate", { url }, sessionId);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const timer = setTimeout(finish, NAV_TIMEOUT_MS);
    const handler = (params) => {
      if (params.frameId !== frameId || params.name !== "networkIdle") return;
      clearTimeout(timer);
      cdp.listeners.get("Page.lifecycleEvent")?.pop();
      finish();
    };
    cdp.on("Page.lifecycleEvent", handler);
  });
}

/**
 * Confirms React actually attached to a rendered Button. Without this the
 * audit can pass on a page whose scripts never ran.
 */
const HYDRATION_PROBE = `(() => {
  const el = document.querySelector('[data-slot="button"]');
  if (!el) { return 'no-button'; }
  return Object.keys(el).some((k) => k.startsWith('__react')) ? 'hydrated' : 'not-hydrated';
})()`;

async function probeHydration(cdp, sessionId) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression: HYDRATION_PROBE, returnByValue: true, awaitPromise: false },
    sessionId
  );
  return result?.result?.value ?? "probe-failed";
}

async function main() {
  const urls =
    process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_PATHS;

  const { child, endpoint, profileDir } = launchBrowser();
  const cdp = new Cdp(await endpoint);

  const messages = [];
  let exitCode = 0;

  try {
    await cdp.connect();
    const { targetId } = await cdp.send("Target.createTarget", {
      url: "about:blank",
    });
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Log.enable", {}, sessionId);
    await cdp.send("Page.setLifecycleEventsEnabled", { enabled: true }, sessionId);

    cdp.on("Runtime.consoleAPICalled", (params) => {
      if (params.sessionId !== sessionId) return;
      messages.push({
        source: `console.${params.type}`,
        text: params.args.map(flattenRemoteObject).join(" "),
      });
    });
    cdp.on("Log.entryAdded", (params) => {
      if (params.sessionId !== sessionId) return;
      messages.push({
        source: `browser.${params.entry.level}`,
        text: params.entry.text,
      });
    });
    cdp.on("Runtime.exceptionThrown", (params) => {
      if (params.sessionId !== sessionId) return;
      const details = params.exceptionDetails;
      messages.push({
        source: "exception",
        text: [
          details?.text ?? "",
          details?.exception?.description ?? "",
          details?.url ?? "",
        ]
          .filter(Boolean)
          .join(" "),
      });
    });

    for (const rawUrl of urls) {
      const url = rawUrl.startsWith("http") ? rawUrl : `${BASE_URL}${rawUrl}`;
      messages.length = 0;

      await waitForNetworkIdle(cdp, sessionId, url);
      await delay(SETTLE_MS);

      const hits = [];
      const infra = [];
      for (const message of messages) {
        const rule = FORBIDDEN.find((r) => r.pattern.test(message.text));
        if (rule) hits.push({ rule, message });
        if (INFRA_PATTERNS.some((p) => p.test(message.text))) infra.push(message);
      }

      const hydration = await probeHydration(cdp, sessionId);
      if (hydration !== "hydrated") {
        infra.push({
          source: "probe",
          text: `hydration probe returned "${hydration}" — page scripts did not run`,
        });
      }

      if (process.env.CONSOLE_AUDIT_VERBOSE) {
        for (const message of messages) {
          console.log(`      --- ${message.source} ---`);
          console.log(message.text);
        }
        console.log(`      probe: ${hydration}`);
      }

      if (infra.length > 0) {
        exitCode = 2;
        console.log(`ERROR ${url} — harness could not observe the real page`);
        for (const message of infra) {
          console.log(`      ${message.source}: ${message.text.split("\n")[0]}`);
        }
        continue;
      }

      if (hits.length === 0) {
        console.log(`PASS  ${url} (${messages.length} console messages)`);
        continue;
      }

      exitCode = Math.max(exitCode, 1);
      console.log(`FAIL  ${url}`);
      for (const { rule, message } of hits) {
        console.log(`      [${rule.name}] ${rule.hint}`);
        console.log(`      ${message.source}: ${message.text.split("\n")[0]}`);
      }
    }
  } finally {
    cdp.close();
    child.kill();
    await delay(300);
    rmSync(profileDir, { recursive: true, force: true });
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(`console-audit failed: ${error.message}`);
  process.exit(2);
});
