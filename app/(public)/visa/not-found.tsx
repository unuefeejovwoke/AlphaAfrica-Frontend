import Link from "next/link";
import { Button } from "@/components/ui/button";

/** 404 for unknown `/visa/*` routes — points back with a support hatch. */
export default function VisaNotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">Visa assistance</p>
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        We couldn&apos;t find that visa country.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
        It may have been renamed or removed. Browse the supported countries — or
        ask a specialist about the destination you have in mind.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href="/visa" />}>
          <span>Browse visa countries</span>
        </Button>
        <Button render={<Link href="/contact" />} variant="outline">
          <span>Talk to Alphaa</span>
        </Button>
      </div>
    </div>
  );
}
