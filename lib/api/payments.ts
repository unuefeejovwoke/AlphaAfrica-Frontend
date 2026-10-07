import { z } from "zod"
import { apiGet } from "./client.ts"

/**
 * Never-cached, same-origin request options shared by every post-payment
 * verification read — this universal order lookup and every module verify
 * call. Verification must reflect the live payment state, so a cached
 * "pending" snapshot can never mask a completed payment. Re-exported by the
 * verification seam so it stays one documented read policy.
 */
export const VERIFICATION_REQUEST = {
  noStore: true,
  sameOrigin: true,
} as const

/**
 * Post-payment order lookup (guide §12, PRD §13, §8.4).
 *
 * After a Paystack redirect, the frontend must never assume success from
 * the return itself. Given a payment reference, the backend verifies the
 * payment idempotently, determines the booking type, and returns the order
 * details used to render a dynamic confirmation for any booking type.
 * This endpoint is the PRIMARY post-payment call; module verify endpoints
 * are the fallback for full booking shapes.
 *
 * Shape is intentionally permissive: every booking type funnels through
 * this endpoint, so only `reference` is required and the rest is read
 * defensively by renderers. The guide returns `payment_status: "success"`;
 * legacy shapes use `status` — both are accepted.
 */

export const paymentOrderSchema = z.object({
  reference: z.string(),
  booking_type: z.string().optional().default(""),
  payment_status: z.string().optional().default(""),
  status: z.string().optional().default(""),
  amount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional().default("NGN"),
  customer_name: z.string().optional().default(""),
  description: z.string().optional().default(""),
  // Module-specific order details (for flights: the booking with `pnr`,
  // `amadeus_order_id`, `flight_details`, `travelers`).
  order: z.unknown().optional(),
  pnr: z.string().optional(),
  amadeus_order_id: z.string().optional(),
  flight_details: z.unknown().optional(),
  travelers: z.unknown().optional(),
})

export type PaymentOrder = z.infer<typeof paymentOrderSchema>

export interface GetPaymentOrderOptions {
  /** Guest secure token from the confirmation email (`?token=`). */
  token?: string
  /** Logged-in access token — sent as `Authorization: Bearer`, never in URLs. */
  authToken?: string
}

/**
 * Fetch the final order for a payment reference. Never cached: verification
 * must reflect the live payment state, not a stale "pending" snapshot.
 */
export async function getPaymentOrder(
  reference: string,
  options: GetPaymentOrderOptions = {}
): Promise<PaymentOrder> {
  const raw = await apiGet<unknown>(
    `/api/payments/order/${encodeURIComponent(reference)}/`,
    {
      ...VERIFICATION_REQUEST,
      ...(options.token ? { query: { token: options.token } } : {}),
      ...(options.authToken ? { authToken: options.authToken } : {}),
    }
  )
  return paymentOrderSchema.parse(raw)
}

/** Authoritative money-movement flag: guide `payment_status` wins, `status` falls back. */
export function resolveOrderPaymentStatus(order: {
  payment_status?: string | null
  status?: string | null
}): string {
  const status =
    (typeof order.payment_status === "string" && order.payment_status.trim()) ||
    (typeof order.status === "string" && order.status.trim()) ||
    ""
  return status
}

/** A universal order counts as complete only for explicit success states. */
export function isOrderPaid(status: string | undefined | null): boolean {
  if (!status) return false
  return ["paid", "confirmed", "completed", "success"].includes(
    status.trim().toLowerCase()
  )
}

/** Still settling (webhook may not have run) — retry once after ~2s, never poll.
 * Terminal states (`abandoned`, `failed`, `cancelled`, `expired`) are NOT
 * pending: the payment will never settle, so callers must render the
 * not-completed branch immediately instead of waiting + retrying. */
export function isOrderPending(status: string | undefined | null): boolean {
  if (!status) return true
  return ["pending", "processing", "initialized"].includes(
    status.trim().toLowerCase()
  )
}

/** Module-specific order details, if the backend embedded them. */
export function extractOrderDetails(order: PaymentOrder): unknown | null {
  return order.order ?? null
}

// ---------------------------------------------------------------------------
// Order history (guide §12) — "View All My Orders".
// Logged-in users authenticate with Bearer; guests pass the email + secure
// token from their confirmation email.
// ---------------------------------------------------------------------------

export const orderHistoryItemSchema = z
  .object({
    reference: z.string(),
    booking_type: z.string().optional().default(""),
    title: z.string().optional().default(""),
    amount: z.union([z.string(), z.number()]).optional(),
    currency: z.string().optional().default("NGN"),
    payment_status: z.string().optional().default(""),
    status: z.string().optional().default(""),
    paid_at: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    /** Present on reserved international flight bookings only. */
    ticketing_deadline: z.string().optional().nullable(),
  })
  .passthrough()

export type OrderHistoryItem = z.infer<typeof orderHistoryItemSchema>

export interface GetOrderHistoryOptions {
  email?: string
  token?: string
  authToken?: string
}

export async function getOrderHistory(
  options: GetOrderHistoryOptions = {}
): Promise<OrderHistoryItem[]> {
  const raw = await apiGet<unknown>("/api/payments/orders/history/", {
    noStore: true,
    sameOrigin: true,
    query: {
      ...(options.email ? { email: options.email } : {}),
      ...(options.token ? { token: options.token } : {}),
    },
    ...(options.authToken ? { authToken: options.authToken } : {}),
  })
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      const parsed = orderHistoryItemSchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    })
  }
  if (typeof raw === "object" && raw !== null) {
    const rec = raw as Record<string, unknown>
    for (const key of ["orders", "results", "data", "items"]) {
      if (Array.isArray(rec[key])) {
        return (rec[key] as unknown[]).flatMap((item) => {
          const parsed = orderHistoryItemSchema.safeParse(item)
          return parsed.success ? [parsed.data] : []
        })
      }
    }
  }
  return []
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
