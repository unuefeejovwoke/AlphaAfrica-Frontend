"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mail01Icon, LockIcon } from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError, apiPost, getHumanErrorMessage } from "@/lib/api/client"
import {
  buildLoginRequest,
  loginSchema,
  mapAuthFieldErrors,
  needsEmailVerification,
  normalizeAuthUser,
} from "@/lib/api/auth"
import { AuthAlert } from "./auth-form-ui"

type LoginFormValues = z.input<typeof loginSchema>

/**
 * Wrong credentials never reveal whether the email exists — one fixed
 * sentence covers unknown email, wrong password, and unverified alike
 * (spec story 16). An unverified account routes to verification instead.
 */
const NON_REVEALING_COPY =
  "That email and password did not match our records. Check both and try again."

/**
 * Sign-in island (spec stories 15–19): email plus password establishes the
 * server-owned session; success returns to the preserved target.
 */
export function LoginForm({ next = "" }: { next?: string }) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<"idle" | "submitting">("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const inFlightRef = React.useRef(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
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
        const parsed = loginSchema.parse(values)
        const result = await apiPost<
          { user: unknown },
          { email: string; password: string }
        >("/api/auth/login", buildLoginRequest(parsed), { sameOrigin: true })
        const user = normalizeAuthUser(result.user)
        // Cookie session is set — refresh server reads (nav) before routing.
        router.refresh()
        if (needsEmailVerification(user)) {
          router.push(`/verify?email=${encodeURIComponent(parsed.email)}`)
        } else if (next) {
          router.push(next)
        } else {
          router.push("/")
        }
      } catch (error) {
        inFlightRef.current = false
        setPhase("idle")
        if (error instanceof ApiError) {
          const mapped = mapAuthFieldErrors(error.fieldErrors, [
            "email",
            "password",
          ])
          for (const { field, message } of mapped.fields) {
            form.setError(field as keyof LoginFormValues, {
              type: "server",
              message,
            })
          }
          // 401/400 without field detail stays non-revealing; anything with
          // backend order detail maps inline and the alert stays generic.
          setFailure(
            error.status === 401 || error.status === 400
              ? NON_REVEALING_COPY
              : (mapped.formAlert[0] ?? getHumanErrorMessage(error))
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
      aria-label="Sign in to your account"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-foreground">Welcome back</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Sign in to reach your bookings and profile.
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
        label="Password"
        placeholder="Your password"
        type="password"
        autoComplete="current-password"
        startIcon={<HugeiconsIcon icon={LockIcon} size={15} aria-hidden="true" />}
        error={form.formState.errors.password?.message}
        {...form.register("password")}
      />

      {failure ? (
        <AuthAlert
          message={failure}
          action={
            failure === NON_REVEALING_COPY
              ? { href: "/forgot", label: "Forgot your password?" }
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
        <span>{busy ? "Signing in…" : "Sign in"}</span>
      </Button>
    </form>
  )
}
