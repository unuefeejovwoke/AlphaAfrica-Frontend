import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"

/**
 * Shared Open Graph card renderer (`next/og` ImageResponse, 1200×630).
 *
 * Two variants, one brand:
 * - Photo card (detail pages): dark left panel with logo/kicker/title/
 *   subtitle, entity photo covering the right half.
 * - Brand card (landings, fallback): the same text block on a generated
 *   surface — a dark base with two brand-orange radial washes, drawn
 *   entirely in CSS so no background raster ships or loads.
 *
 * Satori-safe by construction: inline styles only, no line-clamp (titles are
 * sliced), no webfonts (verified rendering via dev preview). The only raster
 * read is the logo, cached per process; every consumer try/catches and falls
 * back to the brand card, so an OG route can never 500.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = "image/png"

/** Brand surface. `--background` dark, `--primary` orange, from globals.css. */
const BRAND_BASE = "#171217"
const BRAND_ACCENT_RGB = "255,103,56"
const BRAND_SURFACE = [
  `radial-gradient(900px 520px at 84% -10%, rgba(${BRAND_ACCENT_RGB},0.30), transparent 70%)`,
  `radial-gradient(1100px 700px at 6% 110%, rgba(${BRAND_ACCENT_RGB},0.10), transparent 68%)`,
  `linear-gradient(158deg, #241a24 0%, ${BRAND_BASE} 58%, #120e13 100%)`,
].join(", ")

let logoPromise: Promise<string | null> | null = null

/** Brand logo as a data URL (cached; null when unreadable). */
function loadOgLogo(): Promise<string | null> {
  if (!logoPromise) {
    logoPromise = (async () => {
      try {
        // Scoped under `public/` (literal segment) so Turbopack traces only
        // the logo instead of the whole project.
        const buffer = await readFile(
          path.join(process.cwd(), "public", "logo.png")
        )
        return `data:image/png;base64,${buffer.toString("base64")}`
      } catch {
        return null
      }
    })()
  }
  return logoPromise
}

async function photoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get("content-type") ?? ""
    if (!type.startsWith("image/")) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length === 0 || buffer.length > 4_000_000) return null
    // Satori decodes PNG/JPEG/GIF only — webp (incl. mislabeled) breaks the
    // render pipeline, so sniff magic bytes and reject anything else.
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8
    const isGif = buffer[0] === 0x47 && buffer[1] === 0x49
    if (!isPng && !isJpeg && !isGif) return null
    const mime = isPng ? "image/png" : isJpeg ? "image/jpeg" : "image/gif"
    return `data:${mime};base64,${buffer.toString("base64")}`
  } catch {
    return null
  }
}

export interface OgCardInput {
  kicker: string
  title: string
  subtitle?: string
  /** Absolute http(s) entity photo URL — relative paths are ignored. */
  photoUrl?: string
}

function slice(text: string, max: number): string {
  // `next/og`'s bundled font has no U+20A6 NAIRA SIGN: satori tries to fetch a
  // dynamic fallback, the request 400s, and the glyph renders as a tofu box
  // ("☒11,000/hr"). Spell the code instead — unambiguous in a feed, and it
  // keeps card rendering free of a network round-trip.
  const clean = text.replace(/₦\s*/g, "NGN ").replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean
}

function TextBlock({
  kicker,
  title,
  subtitle,
}: {
  kicker: string
  title: string
  subtitle?: string
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "#ff6738",
          color: "#ffffff",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          padding: "10px 22px",
          borderRadius: 999,
        }}
      >
        {slice(kicker, 40)}
      </div>
      <div
        style={{
          fontSize: 68,
          fontWeight: 800,
          lineHeight: 1.08,
          color: "#ffffff",
          maxHeight: 300,
          overflow: "hidden",
        }}
      >
        {slice(title, 90)}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 30, color: "rgba(255,255,255,0.82)" }}>
          {slice(subtitle, 110)}
        </div>
      ) : null}
    </div>
  )
}

function BrandRow({ logo }: { logo: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          width={56}
          height={56}
          style={{ borderRadius: 14 }}
        />
      ) : null}
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 4,
          color: "#ffffff",
        }}
      >
        ALPHAA AFRICA
      </div>
    </div>
  )
}

/**
 * Render a 1200×630 share card. Photo variant when `photoUrl` resolves,
 * generated brand surface otherwise. Never throws — callers still wrap in
 * try/catch and fall back to `brandOgCard` for defence in depth.
 */
export async function ogCardImage(input: OgCardInput): Promise<ImageResponse> {
  const [logo, photo] = await Promise.all([
    loadOgLogo(),
    input.photoUrl?.startsWith("http") ? photoDataUrl(input.photoUrl) : null,
  ])
  const text = (
    <TextBlock
      kicker={input.kicker}
      title={input.title}
      subtitle={input.subtitle}
    />
  )

  if (photo) {
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: BRAND_BASE,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 660,
            padding: 64,
          }}
        >
          <BrandRow logo={logo} />
          {text}
          <div style={{ fontSize: 24, color: "rgba(255,255,255,0.6)" }}>
            alphaaafrica.com
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          width={540}
          height={630}
          style={{ objectFit: "cover" }}
        />
      </div>,
      { ...OG_SIZE }
    )
  }

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 64,
        background: BRAND_SURFACE,
      }}
    >
      <BrandRow logo={logo} />
      {text}
    </div>,
    { ...OG_SIZE }
  )
}

/** Static-text brand card (landings, root, and every error fallback). */
export function brandOgCard(input: Omit<OgCardInput, "photoUrl">) {
  return ogCardImage(input)
}
