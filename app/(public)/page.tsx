import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="max-w-3xl flex flex-col gap-6">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary w-fit">
          Alphaa Africa Platform • Phase 1
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
          Wherever you&apos;re going, we&apos;ve got the journey covered.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Abuja&apos;s premium travel concierge. Book flights, hotels, and vehicle rentals with verified ease, or speak with our human travel specialists for tailor-made holiday packages and visa guidance.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Button render={<Link href="/flights" />} size="lg">
            Search Flights
          </Button>
          <Button render={<Link href="/packages" />} variant="outline" size="lg">
            Explore Holiday Packages
          </Button>
        </div>
      </div>
    </section>
  );
}
