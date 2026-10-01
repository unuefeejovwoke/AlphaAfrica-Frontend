import { proxyToBackend } from "@/lib/api/proxy"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params
  return proxyToBackend(
    request,
    `/api/packages/${encodeURIComponent(slug)}/enquire/`
  )
}
