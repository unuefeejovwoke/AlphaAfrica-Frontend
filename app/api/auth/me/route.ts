import { buildLoginTarget, buildProfileUpdateRequest } from "@/lib/api/auth"
import {
  jsonResponse,
  readSessionUser,
  sessionProxiedRequest,
} from "@/lib/api/session"

export const dynamic = "force-dynamic"

/**
 * `GET /api/auth/me` — session read with one silent refresh-and-retry.
 * 200 carries the backend user verbatim (the backend stays authoritative);
 * 401 carries a login target so the caller can route back with context
 * preserved; 503 is an honest unavailable.
 */
export async function GET(request: Request): Promise<Response> {
  const result = await readSessionUser()
  if (result.status === "signed-in") {
    return jsonResponse(result.user, 200)
  }
  if (result.status === "unavailable") {
    return jsonResponse(
      { detail: "The travel service is temporarily unavailable." },
      503
    )
  }
  const returnTo = new URL(request.url).searchParams.get("next")
  return jsonResponse({ loginTarget: buildLoginTarget(returnTo) }, 401)
}

/**
 * `PATCH /api/auth/me` — partial profile update (spec story 28–30).
 * Blank fields never travel, so an untouched phone cannot blank a stored
 * one. The backend answer passes through verbatim for `ApiError` mapping;
 * no session means 401 with a login target, never a silent drop.
 */
export async function PATCH(request: Request): Promise<Response> {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    return jsonResponse({ detail: "Invalid request." }, 400)
  }
  const record =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {}
  const body = buildProfileUpdateRequest({
    ...(typeof record.first_name === "string"
      ? { first_name: record.first_name }
      : {}),
    ...(typeof record.last_name === "string"
      ? { last_name: record.last_name }
      : {}),
    ...(typeof record.phone_number === "string"
      ? { phone_number: record.phone_number }
      : {}),
  })
  const upstream = await sessionProxiedRequest(request, "/api/auth/me/", {
    method: "PATCH",
    body,
  })
  if (!upstream) {
    return jsonResponse({ loginTarget: buildLoginTarget("/profile") }, 401)
  }
  return upstream
}
