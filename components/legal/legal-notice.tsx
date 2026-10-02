import Link from "next/link"

/**
 * Clickwrap notice for every surface that collects personal data or takes
 * money — the guest booking form, the flight pay bar, the paid visa
 * consultation, and the package enquiry.
 *
 * `lib/content/legal.ts` §2 promises each product's rules are "disclosed again
 * before you pay"; this component is that disclosure. Footer links alone are
 * weak notice on a long single-column form where the CTA is the only thing the
 * guest looks at. One component so the sentence cannot drift between surfaces.
 *
 * Passive by design — no checkbox, no submit gating. See `LegalArticle` for the
 * full documents and the cross-links between them.
 */
export function LegalNotice({ className }: { className?: string }) {
  const link =
    "font-medium text-foreground underline underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"

  return (
    <p
      className={
        className ??
        "text-center text-[11px] leading-relaxed text-muted-foreground"
      }
    >
      By continuing you agree to our{" "}
      <Link href="/terms" className={link}>
        Terms &amp; Conditions
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className={link}>
        Privacy Policy
      </Link>
      .
    </p>
  )
}