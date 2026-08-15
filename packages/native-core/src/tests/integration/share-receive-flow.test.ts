/**
 * Integration: inbound share, from hostile payload to delivered item.
 *
 * Exercises the validator and the queue together, which is how a real share
 * intent arrives: the OS can launch the application straight into a share long
 * before React has mounted, so an item that arrives with no listener attached
 * must still reach the first listener that shows up. That gap is the reason the
 * queue exists, and it is the case a unit test of either half alone misses.
 *
 * Share payloads come from arbitrary third-party applications, so everything
 * here treats the input as hostile.
 */

import assert from "node:assert/strict";
import { ShareQueue } from "../../domain/share/share-queue";
import {
  MAX_RECEIVED_BYTES,
  MAX_TEXT_LENGTH,
  isSafeUrl,
  validatePayload,
  validatePayloads,
} from "../../domain/share/share-validator";

// ── 1. Cold start: the item arrives before anything is listening ───────────
const queue = new ShareQueue();

const coldStart = validatePayload({ type: "text", text: "shared before mount" });
assert.ok(coldStart, "A well-formed text payload must validate.");
queue.enqueue(coldStart);

assert.equal(
  queue.getPending().length,
  1,
  "An item arriving with no listener must be held, not dropped.",
);

const delivered: string[] = [];
queue.subscribe((item) => {
  delivered.push(item.id);
});
for (const pending of [...queue.getPending()]) {
  delivered.push(pending.id);
  queue.consume(pending.id);
}
assert.deepEqual(
  delivered,
  [coldStart.id],
  "The late listener must still receive the pre-mount item exactly once.",
);
assert.equal(queue.getPending().length, 0, "A consumed item must not linger.");

// ── 2. Warm path: a listener attached first gets it live ───────────────────
const live: string[] = [];
queue.subscribe((item) => live.push(item.id));
const warm = validatePayload({ type: "text", text: "shared while running" });
assert.ok(warm);
queue.enqueue(warm);
assert.deepEqual(live, [warm.id], "A live listener must be notified on enqueue.");

// ── 3. Hostile input is rejected before it can reach the queue ─────────────
const rejected: unknown[] = [
  null,
  undefined,
  "just a string",
  {},
  { type: "text" },
  { type: "text", text: "   " },
  { type: "url", url: "javascript:alert(1)" },
  { type: "url", url: "data:text/html;base64,PHNjcmlwdD4=" },
  { type: "url", url: "file:///etc/passwd" },
  { type: "url", url: "not a url" },
  // Executables are outside the MIME allow-list.
  { type: "file", name: "payload.exe", mimeType: "application/x-msdownload", size: 10 },
  // Oversized files are refused rather than staged.
  { type: "file", name: "huge.pdf", mimeType: "application/pdf", size: MAX_RECEIVED_BYTES + 1 },
];
for (const payload of rejected) {
  assert.equal(
    validatePayload(payload),
    null,
    `Hostile payload must be rejected: ${JSON.stringify(payload)?.slice(0, 70)}`,
  );
}

// ── 4. Oversized text is capped, not trusted wholesale ─────────────────────
const oversized = validatePayload({ type: "text", text: "a".repeat(MAX_TEXT_LENGTH + 5_000) });
assert.ok(oversized, "Oversized text is sanitized rather than dropped.");
assert.equal(oversized.kind, "text");
assert.ok(
  oversized.kind === "text" && oversized.text.length <= MAX_TEXT_LENGTH,
  "Text must be capped at MAX_TEXT_LENGTH so a sender cannot exhaust memory.",
);

// ── 5. Path separators are stripped from an attacker-controlled file name ──
const traversal = validatePayload({
  type: "file",
  name: "../../etc/passwd",
  mimeType: "text/plain",
  size: 10,
});
assert.ok(traversal, "A text file with a hostile name is sanitized, not rejected.");
assert.ok(
  traversal.kind === "file" && !traversal.name.includes("/") && !traversal.name.includes("\\"),
  "Path separators must be stripped from the shared file name.",
);

// ── 6. URL safety ──────────────────────────────────────────────────────────
assert.equal(isSafeUrl("https://example.com/a"), true);
assert.equal(isSafeUrl("http://example.com/a"), true);
assert.equal(isSafeUrl("javascript:alert(1)"), false);
assert.equal(isSafeUrl("data:text/html;base64,PHNjcmlwdD4="), false);
assert.equal(isSafeUrl("not a url"), false);

// ── 7. A batch survives one bad apple ──────────────────────────────────────
const batch = validatePayloads([
  { type: "text", text: "fine" },
  { type: "url", url: "javascript:alert(1)" },
  { type: "text", text: "also fine" },
]);
assert.equal(batch.length, 2, "Valid items must survive alongside a rejected one.");
assert.ok(
  batch.every((item) => item.kind === "text"),
  "Only the two well-formed text items may pass.",
);

// ── 8. The queue stays bounded under a flood ───────────────────────────────
const flood = new ShareQueue(5);
for (let index = 0; index < 20; index += 1) {
  const item = validatePayload({ type: "text", text: `flood item ${index}` });
  assert.ok(item);
  flood.enqueue(item);
}
assert.equal(
  flood.getPending().length,
  5,
  "A misbehaving sender must not grow the queue without bound.",
);

// ── 9. A throwing listener must not stop delivery to the others ────────────
const resilient = new ShareQueue();
const seen: string[] = [];
resilient.subscribe(() => {
  throw new Error("listener blew up");
});
resilient.subscribe((item) => seen.push(item.id));
const resilientItem = validatePayload({ type: "text", text: "delivered anyway" });
assert.ok(resilientItem);
resilient.enqueue(resilientItem);
assert.deepEqual(
  seen,
  [resilientItem.id],
  "One failing listener must not deprive the others of the item.",
);

console.log("Share receive flow integration tests passed.");
