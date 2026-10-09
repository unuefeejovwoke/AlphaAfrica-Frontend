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
import { AuthCard } from "./auth-shell"

type ForgotFormValues = z.input<typeof passwordResetRequestSchema>

/**
 * Reset-request island (spec stories 35–36): always answers success copy
 * once the request resolves, regardless of account existence — only a
 * transport or service failure renders an honest error.
 */
export function ForgotForm() {
  const [phase, setPhase] = React.useState<"idle" | "submitting">("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [sentTo, setSentTo] = React.useState<string | null>(null)
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

    void (async () => {
      try {
        const parsed = passwordResetRequestSchema.parse(values)
        await apiPost(
          "/api/auth/password-reset/request",
          buildPasswordResetRequestRequest(parsed.email),
          { sameOrigin: true }
        )
        // Carry the address forward: `/reset` prefills from the query, so
        // nobody retypes the email they submitted seconds ago.
        setSentTo(parsed.email)
      } catch (error) {
        inFlightRef.current = false
        setPhase("idle")
        form.clearErrors("root")
        setFailure(getHumanErrorMessage(error))
      }
    })()
  })

  if (sentTo) {
    return (
      <AuthSuccess
        heading="Check your inbox"
        body={`If an account exists for ${sentTo}, a reset code is on its way. Enter it on the next screen to set a new password.`}
        linkHref={`/reset?email=${encodeURIComponent(sentTo)}`}
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
    >
      <AuthCard
        title="Forgot your password?"
        description="Enter your account email and we will send a reset code."
      >
        <div className="flex flex-col gap-5">
          <Input
            labelSize="md"
            label="Email address"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            autoFocus
            spellCheck={false}
            startIcon={
              <HugeiconsIcon icon={Mail01Icon} size={15} aria-hidden="true" />
            }
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
        </div>
      </AuthCard>
    </form>
  )
}
