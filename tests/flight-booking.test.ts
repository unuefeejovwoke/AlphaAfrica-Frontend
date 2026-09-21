import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFlightVerifyUrl,
  findReusableBooking,
  hashBookingKey,
  readPaymentReference,
  savePaymentReference,
  type PendingBookingRecord,
} from "../lib/api/flight-bookings.ts";

// ---------------------------------------------------------------------------
// Seam 1: duplicate-submission prevention (single-flight guard support)
// Same Confirmed Offer + party reuses the pending reference; anything else
// starts a new reference. Vertical slices: one failing test → minimal impl.
// ---------------------------------------------------------------------------

const OFFER_A = { id: "offer-a", total_amount: "250000.00", origin: "LOS" };
const OFFER_B = { id: "offer-b", total_amount: "310000.00", origin: "LOS" };
const PARTY = { adults: 1, children: 0, infants: 0 };

test("Pending booking: same offer and party reuses the reference, different starts new", () => {
  const stored: PendingBookingRecord = {
    key: hashBookingKey(OFFER_A, PARTY),
    reference: "FLT-REF-001",
    authorization_url: "https://paystack.test/pay/flt-ref-001",
  };

  const reuse = findReusableBooking(stored, hashBookingKey(OFFER_A, PARTY));
  assert.deepEqual(reuse, {
    reference: "FLT-REF-001",
    authorization_url: "https://paystack.test/pay/flt-ref-001",
  });

  assert.equal(findReusableBooking(stored, hashBookingKey(OFFER_B, PARTY)), null);
  assert.equal(
    findReusableBooking(stored, hashBookingKey(OFFER_A, { adults: 2, children: 0, infants: 0 })),
    null,
  );
  assert.equal(findReusableBooking(null, hashBookingKey(OFFER_A, PARTY)), null);
});

// ---------------------------------------------------------------------------
// Seam 2: reference persistence (return URL query param + sessionStorage)
// The Payment Reference must survive refresh, back navigation, and a new tab
// after the Paystack handoff. sessionStorage is stubbed in-memory: node has
// no window, so the test installs the smallest viable Storage stand-in.
// ---------------------------------------------------------------------------

function installMemorySessionStorage(): void {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string): string | null => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
  };
  (globalThis as { window?: unknown }).window = { sessionStorage: storage };
}

function uninstallWindowStub(): void {
  delete (globalThis as { window?: unknown }).window;
}

test("Pending booking: reference persists in both the return URL and sessionStorage", () => {
  installMemorySessionStorage();
  try {
    assert.equal(readPaymentReference(), null);

    savePaymentReference("FLT-REF-001");

    assert.equal(readPaymentReference(), "FLT-REF-001");

    const url = buildFlightVerifyUrl("FLT-REF-001");
    assert.match(url, /reference=FLT-REF-001/);
  } finally {
    uninstallWindowStub();
  }
});
