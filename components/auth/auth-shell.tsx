import * as React from "react"

/**
 * One shell for every unauthenticated surface (login, register, forgot,
 * reset, verify): a single centered column. Wider than the old 440px form
 * column so two-up fields (first/last name) breathe on desktop.
 */
export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode
  /** Cross-link under the card — "No account? Register". */
  footer?: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex w-full flex-col gap-4">
        {children}
        {footer ? <div className="flex flex-col gap-4">{footer}</div> : null}
      </div>
    </div>
  )
}

/**
 * The form card. Six forms used to repeat this class string verbatim;
 * `AuthShell` now owns the page grid and this owns the card.
 */
export function AuthCard({
  title,
  description,
  children,
  headingAs: Heading = "h1",
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  /** `h1` on a standalone page, `h2` when the card sits under another `h1`. */
  headingAs?: "h1" | "h2"
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1">
        <Heading className="text-lg font-extrabold tracking-tight text-foreground">
          {title}
        </Heading>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

/**
 * Progress through a multi-step journey. No persisted state and no route
 * prefetching: the server always decides the real step.
 *
 * Deliberately static CSS rather than a `layoutId` rail — each step is a
 * separate document load, so there is no continuous transition for Motion to
 * interpolate across. Animating it would buy a client boundary to move three
 * divs that were already correct.
 *
 * `steps` is a prop because the journeys differ: registering walks account →
 * verify → sign in, while recovering a password walks request code → set a new
 * password. Reusing the registration labels on `/reset` would tell someone
 * resetting their password that they still had to verify an email.
 */
export function AuthStepper({
  current,
  steps = ["Account", "Verify email", "Sign in"],
}: {
  current: 1 | 2 | 3
  steps?: readonly string[]
}) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((step, index) => {
        const position = (index + 1) as 1 | 2 | 3
        return (
          <li key={step} className="flex flex-1 flex-col gap-1.5">
            <span
              aria-hidden="true"
              className={
                position <= current
                  ? "h-1 w-full rounded-full bg-primary"
                  : "h-1 w-full rounded-full bg-border"
              }
            />
            <span
              className={
                position === current
                  ? "text-[11px] font-bold tracking-wider text-foreground uppercase"
                  : "text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
              }
            >
              <span className="sr-only">
                Step {position} of {steps.length}:{" "}
              </span>
              {step}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
