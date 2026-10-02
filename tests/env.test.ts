import test from "node:test"
import assert from "node:assert/strict"
import {
  analyticsIds,
  apiBaseUrl,
  normalizeBaseUrl,
  resolveBaseUrl,
  siteUrl,
} from "../lib/env.ts"

// ---------------------------------------------------------------------------
// lib/env.ts — centralized environment access (warn-with-fallback policy)
// ---------------------------------------------------------------------------

const MANAGED_KEYS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "API_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "SITE_URL",
  "NEXT_PUBLIC_GTM_ID",
  "NEXT_PUBLIC_GA_ID",
] as const

function snapshotEnv(): Record<string, string | undefined> {
  return Object.fromEntries(MANAGED_KEYS.map((key) => [key, process.env[key]]))
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of MANAGED_KEYS) {
    const value = snapshot[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function withEnv(
  overrides: Partial<Record<(typeof MANAGED_KEYS)[number], string | undefined>>,
  run: () => void
): void {
  const snapshot = snapshotEnv()
  try {
    for (const key of MANAGED_KEYS) {
      delete process.env[key]
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) process.env[key] = value
    }
    run()
  } finally {
    restoreEnv(snapshot)
  }
}

test("normalizeBaseUrl trims whitespace and strips trailing slashes", () => {
  assert.equal(
    normalizeBaseUrl("https://api.alphaaafrica.com///"),
    "https://api.alphaaafrica.com"
  )
  assert.equal(
    normalizeBaseUrl("  http://localhost:3000/  "),
    "http://localhost:3000"
  )
})

test("resolveBaseUrl prefers the first non-blank candidate", () => {
  assert.equal(
    resolveBaseUrl(
      "test URL",
      "https://fallback.test",
      "  ",
      "https://second.test/"
    ),
    "https://second.test"
  )
  assert.equal(
    resolveBaseUrl(
      "test URL",
      "https://fallback.test",
      "https://first.test/",
      "https://second.test"
    ),
    "https://first.test"
  )
})

test("resolveBaseUrl falls back when nothing is configured", () => {
  assert.equal(
    resolveBaseUrl("test URL", "https://fallback.test", undefined, "   "),
    "https://fallback.test"
  )
})

test("resolveBaseUrl falls back with a warning on malformed URLs", () => {
  const warnings: unknown[][] = []
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    warnings.push(args)
  }
  try {
    assert.equal(
      resolveBaseUrl("test URL", "https://fallback.test", "not-a-url"),
      "https://fallback.test",
      "A bad local value must never hard-crash the app"
    )
  } finally {
    console.warn = originalWarn
  }
  assert.equal(warnings.length, 1, "Malformed values must warn in dev/test")
  assert.match(String(warnings[0]?.[0]), /Invalid test URL/)
})

test("apiBaseUrl honors NEXT_PUBLIC first, then server-only, then default", () => {
  withEnv({}, () => {
    assert.equal(apiBaseUrl(), "https://api.alphaaafrica.com")
  })
  withEnv({ API_BASE_URL: "https://staging-api.test/" }, () => {
    assert.equal(apiBaseUrl(), "https://staging-api.test")
  })
  withEnv(
    {
      NEXT_PUBLIC_API_BASE_URL: "https://public.test",
      API_BASE_URL: "https://server.test",
    },
    () => {
      assert.equal(apiBaseUrl(), "https://public.test")
    }
  )
})

test("siteUrl honors NEXT_PUBLIC first, then server-only, then default", () => {
  withEnv({}, () => {
    assert.equal(siteUrl(), "https://alphaaafrica.com")
  })
  withEnv({ SITE_URL: "http://localhost:3000/" }, () => {
    assert.equal(siteUrl(), "http://localhost:3000")
  })
  withEnv(
    {
      NEXT_PUBLIC_SITE_URL: "https://public.test",
      SITE_URL: "https://server.test",
    },
    () => {
      assert.equal(siteUrl(), "https://public.test")
    }
  )
})

test("analyticsIds trims values and defaults to blank (disabled)", () => {
  withEnv({}, () => {
    assert.deepEqual(analyticsIds(), { gtmId: "", gaId: "" })
  })
  withEnv({ NEXT_PUBLIC_GTM_ID: "  GTM-ABC123  " }, () => {
    assert.deepEqual(analyticsIds(), { gtmId: "GTM-ABC123", gaId: "" })
  })
})
