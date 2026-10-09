import { PublicNav } from "@/components/navigation/public-nav"
import { getNavSession } from "@/lib/api/session"

/**
 * Session-aware nav slot (ticket 03). The cookie read happens here — above
 * every cached function, of which the shell has none — and travels down as
 * a boolean prop, so the shared shell stays streamable and per-session
 * content never poisons shared cache.
 */
export async function NavSession() {
  const { signedIn } = await getNavSession()
  return <PublicNav signedIn={signedIn} />
}
