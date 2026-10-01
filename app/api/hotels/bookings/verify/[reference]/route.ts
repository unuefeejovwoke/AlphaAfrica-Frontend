import { proxyToBackend } from "@/lib/api/proxy"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
): Promise<Response> {
  const { reference } = await params
  return proxyToBackend(
    request,
    `/api/hotels/bookings/verify/${encodeURIComponent(reference)}/`
  )
}
