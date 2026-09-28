import test from "node:test"
import assert from "node:assert/strict"
import {
  extractOrderDetails,
  isOrderPaid,
  isOrderPending,
  paymentOrderSchema,
  resolveOrderPaymentStatus,
} from "../lib/api/payments.ts"

// ---------------------------------------------------------------------------
// Guide §12 — order lookup is the PRIMARY post-payment call.
// The guide returns `payment_status: "success"`; legacy shapes use `status`.
// ---------------------------------------------------------------------------

test("Order status: guide payment_status wins, legacy status falls back", () => {
  const guide = paymentOrderSchema.parse({
    reference: "ALPHAA-1",
    booking_type: "flight",
    payment_status: "success",
  })
  assert.equal(resolveOrderPaymentStatus(guide), "success")
  assert.equal(isOrderPaid(resolveOrderPaymentStatus(guide)), true)

  const legacy = paymentOrderSchema.parse({
    reference: "ALPHAA-2",
    status: "paid",
  })
  assert.equal(resolveOrderPaymentStatus(legacy), "paid")
  assert.equal(isOrderPaid(resolveOrderPaymentStatus(legacy)), true)

  const pending = paymentOrderSchema.parse({
    reference: "ALPHAA-3",
    payment_status: "pending",
  })
  assert.equal(isOrderPaid(resolveOrderPaymentStatus(pending)), false)
  assert.equal(isOrderPending(resolveOrderPaymentStatus(pending)), true)
  assert.equal(isOrderPending(null), true)
})

test("Order details: embedded module order is extractable, absence is null", () => {
  const withOrder = paymentOrderSchema.parse({
    reference: "ALPHAA-1",
    order: { pnr: "7OO6W2", status: "confirmed" },
  })
  assert.deepEqual(extractOrderDetails(withOrder), {
    pnr: "7OO6W2",
    status: "confirmed",
  })

  const bare = paymentOrderSchema.parse({ reference: "ALPHAA-2" })
  assert.equal(extractOrderDetails(bare), null)
})
