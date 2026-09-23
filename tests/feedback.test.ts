import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { getLoadingPreset } from "../lib/feedback-presets.ts"
import { getErrorPreset } from "../lib/feedback-presets.ts"

test("LoadingState provides travel-aware explanatory presets", () => {
  const flightPreset = getLoadingPreset("flights")
  assert.match(flightPreset.title, /flights/i)
  assert.match(flightPreset.description, /airline/i)

  const hotelPreset = getLoadingPreset("hotels")
  assert.match(hotelPreset.title, /hotel/i)

  const pricePreset = getLoadingPreset("price")
  assert.match(pricePreset.title, /fare|price/i)

  const paymentPreset = getLoadingPreset("payment")
  assert.match(paymentPreset.title, /payment/i)
  assert.match(paymentPreset.description, /paystack|do not refresh/i)
  assert.ok(
    paymentPreset.description.endsWith("…"),
    "Loading copy must end with ellipsis character per guidelines"
  )
})

test("ErrorState enforces PRD rule with diagnosis and WhatsApp fallback", () => {
  const timeoutError = getErrorPreset("timeout")
  assert.notStrictEqual(timeoutError.title, "Something went wrong")
  assert.ok(
    timeoutError.description.length > 10,
    "Must provide actionable diagnosis"
  )
  assert.match(timeoutError.whatsappText, /assistance/i)

  const paymentError = getErrorPreset("payment-failed")
  assert.notStrictEqual(paymentError.title, "Something went wrong")
  assert.ok(paymentError.description.length > 10)
})

test("LoadingState component is accessible with live region and reduced-motion support", () => {
  const loadingPath = path.resolve(
    process.cwd(),
    "components/feedback/loading-state.tsx"
  )
  assert.ok(fs.existsSync(loadingPath), "loading-state.tsx must exist")
  const content = fs.readFileSync(loadingPath, "utf-8")

  assert.match(content, /role="status"/, "LoadingState must expose role=status")
  assert.match(
    content,
    /aria-live="polite"/,
    "Async loading must announce via aria-live"
  )
  assert.match(
    content,
    /aria-hidden/,
    "Decorative icons must be hidden from assistive tech"
  )
  assert.match(
    content,
    /motion-reduce/,
    "Pulse animation must honor prefers-reduced-motion"
  )
  assert.match(
    content,
    /getLoadingPreset/,
    "LoadingState must use travel-aware presets"
  )
})

test("ErrorState component provides retry recovery and WhatsApp escalation", () => {
  const errorPath = path.resolve(
    process.cwd(),
    "components/feedback/error-state.tsx"
  )
  assert.ok(fs.existsSync(errorPath), "error-state.tsx must exist")
  const content = fs.readFileSync(errorPath, "utf-8")

  assert.match(content, /role="alert"/, "ErrorState must expose role=alert")
  assert.match(content, /onRetry/, "ErrorState must accept a retry callback")
  assert.match(
    content,
    /getSupportWhatsAppUrl|company\.whatsapp|wa\.me/,
    "ErrorState must link to WhatsApp escalation via lib/content/company.ts"
  )
  assert.match(
    content,
    /getHumanErrorMessage|ApiError/,
    "ErrorState must render customer-safe copy for typed ApiError failures"
  )
  assert.match(
    content,
    /Speak with Alphaa/,
    "ErrorState must offer human escalation CTA"
  )
  assert.match(
    content,
    /aria-hidden/,
    "Decorative icons must be hidden from assistive tech"
  )
})

test("Skeleton loaders cover cards, tables, and input fields", () => {
  const skeletonPath = path.resolve(process.cwd(), "components/ui/skeleton.tsx")
  assert.ok(fs.existsSync(skeletonPath), "skeleton.tsx must exist")
  const content = fs.readFileSync(skeletonPath, "utf-8")

  assert.match(content, /animate-pulse/, "Skeletons must pulse while fetching")
  assert.match(
    content,
    /motion-reduce/,
    "Skeletons must honor prefers-reduced-motion"
  )
  assert.match(content, /CardSkeleton/, "Must provide a card placeholder")
  assert.match(
    content,
    /InputSkeleton|FormField/i,
    "Must provide an input placeholder"
  )
  assert.match(content, /TableSkeleton/, "Must provide a table placeholder")
})

test("Sonner toast provider uses Alphaa brand styling with success, error, and actions", () => {
  const sonnerPath = path.resolve(process.cwd(), "components/ui/sonner.tsx")
  const toastPath = path.resolve(process.cwd(), "lib/toast.ts")
  assert.ok(fs.existsSync(sonnerPath), "sonner.tsx must exist")
  assert.ok(fs.existsSync(toastPath), "lib/toast.ts must exist")

  const sonnerContent = fs.readFileSync(sonnerPath, "utf-8")
  assert.match(sonnerContent, /Toaster/, "Must render Sonner Toaster")
  assert.match(sonnerContent, /closeButton/, "Toasts must be dismissible")
  assert.match(sonnerContent, /bg-card/, "Toasts must use warm brand surface")
  assert.match(sonnerContent, /border-border/, "Toasts must use brand borders")
  assert.match(
    sonnerContent,
    /actionButton/,
    "Toasts must style action buttons"
  )

  const toastContent = fs.readFileSync(toastPath, "utf-8")
  assert.match(toastContent, /toast\.success/, "Must emit success toasts")
  assert.match(toastContent, /toast\.error/, "Must emit error toasts")
  assert.match(toastContent, /action/, "Must support toast action buttons")
  assert.match(
    toastContent,
    /toast\.promise/,
    "Async travel work must use toast.promise"
  )
})
