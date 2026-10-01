import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Ticket 07 — Hotel, Car, Visa and package mutations/verifications go through
// site-owned handlers, never naming the backend host from the browser.
// Exercised at the backend boundary seam (stubbed fetch): request shape,
// same-origin vs absolute construction, un-cached reads, abort.

import { createHotelBooking, verifyHotelBooking } from "../lib/api/hotels.ts"
import { createCarBooking, verifyCarBooking } from "../lib/api/cars.ts"
import {
  submitVisaConsultation,
  verifyVisaPayment,
} from "../lib/api/visa.ts"
import { submitPackageEnquiry } from "../lib/api/packages.ts"
import { proxyToBackend } from "../lib/api/proxy.ts"
import { getApiBaseUrl } from "../lib/api/client.ts"

const ROOT = join(import.meta.dirname, "..")

function stubFetch(
  t: { after: (fn: () => void) => void },
  impl: (url: unknown, init?: RequestInit) => Promise<Response>
): void {
  const original = globalThis.fetch
  globalThis.fetch = impl as typeof fetch
  t.after(() => {
    globalThis.fetch = original
  })
}

function asBrowser(t: { after: (fn: () => void) => void }): void {
  const had = "window" in globalThis
  const prev = (globalThis as Record<string, unknown>).window
  ;(globalThis as Record<string, unknown>).window = {}
  t.after(() => {
    if (had) (globalThis as Record<string, unknown>).window = prev
    else delete (globalThis as Record<string, unknown>).window
  })
}

function asServer(t: { after: (fn: () => void) => void }): void {
  const had = "window" in globalThis
  const prev = (globalThis as Record<string, unknown>).window
  delete (globalThis as Record<string, unknown>).window
  t.after(() => {
    if (had) (globalThis as Record<string, unknown>).window = prev
  })
}

function ok(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(
    Response.json(body, {
      status,
      headers: { "content-type": "application/json" },
    })
  )
}

const CREATE_RESULT = {
  reference: "ALPHAA-1",
  authorization_url: "https://checkout.paystack.com/x",
}

test("mutations go same-origin: relative URL, no backend host, POST + JSON body", async (t) => {
  asBrowser(t)
  const seen: { url: string; init?: RequestInit }[] = []
  stubFetch(t, (url, init) => {
    seen.push({ url: String(url), init })
    if (String(url).includes("enquire")) {
      return ok({
        reference: "ENQ-1",
        package_title: "Kenya Safari",
        full_name: "Ada Okafor",
        email: "ada@example.com",
        phone: "+2348012345678",
        total_travelers: 2,
        created_at: "2026-01-01T00:00:00Z",
      })
    }
    return ok({
      booking: { reference: "ALPHAA-1" },
      payment: CREATE_RESULT,
    })
  })

  await createHotelBooking({
    hotel_id: 1,
    room_type_id: 2,
    check_in: "2026-07-15",
    check_out: "2026-07-18",
    num_rooms: 1,
    num_guests: 2,
    guest_name: "Ada Okafor",
    guest_email: "ada@example.com",
    guest_phone: "+2348031234567",
  })
  await createCarBooking({
    vehicle_id: 1,
    pickup_location: "Murtala Muhammed Airport, Lagos",
    dropoff_location: "Eko Hotel, Victoria Island",
    pickup_datetime: "2999-07-20T09:00:00.000Z",
    num_hours: 5,
    guest_name: "Ada Okafor",
    guest_email: "ada@example.com",
    guest_phone: "+2348012345678",
  })
  await submitVisaConsultation({
    country_id: 1,
    full_name: "Ada Okafor",
    email: "ada@example.com",
    phone: "+2348012345678",
    travel_purpose: "tourism",
    num_applicants: 1,
  })
  await submitPackageEnquiry("kenya-safari", {
    full_name: "Ada Okafor",
    email: "ada@example.com",
    phone: "+2348012345678",
    num_adults: 2,
    num_children: 1,
  })

  assert.equal(seen.length, 4)
  for (const { url, init } of seen) {
    assert.ok(url.startsWith("/"), `must be relative, got ${url}`)
    assert.ok(
      !url.includes("api.alphaaafrica.com"),
      `must not name the backend host: ${url}`
    )
    assert.equal(init?.method, "POST")
    assert.equal(init?.cache, "no-store")
    assert.ok(
      String(init?.body ?? "").includes("ada@example.com"),
      "body must travel through the proxy"
    )
  }
  assert.ok(seen[0].url.startsWith("/api/hotels/bookings/create"))
  assert.ok(seen[1].url.startsWith("/api/cars/bookings/create"))
  assert.ok(seen[2].url.startsWith("/api/visa/apply"))
  assert.ok(
    seen[3].url.startsWith("/api/packages/kenya-safari/enquire"),
    `package enquire must carry the slug: ${seen[3].url}`
  )
})

test("verification reads are same-origin and never cached", async (t) => {
  asBrowser(t)
  const seen: { url: string; init?: RequestInit }[] = []
  stubFetch(t, (url, init) => {
    seen.push({ url: String(url), init })
    if (String(url).includes("/api/hotels/"))
      return ok({ reference: "ALPHAA-H", status: "pending" })
    if (String(url).includes("/api/cars/"))
      return ok({ reference: "ALPHAA-C", status: "pending" })
    return ok({
      id: 1,
      reference: "ALPHAA-V",
      country_name: "Kenya",
      full_name: "Ada Okafor",
      email: "ada@example.com",
      phone: "+2348012345678",
      consultation_fee: "5000.00",
      status: "pending",
      created_at: "2026-01-01T00:00:00Z",
    })
  })

  await verifyHotelBooking("ALPHAA-H")
  await verifyCarBooking("ALPHAA-C")
  await verifyVisaPayment("ALPHAA-V")

  assert.equal(seen.length, 3)
  for (const { url, init } of seen) {
    assert.ok(url.startsWith("/"), `must be relative, got ${url}`)
    assert.ok(!url.includes("api.alphaaafrica.com"))
    assert.equal(init?.method, "GET")
    assert.equal(init?.cache, "no-store", `un-cached read required: ${url}`)
  }
})

