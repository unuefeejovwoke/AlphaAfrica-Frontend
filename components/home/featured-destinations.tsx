import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { FeaturedEmpty, FeaturedError } from "@/components/home/featured-state";
import { getFeaturedDestinations } from "@/lib/api/destinations";
import { formatNaira } from "@/lib/format";

/**
 * Live featured destinations (async RSC, streamed inside Suspense).
 * Shows destination, country, package count, starting price, and CTA;
 * covers loading (skeleton fallback in parent), empty, and error+retry (§12).
 */
export async function FeaturedDestinations() {
  let destinations;
  try {
    destinations = await getFeaturedDestinations(3);
  } catch (error) {
    return <FeaturedError title="We couldn't load featured destinations." whatsappContext="destination planning" error={error} />;
  }

  if (destinations.length === 0) {
    return (
      <FeaturedEmpty
        whatsappContext="destination planning"
        description="New destinations land regularly. Tell us where you want to go and a specialist will plan it with you."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {destinations.map((destination) => (
        <Link
          key={destination.slug}
          href={`/destinations/${destination.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50"
        >
          {/* Plain img: backend media host varies by env, so next/image remotePatterns cannot cover it. */}
          <img
            src={destination.main_image}
            alt={`${destination.name}, ${destination.country}`}
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="flex flex-1 flex-col gap-2 p-5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <HugeiconsIcon icon={Location01Icon} size={14} className="text-primary" aria-hidden="true" />
              {destination.country}
            </span>
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {destination.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              {destination.package_count} {destination.package_count === 1 ? "package" : "packages"} · From{" "}
              <span className="font-semibold text-foreground">{formatNaira(destination.starting_price)}</span>
            </p>
            <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-primary">
              <span>Explore destination</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
