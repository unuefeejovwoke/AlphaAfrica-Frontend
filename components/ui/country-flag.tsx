import * as React from "react"
import { cn } from "@/lib/utils"

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 code, e.g. "NG". */
  code: string
  className?: string
}

/**
 * Real flag imagery via the flagcdn service (1px–320px PNGs).
 * Emoji flags were dropped deliberately: Windows — where most guests book —
 * renders regional-indicator pairs as bare "NG" letters instead of flags.
 * Decorative by design (the country name is always adjacent text).
 */
export function CountryFlag({ code, className }: CountryFlagProps) {
  const normalized = code.trim().toLowerCase()
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => {
    setFailed(false)
  }, [normalized])
  if (!/^[a-z]{2}$/.test(normalized) || failed) return null
  return (
    <img
      src={`https://flagcdn.com/w80/${normalized}.png`}
      srcSet={`https://flagcdn.com/w160/${normalized}.png 2x`}
      width={20}
      height={15}
      alt=""
      aria-hidden="true"
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn(
        "h-[15px] w-5 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10",
        className
      )}
    />
  )
}
