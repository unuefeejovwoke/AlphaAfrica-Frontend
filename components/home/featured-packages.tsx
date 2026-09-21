import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, ArrowRight01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { FeaturedEmpty, FeaturedError } from "@/components/home/featured-state";
import { getFeaturedPackages } from "@/lib/api/packages";
import { formatNaira } from "@/lib/format";

/**
 * Live featured packages (async RSC, streamed inside Suspense).
 * Shows title, destination, duration, from-price, and key inclusions;
 * covers empty and error+retry (§12).
 */
export async function FeaturedPackages() {
  let packages;
  try {
    packages = await getFeaturedPackages(3);
  } catch (error) {
    return <FeaturedError title="We couldn't load featured packages." whatsappContext="holiday packages" error={error} />;
  }

  if (packages.length === 0) {
    return (
      <FeaturedEmpty
        whatsappContext="holiday packages"
        description="New curated itineraries land regularly. Describe your ideal trip and a specialist will design it with you — no payment needed to start."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <Link
          key={pkg.slug}
          href={`/packages/${pkg.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/50"
        >
          {/* Plain img: backend media host varies by env, so next/image remotePatterns cannot cover it. */}
          <img
            src={pkg.main_image}
            alt={`${pkg.title} — ${pkg.destination_name}`}
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="flex flex-1 flex-col gap-2 p-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {pkg.destination_name}
            </span>
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {pkg.title}
            </h3>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <HugeiconsIcon icon={Calendar01Icon} size={14} className="text-primary" aria-hidden="true" />
              {pkg.duration_days} {pkg.duration_days === 1 ? "day" : "days"} · From{" "}
              <span className="font-semibold text-foreground">{formatNaira(pkg.price)}</span> per person
            </p>
            {pkg.inclusions_list.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1">
                {pkg.inclusions_list.slice(0, 3).map((inclusion) => (
                  <li key={inclusion} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={Tick01Icon} size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="line-clamp-1">{inclusion}</span>
                  </li>
                ))}
              </ul>
            )}
            <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-semibold text-primary">
              <span>View package</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
