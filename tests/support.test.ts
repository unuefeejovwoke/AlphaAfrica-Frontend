import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Assisted Support Widget provides WhatsApp contextual URL generation and multi-channel options", () => {
  const widgetPath = path.resolve(process.cwd(), "components/support/assisted-support-widget.tsx");
  assert.ok(fs.existsSync(widgetPath), "assisted-support-widget.tsx must exist");
  const content = fs.readFileSync(widgetPath, "utf-8");

  assert.match(content, /wa\.me/i, "Widget must construct a WhatsApp wa.me link");
  assert.match(content, /tel:/i, "Widget must provide a direct phone link");
  assert.match(content, /Request a Callback/i, "Widget must offer callback / enquiry option");
  assert.match(content, /Need Help/i, "Widget trigger must have clear 'Need Help' label");
});