test("server calls stay absolute against the backend host", async (t) => {
  asServer(t)
  let url = ""
  stubFetch(t, (u) => {
    url = String(u)
    return ok({ reference: "ALPHAA-H", status: "pending" })
  })
  await verifyHotelBooking("ALPHAA-H")
  assert.ok(
    url.startsWith(`${getApiBaseUrl()}/api/hotels/bookings/verify/`),
    `server must hit the backend host, got ${url}`
  )
})

test("proxy forwards method, query, headers and body; passes status through un-cached; abort answers 499", async (t) => {
  asServer(t)
  let upstreamUrl = ""
  let upstreamInit: RequestInit | undefined
  stubFetch(t, (url, init) => {
    upstreamUrl = String(url)
    upstreamInit = init
    return Promise.resolve(
      new Response(JSON.stringify({ reference: "ALPHAA-H" }), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    )
  })
  const body = JSON.stringify({ hotel_id: 1, guest_email: "ada@example.com" })
  const created = await proxyToBackend(
    new Request("http://localhost/api/hotels/bookings/create/?next=1", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: "Bearer test-token",
      },
      body,
    }),
    "/api/hotels/bookings/create/"
  )
  assert.equal(
    upstreamUrl,
    `${getApiBaseUrl()}/api/hotels/bookings/create/?next=1`,
    "method target plus query must reach the backend"
  )
  assert.equal(upstreamInit?.method, "POST")
  const upstreamHeaders = new Headers(upstreamInit?.headers)
  assert.equal(upstreamHeaders.get("accept"), "application/json")
  assert.equal(upstreamHeaders.get("content-type"), "application/json")
  assert.equal(upstreamHeaders.get("authorization"), "Bearer test-token")
  assert.equal(await upstreamInit?.body, body)
  assert.equal(created.status, 201, "upstream status must pass through")
  assert.equal(created.headers.get("Cache-Control"), "no-store")
  assert.equal(
    created.headers.get("X-Content-Type-Options"),
    "nosniff"
  )
  assert.equal(
    (await created.json() as { reference: string }).reference,
    "ALPHAA-H"
  )

  stubFetch(t, (_url, init) => {
    assert.equal(init?.method, "GET")
    assert.ok(init?.signal instanceof AbortSignal)
    return ok({ reference: "ALPHAA-V", status: "paid" }, 200)
  })
  const pass = await proxyToBackend(
    new Request("http://localhost/api/visa/verify/ALPHAA-V?token=abc"),
    "/api/visa/verify/ALPHAA%2FV/"
  )
  assert.equal(pass.status, 200)
  assert.equal(pass.headers.get("Cache-Control"), "no-store")

  stubFetch(t, (_url, init) => {
    return new Promise((_resolve, reject) => {
      if (init?.signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"))
        return
      }
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true }
      )
    })
  })
  const timedOut = await proxyToBackend(
    new Request("http://localhost/api/hotels/bookings/verify/R/"),
    "/api/hotels/bookings/verify/R/",
    { timeoutMs: 20 }
  )
  assert.equal(timedOut.status, 499)

  const preAborted = new Request(
    "http://localhost/api/hotels/bookings/verify/R/",
    { signal: AbortSignal.abort() }
  )
  assert.equal(
    (await proxyToBackend(preAborted, "/api/hotels/bookings/verify/R/")).status,
    499
  )
})

test("new handlers are shaped like the flight/payment handlers", () => {
  // Route file → [HTTP method, exact upstream path wired to proxyToBackend].
  // The forwarding itself is executed against the shared proxy above; this
  // pins each handler's wiring so a wrong path can never ship unnoticed.
  const routes: Record<string, [string, string]> = {
    "app/api/hotels/bookings/create/route.ts": [
      "POST",
      "/api/hotels/bookings/create/",
    ],
    "app/api/hotels/bookings/verify/[reference]/route.ts": [
      "GET",
      "/api/hotels/bookings/verify/${encodeURIComponent(reference)}/",
    ],
    "app/api/cars/bookings/create/route.ts": [
      "POST",
      "/api/cars/bookings/create/",
    ],
    "app/api/cars/bookings/verify/[reference]/route.ts": [
      "GET",
      "/api/cars/bookings/verify/${encodeURIComponent(reference)}/",
    ],
    "app/api/visa/apply/route.ts": ["POST", "/api/visa/apply/"],
    "app/api/visa/verify/[reference]/route.ts": [
      "GET",
      "/api/visa/verify/${encodeURIComponent(reference)}/",
    ],
    "app/api/packages/[slug]/enquire/route.ts": [
      "POST",
      "/api/packages/${encodeURIComponent(slug)}/enquire/",
    ],
  }
  for (const [route, [method, upstream]] of Object.entries(routes)) {
    const src = readFileSync(join(ROOT, route), "utf8")
    assert.match(src, /proxyToBackend/, `${route}: must proxy`)
    assert.match(src, /force-dynamic/, `${route}: must stay dynamic`)
    assert.ok(
      src.includes(`function ${method}`),
      `${route}: must export ${method}`
    )
    assert.ok(
      src.includes(upstream),
      `${route}: must forward to ${upstream}`
    )
    if (route.includes("[")) {
      assert.match(src, /encodeURIComponent/, `${route}: must encode segments`)
    }
  }
})
