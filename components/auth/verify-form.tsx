"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon, LockIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError, apiPost, getHumanErrorMessage } from "@/lib/api/client"
import {
  AUTH_ATTENTION_COPY,
  buildVerifyConfirmRequest,
  buildVerifyRequestRequest,
  mapAuthFieldErrors,
  verifyConfirmSchema,
} from "@/lib/api/auth"
import { AuthAlert, AuthSuccess } from "./auth-form-ui"

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
  const [resend, setResend] = React.useState<"idle" | "sending" | "cooling">("idle")
  const [resendMessage, setResendMessage] = React.useState<string | null>(null)
  const inFlightRef = React.useRef(false)

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifyConfirmSchema),
    defaultValues: { email: initialEmail, code: "" },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const handleSubmit = form.handleSubmit((values) => {
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
          const mapped = mapAuthFieldErrors(error.fieldErrors, ["email", "code"])
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
              (mapped.fields.length > 0 ? WRONG_CODE_COPY : getHumanErrorMessage(error))
          )
        } else {
          setFailure(getHumanErrorMessage(error))
        }
      }
    })()
  })

  const handleResend = async () => {
    const email = form.getValues("email")
    if (!email || resend !== "idle") return
    setResend("sending")
    setResendMessage(null)
    try {
      await apiPost("/api/auth/verify/request", buildVerifyRequestRequest(email), {
        sameOrigin: true,
      })
      // Rate-aware resend (spec story 10): one fresh code per 30s window —
      // rapid taps cool down instead of tripping backend abuse limits.
      setResend("cooling")
      setResendMessage("A fresh code is on its way. Check your inbox.")
      window.setTimeout(() => setResend("idle"), RESEND_COOLDOWN_MS)
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
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Verify your email"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Check your inbox</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Enter the 6-digit code from your verification email. Clicked the
          button in the email instead? You are verified — sign in.
        </p>
      </div>

      <Input
        label="Email address"
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        spellCheck={false}
        startIcon={<HugeiconsIcon icon={Mail01Icon} size={15} aria-hidden="true" />}
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />
      <Input
        label="6-digit code"
        placeholder="123456"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        spellCheck={false}
        startIcon={<HugeiconsIcon icon={LockIcon} size={15} aria-hidden="true" />}
        helperText="Paste from your email or type the digits."
        error={form.formState.errors.code?.message}
        {...form.register("code")}
      />

      {failure ? (
        <AuthAlert
          message={failure === AUTH_ATTENTION_COPY ? WRONG_CODE_COPY : failure}
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

      <div className="flex flex-col gap-1.5 border-t border-border/60 pt-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
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
          <span>
            {resend === "sending"
              ? "Sending…"
              : resend === "cooling"
                ? "Fresh code sent — wait before resending"
                : "Resend code"}
          </span>
        </Button>
        {resendMessage ? (
          <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
            {resendMessage}
          </p>
        ) : null}
      </div>
    </form>
  )
}
