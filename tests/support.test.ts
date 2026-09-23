import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("Assisted Support Widget provides WhatsApp contextual URL generation and multi-channel options", () => {
  const widgetPath = path.resolve(
    process.cwd(),
    "components/support/assisted-support-widget.tsx"
  )
  assert.ok(fs.existsSync(widgetPath), "assisted-support-widget.tsx must exist")
  const content = fs.readFileSync(widgetPath, "utf-8")

  assert.match(
    content,
    /getSupportWhatsAppUrl|wa\.me.*company\.whatsapp/,
    "Widget must build its WhatsApp link from lib/content/company.ts"
  )
  assert.match(content, /tel:/i, "Widget must provide a direct phone link")
  assert.match(
    content,
    /Request a Callback/i,
    "Widget must offer callback / enquiry option"
  )
  assert.match(
    content,
    /Need Help/i,
    "Widget trigger must have clear 'Need Help' label"
  )
  assert.match(
    content,
    /lib\/content\/company|company\.whatsapp|company\.phone/,
    "Widget numbers must read from lib/content/company.ts (no hardcoded numbers)"
  )
  assert.doesNotMatch(
    content,
    /2348000000000/,
    "Widget must not hardcode the support number"
  )
})
