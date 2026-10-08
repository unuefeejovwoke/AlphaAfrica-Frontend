"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiPost, getHumanErrorMessage } from "@/lib/api/client"
import {
  buildPasswordResetRequestRequest,
  passwordResetRequestSchema,
} from "@/lib/api/auth"
import { AuthAlert, AuthSuccess } from "./auth-form-ui"

type ForgotFormValues = z.input<typeof passwordResetRequestSchema>

/**
 * Reset-request island (spec stories 35–36): always answers success copy
 * once the request resolves, regardless of account existence — only a
 * transport or service failure renders an honest error.
 */
export function ForgotForm() {
  const [phase, setPhase] = React.useState<"idle" | "submitting">("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)
  const inFlightRef = React.useRef(false)

  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: "" },
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
        const parsed = passwordResetRequestSchema.parse(values)
        await apiPost(
          "/api/auth/password-reset/request",
          buildPasswordResetRequestRequest(parsed.email),
          { sameOrigin: true }
        )
        setSent(true)
      } catch (error) {
        inFlightRef.current = false
        setPhase("idle")
        setFailure(getHumanErrorMessage(error))
      }
    })()
  })

  if (sent) {
    return (
      <AuthSuccess
        heading="Check your inbox"
        body="If an account exists for that email, a reset code is on its way. Enter it on the next screen to set a new password."
        linkHref="/reset"
        linkLabel="Enter your reset code"
      />
    )
  }

  const busy = phase === "submitting"

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Request a password reset"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Forgot your password?</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Enter your account email and we will send a reset code.
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

      {failure ? <AuthAlert message={failure} /> : null}

      <Button
        type="submit"
        size="lg"
        isLoading={busy}
        disabled={busy}
        className="w-full justify-center"
      >
        <span>{busy ? "Sending…" : "Send reset code"}</span>
      </Button>
    </form>
  )
}
