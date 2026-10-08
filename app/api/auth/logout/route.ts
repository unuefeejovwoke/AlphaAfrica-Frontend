import { clearSessionCookies, jsonResponse } from "@/lib/api/session"

export const dynamic = "force-dynamic"

/** `POST /api/auth/logout` — clears the session everywhere it is read. */
export async function POST(): Promise<Response> {
  await clearSessionCookies()
  return jsonResponse({ ok: true }, 200)
}
