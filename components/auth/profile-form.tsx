"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  PackageIcon,
  Tick01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneField } from "@/components/ui/phone-field"
import { ApiError, apiPatch, getHumanErrorMessage } from "@/lib/api/client"
import {
  buildProfileUpdateRequest,
  mapAuthFieldErrors,
  profileUpdateSchema,
  type AuthUser,
} from "@/lib/api/auth"
import { AuthAlert, SavedNotice } from "./auth-form-ui"
import { AuthCard } from "./auth-shell"

type ProfileFormValues = z.input<typeof profileUpdateSchema>

/**
 * Read-only account facts — email and verification never edit (spec story 29).
 * An unverified account used to read "Not verified" in a `<dl>` and stop there,
 * which is a dead end: the fix is one link away, so the link sits right here.
 */
function AccountFacts({ user }: { user: AuthUser }) {
  const joined = user.date_joined ? user.date_joined.slice(0, 10) : ""
  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-2 rounded-xl border border-border/80 bg-muted/40 p-4 text-[13px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-muted-foreground">Email</dt>
          <dd className="font-semibold break-all text-foreground">
            {user.email}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-muted-foreground">Verification</dt>
          <dd className="font-semibold text-foreground">
            {user.is_verified ? "Verified" : "Not verified"}
          </dd>
        </div>
        {joined ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="font-semibold text-muted-foreground">
              Member since
            </dt>
            <dd className="font-variant-numeric font-semibold text-foreground tabular-nums">
              {joined}
            </dd>
          </div>
        ) : null}
      </dl>

      {!user.is_verified ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <span className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={16}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <span>
              Verify your email to secure your account and receive booking
              updates.
            </span>
          </span>
          {/* Carries the email: `/verify` prefills from the query, so this must not
              send the user back to typing the address we already hold. */}
          <ButtonLink
            href={`/verify?email=${encodeURIComponent(user.email)}`}
            size="sm"
          >
            <span>Verify email</span>
          </ButtonLink>
        </div>
      ) : null}

      <ButtonLink
        href="/orders"
        variant="outline"
        size="lg"
        className="w-full justify-center"
      >
        <HugeiconsIcon icon={PackageIcon} size={17} aria-hidden="true" />
        <span>View your bookings and orders</span>
      </ButtonLink>
    </div>
  )
}

/**
 * Profile island (spec stories 27–31): read-only email state plus editable
 * name and phone under the same strictness as booking contact. Dirty edits
 * warn before the tab closes; Discard restores the account state.
 */
export function ProfileForm({ user }: { user: AuthUser }) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<"idle" | "submitting">("idle")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)
  const inFlightRef = React.useRef(false)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
    },
    mode: "onTouched",
    shouldFocusError: true,
  })
  const dirty = form.formState.isDirty

  // Unsaved edits warn before the tab closes (spec story 31). In-app
  // navigation keeps the form mounted under this page, so the draft — and
  // the Discard path below — survives it.
  React.useEffect(() => {
    if (!dirty) return
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", guard)
    return () => window.removeEventListener("beforeunload", guard)
  }, [dirty])

  const handleSubmit = form.handleSubmit((values) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setPhase("submitting")
    setFailure(null)
    setSaved(false)

    void (async () => {
      try {
        const parsed = profileUpdateSchema.parse(values)
        await apiPatch<{ user: unknown }, Record<string, string>>(
          "/api/auth/me",
          buildProfileUpdateRequest(parsed),
          { sameOrigin: true }
        )
        inFlightRef.current = false
        setPhase("idle")
        setSaved(true)
        form.reset(parsed, { keepDirty: false })
        // Server owns the user — refresh reads (nav, pre-fill) before rest.
        router.refresh()
      } catch (error) {
        inFlightRef.current = false
        setPhase("idle")
        if (error instanceof ApiError) {
          const mapped = mapAuthFieldErrors(error.fieldErrors, [
            "first_name",
            "last_name",
            "phone_number",
          ])
          for (const { field, message } of mapped.fields) {
            form.setError(field as keyof ProfileFormValues, {
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
    <form noValidate onSubmit={handleSubmit} aria-label="Your profile">
      <AuthCard
        headingAs="h2"
        title="Your profile"
        description="Name and phone pre-fill checkout. Email stays as registered."
      >
        <div className="flex flex-col gap-5">
          <AccountFacts user={user} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              labelSize="md"
              label="First name"
              placeholder="Adaeze"
              autoComplete="given-name"
              startIcon={
                <HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />
              }
              error={form.formState.errors.first_name?.message}
              {...form.register("first_name")}
            />
            <Input
              labelSize="md"
              label="Last name"
              placeholder="Okonkwo"
              autoComplete="family-name"
              startIcon={
                <HugeiconsIcon icon={UserIcon} size={15} aria-hidden="true" />
              }
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
                placeholder="803 123 4567"
                error={form.formState.errors.phone_number?.message}
              />
            )}
          />
          {failure ? <AuthAlert message={failure} /> : null}
          {saved && !dirty ? (
            <SavedNotice>
              Profile updated. Checkout will pre-fill the new details.
            </SavedNotice>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              isLoading={busy}
              disabled={busy}
              className="flex-1 justify-center"
            >
              <span>{busy ? "Saving…" : "Save changes"}</span>
            </Button>
            {dirty && !busy ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  form.reset()
                  setFailure(null)
                  setSaved(false)
                }}
                className="justify-center"
              >
                <span>Discard</span>
              </Button>
            ) : null}
          </div>
        </div>
      </AuthCard>
    </form>
  )
}
