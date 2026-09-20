import Link from "next/link";

export default function CheckoutPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 text-center">
        <span className="mx-auto w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Step 1 of 3 · Traveller Details
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
          Secure Guest Booking Checkout
        </h1>
        <p className="min-w-0 text-sm leading-relaxed break-words text-muted-foreground">
          Complete your reservation without creating an account. Your payment stays
          protected by 256-bit encryption, and our Abuja specialists remain one call
          away if you need assistance…
        </p>
        <p className="text-xs text-muted-foreground">
          Booking Ref:{" "}
          <span className="font-variant-numeric font-semibold tabular-nums text-foreground">
            AAA-000000
          </span>
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Return to homepage
          </Link>
        </div>
      </div>
    </section>
  );
}
