import { z } from "zod"
import { apiGet } from "./client.ts"

/**
 * Post-payment order lookup (PRD §13, §8.4).
 *
 * After a Paystack redirect, the frontend must never assume success from
 * the return itself. Given a payment reference, the backend verifies the
 * payment idempotently, determines the booking type, and returns the order
 * details used to render a dynamic confirmation for any booking type.
 *
 * Shape is intentionally permissive: every booking type funnels through
 * this endpoint, so only `reference` is required and the rest is read
 * defensively by renderers.
 */

export const paymentOrderSchema = z.object({
  reference: z.string(),
  booking_type: z.string().optional().default(""),
  status: z.string().optional().default(""),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional().default("NGN"),
  customer_name: z.string().optional().default(""),
  description: z.string().optional().default(""),
})

export type PaymentOrder = z.infer<typeof paymentOrderSchema>

/**
 * Fetch the final order for a payment reference. Never cached: verification
 * must reflect the live payment state, not a stale "pending" snapshot.
 */
export async function getPaymentOrder(
  reference: string
): Promise<PaymentOrder> {
  const raw = await apiGet<unknown>(
    `/api/payments/order/${encodeURIComponent(reference)}/`,
    {
      noStore: true,
    }
  )
  return paymentOrderSchema.parse(raw)
}

/** A universal order counts as complete only for explicit success states. */
export function isOrderPaid(status: string | undefined | null): boolean {
  if (!status) return false
  return ["paid", "confirmed", "completed"].includes(
    status.trim().toLowerCase()
  )
}

/**
 * A Visa Consultation counts as complete for post-payment states. Unlike
 * the universal order, `contacted` is terminal-proof here: a specialist
 * only contacts the customer after the consultation fee has moved.
 */
export function isVisaApplicationPaid(
  status: string | undefined | null
): boolean {
  if (!status) return false
  return ["paid", "contacted", "completed"].includes(
    status.trim().toLowerCase()
  )
}
