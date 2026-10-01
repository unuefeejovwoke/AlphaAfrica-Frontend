import type { Metadata } from "next"
import { LegalArticle } from "@/components/legal/legal-article"
import { company } from "@/lib/content/company"
import { termsConditions } from "@/lib/content/legal"
import { canonicalUrl, getSiteUrl, organizationJsonLd } from "@/lib/seo"
import { serializeJsonLd } from "@/lib/structured-data"

export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: termsConditions.seo.title,
    description: termsConditions.seo.description,
    alternates: { canonical: canonicalUrl("/terms") },
    openGraph: {
      title: termsConditions.seo.title,
      description: termsConditions.seo.description,
      url: canonicalUrl("/terms"),
      siteName: company.brandName,
      locale: "en_NG",
      type: "website",
    },
  }
}

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: termsConditions.seo.title,
            description: termsConditions.seo.description,
            url: canonicalUrl("/terms"),
            dateModified: termsConditions.effectiveDate,
            publisher: organizationJsonLd(),
          }),
        }}
      />
      <LegalArticle document={termsConditions} />
    </>
  )
}
