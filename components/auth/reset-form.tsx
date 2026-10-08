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
  buildPasswordResetConfirmRequest,
  mapAuthFieldErrors,
  passwordResetConfirmSchema,
} from "@/lib/api/auth"
import { AuthAlert, AuthSuccess } from "./auth-form-ui"

type ResetFormValues = z.input<typeof passwordResetConfirmSchema>

const STALE_CODE_COPY =
  "That code did not work or has expired. Request a fresh code and try again."

/**
 * Reset-confirm island (spec stories 37–38): code plus matching new
 * password restores access; wrong or expired codes point back at a fresh
 * request instead of a blind retry.
 */
export function ResetForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [phase, setPhase] = React.useState<"idle" | "submitting">("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const inFlightRef = React.useRef(false)

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(passwordResetConfirmSchema),
    defaultValues: {
      email: initialEmail,
      code: "",
      new_password: "",
      confirm_password: "",
    },
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
        const parsed = passwordResetConfirmSchema.parse(values)
        await apiPost(
          "/api/auth/password-reset/confirm",
          buildPasswordResetConfirmRequest(parsed),
          { sameOrigin: true }
        )
        setDone(true)
      } catch (error) {
        inFlightRef.current = false
        setPhase("idle")
        if (error instanceof ApiError) {
          const mapped = mapAuthFieldErrors(error.fieldErrors, [
            "email",
            "code",
            "new_password",
          ])
          for (const { field, message } of mapped.fields) {
            form.setError(field as keyof ResetFormValues, {
              type: "server",
              message,
            })
          }
          setFailure(
            mapped.formAlert[0] ??
              (mapped.fields.length > 0 ? STALE_CODE_COPY : getHumanErrorMessage(error))
          )
        } else {
          setFailure(getHumanErrorMessage(error))
        }
      }
    })()
  })

  if (done) {
    return (
      <AuthSuccess
        heading="Password updated"
        body="Your new password is set. Sign in with it to reach your account."
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
      aria-label="Set a new password"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Set a new password</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Enter the reset code from your email, then choose a new password.
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
        error={form.formState.errors.code?.message}
        {...form.register("code")}
      />
      <Input
        label="New password"
        placeholder="At least 8 characters"
        type="password"
        autoComplete="new-password"
        startIcon={<HugeiconsIcon icon={LockIcon} size={15} aria-hidden="true" />}
        helperText="At least 8 characters."
        error={form.formState.errors.new_password?.message}
        {...form.register("new_password")}
      />
      <Input
        label="Confirm new password"
        placeholder="Repeat your new password"
        type="password"
        autoComplete="new-password"
        startIcon={<HugeiconsIcon icon={LockIcon} size={15} aria-hidden="true" />}
        error={form.formState.errors.confirm_password?.message}
        {...form.register("confirm_password")}
      />

      {failure ? (
        <AuthAlert
          message={failure === AUTH_ATTENTION_COPY ? STALE_CODE_COPY : failure}
          action={
            failure === STALE_CODE_COPY || failure === AUTH_ATTENTION_COPY
              ? { href: "/forgot", label: "Request a fresh code" }
              : undefined
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
        <span>{busy ? "Updating…" : "Set new password"}</span>
      </Button>
    </form>
  )
}
