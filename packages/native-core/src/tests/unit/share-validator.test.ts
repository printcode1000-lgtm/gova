import assert from "node:assert/strict";
import {
  validateInboundShareItem,
  isSafeUrl,
  MAX_RECEIVED_BYTES,
} from "../../domain/share/share-validator";

// 1. Text item validation
const validText = validateInboundShareItem({
  kind: "text",
  text: "Hello world",
});
assert.ok(validText !== null);
assert.equal(validText?.kind, "text");
if (validText?.kind === "text") {
  assert.equal(validText.text, "Hello world");
}

// Empty text is rejected
assert.equal(validateInboundShareItem({ kind: "text", text: "   " }), null);

// 2. URL item validation
const validHttps = validateInboundShareItem({
  kind: "url",
  url: "https://example.com/item/123",
});
assert.ok(validHttps !== null);
assert.equal(validHttps?.kind, "url");

// Dangerous URL schemes are rejected
assert.equal(validateInboundShareItem({ kind: "url", url: "javascript:alert(1)" }), null);
assert.equal(validateInboundShareItem({ kind: "url", url: "data:text/html,<script>alert(1)</script>" }), null);
assert.equal(validateInboundShareItem({ kind: "url", url: "file:///etc/passwd" }), null);

assert.equal(isSafeUrl("https://example.com"), true);
assert.equal(isSafeUrl("http://example.com"), true);
assert.equal(isSafeUrl("javascript:void(0)"), false);
assert.equal(isSafeUrl("data:image/png;base64,..."), false);

// 3. File item validation
const validFile = validateInboundShareItem({
  kind: "file",
  name: "image.png",
  mimeType: "image/png",
  uri: "content://media/external/images/media/1",
  sizeBytes: 1024 * 1024,
});
assert.ok(validFile !== null);
assert.equal(validFile?.kind, "file");

// Oversized file > 50MB rejected
const oversized = validateInboundShareItem({
  kind: "file",
  name: "large.mp4",
  mimeType: "video/mp4",
  uri: "content://media/video/1",
  sizeBytes: MAX_RECEIVED_BYTES + 1,
});
assert.equal(oversized, null, "File over MAX_RECEIVED_BYTES must be rejected");

// Dangerous MIME type rejected
const executable = validateInboundShareItem({
  kind: "file",
  name: "malware.exe",
  mimeType: "application/x-msdownload",
  uri: "content://media/1",
  sizeBytes: 1024,
});
assert.equal(executable, null, "Dangerous executable MIME must be rejected");

console.log("✓ All share validator unit tests passed.");
