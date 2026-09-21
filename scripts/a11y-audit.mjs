/**
 * Static accessibility + repo-convention audit for the flight journey
 * (Phase 3, ticket 09). No dependencies — run with:
 *
 *   node scripts/a11y-audit.mjs
 *
 * Exits 1 on hard errors, 0 with warnings listed. Every finding needs a
 * human verdict: the script cannot tell a decorative icon from a control.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCOPED_DIRS = [
  "components/flights",
  "components/support",
  "components/feedback",
  "app/(checkout)",
  "app/(public)/flights",
];

const SCOPED_FILES = ["components/ui/traveller-stepper.tsx"];

function collectFiles() {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(join(ROOT, dir));
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = `${dir}/${entry}`;
      const full = join(ROOT, rel);
      if (statSync(full).isDirectory()) walk(rel);
      else if (/\.tsx$/.test(entry)) out.push(rel);
    }
  };
  for (const dir of SCOPED_DIRS) walk(dir);
  return [...out, ...SCOPED_FILES];
}

/** Join lines of a JSX tag starting at `index` until the closing `>`. */
function readTag(lines, index) {
  let text = "";
  let i = index;
  while (i < lines.length) {
    text += `\n${lines[i]}`;
    if (/(^|[^=])>/.test(lines[i])) break;
    i += 1;
    if (i - index > 12) break;
  }
  return { text, last: i };
}

const errors = [];
const warnings = [];

for (const file of collectFiles()) {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    // 1. Click handlers on non-interactive elements.
    if (/<(div|span)[^>]*\bonClick=/.test(line)) {
      errors.push(`${file}:${lineNo} onClick on <${line.match(/<(div|span)/)[1]}> — use a <button>`);
    }

    // 2. Images without alt text.
    if (/<img\b/.test(line)) {
      const { text } = readTag(lines, idx);
      if (!/\balt=/.test(text)) errors.push(`${file}:${lineNo} <img> without alt`);
    }
    if (/<Image\b/.test(line)) {
      const { text } = readTag(lines, idx);
      if (!/\balt=/.test(text)) errors.push(`${file}:${lineNo} <Image> without alt`);
    }

    // 3. Live regions missing their politeness.
    if (/\brole="status"/.test(line)) {
      const { text } = readTag(lines, idx);
      if (!/\baria-live=/.test(text)) errors.push(`${file}:${lineNo} role="status" without aria-live`);
    }

    // 4. Repo Input convention: every field carries a real label.
    if (/<Input\b/.test(line)) {
      const { text } = readTag(lines, idx);
      if (!/\blabel=/.test(text)) errors.push(`${file}:${lineNo} <Input> without label= (no placeholder-only labels)`);
    }

    // 5. Small tap targets on controls (manual verdict required).
    if (/\bsize-[78]\b/.test(line) && /button|Close|aria-label/i.test(line)) {
      warnings.push(`${file}:${lineNo} possible <44px target (${line.trim().slice(0, 80)})`);
    }

    // 6. Tiny muted copy (manual contrast verdict required).
    if (/text-\[(10|11)(px|\.\d+px)?\]/.test(line) && /muted/.test(line)) {
      warnings.push(`${file}:${lineNo} tiny muted copy — verify contrast (${line.trim().slice(0, 80)})`);
    }

    // 7. Repo rule: ternary, never &&, for conditional JSX.
    if (/\{\s*[\w.()[\]]+\s*&&\s*\(/.test(line)) {
      warnings.push(`${file}:${lineNo} && conditional render — prefer ternary (${line.trim().slice(0, 80)})`);
    }
  });
}

for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s) across ${collectFiles().length} files.`);
process.exit(errors.length > 0 ? 1 : 0);
