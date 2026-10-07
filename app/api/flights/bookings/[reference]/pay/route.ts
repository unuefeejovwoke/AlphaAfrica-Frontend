import { proxyToBackend } from "@/lib/api/proxy"

export const dynamic = "force-dynamic"

/**
 * Pay-later for a Reservation. The guest secure token travels in the request
 * body and query and is forwarded untouched so the backend enforces its own
 * 403 on an invalid or expired link.
 */
export function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
): Promise<Response> {
  return params.then(({ reference }) =>
    proxyToBackend(
      request,
      `/api/flights/bookings/${encodeURIComponent(reference)}/pay/`
    )
  )
}