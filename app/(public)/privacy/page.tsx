import type { Metadata } from "next"
import { LegalArticle } from "@/components/legal/legal-article"
import { company } from "@/lib/content/company"
import { privacyPolicy } from "@/lib/content/legal"
import { canonicalUrl, getSiteUrl, organizationJsonLd } from "@/lib/seo"
import { serializeJsonLd } from "@/lib/structured-data"

export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: privacyPolicy.seo.title,
    description: privacyPolicy.seo.description,
    alternates: { canonical: canonicalUrl("/privacy") },
    openGraph: {
      title: privacyPolicy.seo.title,
      description: privacyPolicy.seo.description,
      url: canonicalUrl("/privacy"),
      siteName: company.brandName,
      locale: "en_NG",
      type: "website",
    },
  }
}

export default function PrivacyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: privacyPolicy.seo.title,
            description: privacyPolicy.seo.description,
            url: canonicalUrl("/privacy"),
            dateModified: privacyPolicy.effectiveDate,
            publisher: organizationJsonLd(),
          }),
        }}
      />
      <LegalArticle document={privacyPolicy} />
    </>
  )
}
