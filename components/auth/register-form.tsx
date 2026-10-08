"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon, Mail01Icon, LockIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneField } from "@/components/ui/phone-field"
import { ApiError, apiPost, getHumanErrorMessage } from "@/lib/api/client"
import {
  AUTH_ATTENTION_COPY,
  buildRegisterRequest,
  mapAuthFieldErrors,
  registerSchema,
} from "@/lib/api/auth"
import { AuthAlert } from "./auth-form-ui"

type RegisterFormValues = z.input<typeof registerSchema>

/**
 * Registration island (spec story 1–6): email, name, phone, password with
 * write-only passwords. Re-registering an unverified email re-issues the
 * code (backend contract); a verified email answers already-exists and the
 * form alert routes to login instead.
 */
export function RegisterForm() {
  const router = useRouter()
  const [phase, setPhase] = React.useState<"idle" | "submitting">("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [loginAction, setLoginAction] = React.useState(false)
  const inFlightRef = React.useRef(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      phone_number: "",
      password: "",
      password2: "",
    },
    mode: "onTouched",
    shouldFocusError: true,
  })

  const handleSubmit = form.handleSubmit((values) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPhase("submitting")
    setFailure(null)
    setLoginAction(false)
    form.clearErrors("root")

    void (async () => {
      try {
        const parsed = registerSchema.parse(values)
        await apiPost("/api/auth/register", buildRegisterRequest(parsed), {
          sameOrigin: true,
        })
        router.push(`/verify?email=${encodeURIComponent(parsed.email)}`)
      } catch (error) {
        inFlightRef.current = false
        setPhase("idle")
        if (error instanceof ApiError) {
          const mapped = mapAuthFieldErrors(error.fieldErrors, [
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "password",
            "password2",
          ])
          for (const { field, message } of mapped.fields) {
            form.setError(
              field as keyof RegisterFormValues,
              { type: "server", message }
            )
          }
          // Verified re-registration answers already-exists — route to login
          // rather than re-showing the form as a retryable failure.
          const emailIssue = mapped.fields.find((issue) => issue.field === "email")
          if (emailIssue && /already|exists|verified/i.test(emailIssue.message)) {
            setLoginAction(true)
          }
          setFailure(
            mapped.formAlert[0] ??
              (mapped.fields.length > 0 ? AUTH_ATTENTION_COPY : getHumanErrorMessage(error))
          )
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
      aria-label="Create your account"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Create your account</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Bookings you make afterwards belong to this account.
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="First name"
          placeholder="Adaeze"
          type="text"
          autoComplete="given-name"
          startIcon={<HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />}
          error={form.formState.errors.first_name?.message}
          {...form.register("first_name")}
        />
        <Input
          label="Last name"
          placeholder="Okonkwo"
          type="text"
          autoComplete="family-name"
          startIcon={<HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />}
          error={form.formState.errors.last_name?.message}
          {...form.register("last_name")}
        />
      </div>
      <Controller
        name="phone_number"
        control={form.control}
        render={({ field }) => (
          <PhoneField
            label="Phone number"
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={form.formState.errors.phone_number?.message}
          />
        )}
      />
      <Input
        label="Password"
        placeholder="At least 8 characters"
        type="password"
        autoComplete="new-password"
        startIcon={<HugeiconsIcon icon={LockIcon} size={15} aria-hidden="true" />}
        helperText="At least 8 characters."
        error={form.formState.errors.password?.message}
        {...form.register("password")}
      />
      <Input
        label="Confirm password"
        placeholder="Repeat your password"
        type="password"
        autoComplete="new-password"
        startIcon={<HugeiconsIcon icon={LockIcon} size={15} aria-hidden="true" />}
        error={form.formState.errors.password2?.message}
        {...form.register("password2")}
      />

      {failure ? (
        <AuthAlert
          message={failure}
          action={loginAction ? { href: "/login", label: "Sign in instead" } : undefined}
        />
      ) : null}

      <Button
        type="submit"
        size="lg"
        isLoading={busy}
        disabled={busy}
        className="w-full justify-center"
      >
        <span>{busy ? "Creating your account…" : "Create account"}</span>
      </Button>
    </form>
  )
}
