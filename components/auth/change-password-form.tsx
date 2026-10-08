"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { LockIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError, apiPost, getHumanErrorMessage } from "@/lib/api/client"
import {
  buildChangePasswordRequest,
  changePasswordSchema,
  mapAuthFieldErrors,
} from "@/lib/api/auth"
import { AuthAlert } from "./auth-form-ui"

type ChangePasswordFormValues = z.input<typeof changePasswordSchema>

/**
 * Signed-in rotation (spec stories 32–34): rules stated before submit,
 * old plus new accepted write-only, and success confirms the session
 * stayed valid — the Customer is never unexpectedly signed out.
 */
export function ChangePasswordForm() {
  const router = useRouter()
  const [phase, setPhase] = React.useState<"idle" | "submitting">("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const inFlightRef = React.useRef(false)

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { old_password: "", new_password: "", confirm_password: "" },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const handleSubmit = form.handleSubmit((values) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPhase("submitting")
    setFailure(null)
    setDone(false)

    void (async () => {
      try {
        const parsed = changePasswordSchema.parse(values)
        await apiPost("/api/auth/change-password", buildChangePasswordRequest(parsed), {
          sameOrigin: true,
        })
        inFlightRef.current = false
        setPhase("idle")
        setDone(true)
        form.reset()
        router.refresh()
      } catch (error) {
        inFlightRef.current = false
        setPhase("idle")
        if (error instanceof ApiError) {
          const mapped = mapAuthFieldErrors(error.fieldErrors, [
            "old_password",
            "new_password",
            "confirm_password",
          ])
          for (const { field, message } of mapped.fields) {
            form.setError(field as keyof ChangePasswordFormValues, {
              type: "server",
              message,
            })
          }
          setFailure(mapped.formAlert[0] ?? getHumanErrorMessage(error))
        } else {
          setFailure(getHumanErrorMessage(error))
        }
      }
    })()
  })

  const busy = phase === "submitting"

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Change your password"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Change password</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your new password must be at least 8 characters and match in both
          fields. You stay signed in after the change.
        </p>
      </div>

      <Input
        label="Current password"
        placeholder="Your current password"
        type="password"
        autoComplete="current-password"
        startIcon={<HugeiconsIcon icon={LockIcon} size={15} aria-hidden="true" />}
        error={form.formState.errors.old_password?.message}
        {...form.register("old_password")}
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

      {failure ? <AuthAlert message={failure} /> : null}
      {done ? (
        <p role="status" aria-live="polite" className="text-xs font-semibold text-emerald-600">
          Password changed. You are still signed in.
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        isLoading={busy}
        disabled={busy}
        className="w-full justify-center"
      >
        <span>{busy ? "Changing…" : "Change password"}</span>
      </Button>
    </form>
  )
}
