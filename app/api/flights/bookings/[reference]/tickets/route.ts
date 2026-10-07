import { proxyToBackend } from "@/lib/api/proxy"

export const dynamic = "force-dynamic"

/**
 * E-ticket numbers for a Booking. Never cached: it reports live ticketing
 * state, and a stale snapshot would claim a ticket the agency has not issued.
 */
export function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
): Promise<Response> {
  return params.then(({ reference }) =>
    proxyToBackend(
      request,
      `/api/flights/bookings/${encodeURIComponent(reference)}/tickets/`
    )
  )
}