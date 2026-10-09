"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon } from "@hugeicons/core-free-icons"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OtpInput } from "@/components/ui/otp-input"
import { ApiError, apiPost, getHumanErrorMessage } from "@/lib/api/client"
import {
  AUTH_ATTENTION_COPY,
  buildVerifyConfirmRequest,
  buildVerifyRequestRequest,
  mapAuthFieldErrors,
  verifyConfirmSchema,
} from "@/lib/api/auth"
import { AuthAlert, AuthSuccess } from "./auth-form-ui"
import { AuthCard, AuthStepper } from "./auth-shell"

type VerifyFormValues = z.input<typeof verifyConfirmSchema>

const WRONG_CODE_COPY =
  "That code did not work. Check the latest email and try again, or request a fresh code below."

/** One fresh code per window — rapid taps cool down, never hammer resend. */
const RESEND_COOLDOWN_MS = 30_000

/**
 * OTP verification island (spec stories 7–12): 6-digit entry with free
 * paste and numeric input, rate-aware resend, and an idempotent success
 * state — an already-verified account reads as verified, never as broken.
 */
export function VerifyForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [phase, setPhase] = React.useState<"idle" | "submitting">("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [verified, setVerified] = React.useState(false)
  const [resend, setResend] = React.useState<"idle" | "sending" | "cooling">(
    "idle"
  )
  const [resendMessage, setResendMessage] = React.useState<string | null>(null)
  // Seconds left on the resend window. A bare "wait" with no number tells
  // the user nothing about when they are allowed to act again.
  const [cooldown, setCooldown] = React.useState(0)
  const inFlightRef = React.useRef(false)

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifyConfirmSchema),
    defaultValues: { email: initialEmail, code: "" },
    mode: "onTouched",
    shouldFocusError: true,
  })

  // Named so the OTP box's auto-submit at six digits can reuse it — an
  // inline `handleSubmit(() => undefined)` would validate and then submit
  // nothing at all.
  const submitCode = (values: VerifyFormValues) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPhase("submitting")
    setFailure(null)
    form.clearErrors("root")

    void (async () => {
      try {
        const parsed = verifyConfirmSchema.parse(values)
        await apiPost(
          "/api/auth/verify/confirm",
          buildVerifyConfirmRequest(parsed),
          { sameOrigin: true }
        )
        setVerified(true)
      } catch (error) {
        inFlightRef.current = false
        setPhase("idle")
        if (error instanceof ApiError) {
          const mapped = mapAuthFieldErrors(error.fieldErrors, [
            "email",
            "code",
          ])
          const serverCopy = [
            error.message,
            ...mapped.formAlert,
            ...mapped.fields.map((issue) => issue.message),
          ].join(" ")
          if (/already verified/i.test(serverCopy)) {
            // Repeat confirmation of a verified account is harmless — the
            // magic link and OTP channels converge on the same outcome,
            // whether the backend answers in `detail` or field errors.
            setVerified(true)
            return
          }
          for (const { field, message } of mapped.fields) {
            form.setError(field as keyof VerifyFormValues, {
              type: "server",
              message,
            })
          }
          setFailure(
            mapped.formAlert[0] ??
              (mapped.fields.length > 0
                ? WRONG_CODE_COPY
                : getHumanErrorMessage(error))
          )
        } else {
          setFailure(getHumanErrorMessage(error))
        }
      }
    })()
  }

  const handleSubmit = form.handleSubmit(submitCode)

  // Countdown decrements in the interval callback, never inside a
  // `setCooldown` updater — updaters must stay pure, and StrictMode
  // double-invokes them.
  React.useEffect(() => {
    if (resend !== "cooling") return
    const tick = window.setInterval(() => {
      setCooldown((seconds) => {
        const next = Math.max(0, seconds - 1)
        if (next === 0) {
          window.clearInterval(tick)
          setResend("idle")
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(tick)
  }, [resend])

  const handleResend = async () => {
    const email = form.getValues("email")
    if (!email || resend !== "idle") return
    setResend("sending")
    setResendMessage(null)
    try {
      await apiPost(
        "/api/auth/verify/request",
        buildVerifyRequestRequest(email),
        {
          sameOrigin: true,
        }
      )
      // Rate-aware resend (spec story 10): one fresh code per 30s window —
      // rapid taps cool down instead of tripping backend abuse limits.
      setCooldown(RESEND_COOLDOWN_MS / 1000)
      setResend("cooling")
      setResendMessage("A fresh code is on its way. Check your inbox.")
    } catch (error) {
      setResend("idle")
      setResendMessage(getHumanErrorMessage(error))
    }
  }

  if (verified) {
    return (
      <AuthSuccess
        heading="Email verified"
        body="Your account is verified. Sign in to reach your bookings and profile."
        linkHref="/login"
        linkLabel="Sign in"
      />
    )
  }

  const busy = phase === "submitting"

  return (
    <form noValidate onSubmit={handleSubmit} aria-label="Verify your email">
      <div className="flex flex-col gap-4">
        <AuthStepper current={2} />
        <AuthCard
          title="Check your inbox"
          description="Enter the 6-digit code from your verification email."
        >
          <div className="flex flex-col gap-5">
            <Input
              labelSize="md"
              label="Email address"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              spellCheck={false}
              startIcon={
                <HugeiconsIcon icon={Mail01Icon} size={15} aria-hidden="true" />
              }
              error={form.formState.errors.email?.message}
              {...form.register("email")}
            />
            <OtpInput
              label="Verification code"
              autoFocus
              value={form.watch("code")}
              onValueChange={(value) => form.setValue("code", value)}
              onComplete={() => form.handleSubmit(submitCode)}
              helperText="Paste from your email or type the digits."
              error={form.formState.errors.code?.message}
            />

            {failure ? (
              <AuthAlert
                message={
                  failure === AUTH_ATTENTION_COPY ? WRONG_CODE_COPY : failure
                }
              />
            ) : null}

            <Button
              type="submit"
              size="lg"
              isLoading={busy}
              disabled={busy}
              className="w-full justify-center"
            >
              <span>{busy ? "Verifying…" : "Verify email"}</span>
            </Button>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                No code yet, or it expired? Request a fresh one.
              </p>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void handleResend()}
                disabled={resend !== "idle"}
                isLoading={resend === "sending"}
                className="w-full justify-center"
              >
                {/*
                  The countdown lives OUTSIDE the button: a disabled button is
                  not reliably announced, so a screen-reader user would hear
                  "Resend code" forever with no sign the wait is progressing.
                */}
                <span aria-live="polite" aria-atomic="true">
                  {resend === "sending"
                    ? "Sending…"
                    : resend === "cooling"
                      ? `Resend available in ${cooldown}s`
                      : "Resend code"}
                </span>
              </Button>
              {resendMessage ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="text-[13px] text-muted-foreground"
                >
                  {resendMessage}
                </p>
              ) : null}
            </div>
          </div>
        </AuthCard>

        {/* The backend also sends a magic link, so a user who clicked it is
            already verified. That used to be a sentence in the description
            telling them to sign in, with the sign-in link nowhere near it. */}
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/80 bg-muted/40 p-4 text-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Clicked the button in the email instead? That verifies your account
            on its own.
          </p>
          <ButtonLink href="/login" variant="link" size="sm">
            <span>Sign in instead</span>
          </ButtonLink>
        </div>
      </div>
    </form>
  )
}
