/**
 * Native Platform contract tests.
 *
 * These cover the pure, platform-independent logic: the error taxonomy,
 * permission mapping, path safety, share validation, and duplicate
 * suppression. Plugin-backed behaviour is verified on a real device.
 */

import assert from "node:assert/strict";

import { DuplicateFilter } from "../barcode/duplicate-filter";
import {
  NativeErrorCodes,
  NativeErrorRecoveries,
  NativePlatformError,
  isCancelledError,
  isPermissionDeniedError,
  looksCancelled,
  looksPermissionDenied,
  permissionErrorRequiresSettings,
  toNativeError,
} from "../core/errors";
import { createEmitter } from "../core/listener";
import { assertSafePath } from "../files/app-storage";
import {
  PermissionStates,
  fromCapacitorState,
  toPermissionResult,
} from "../permissions/types";
import { nativePermissionRequestOptions } from "../permissions/permission-adapters";
import { ShareQueue } from "../share/share-queue";
import { isSafeUrl, validatePayload } from "../share/share-validator";

// ---------------------------------------------------------------------------
// Error taxonomy
// ---------------------------------------------------------------------------
{
  const cancelled = NativePlatformError.cancelled("Camera");
  assert.equal(cancelled.code, NativeErrorCodes.Cancelled);
  assert.equal(isCancelledError(cancelled), true);
  assert.equal(isCancelledError(new Error("nope")), false);

  const permissionDenied = NativePlatformError.permissionDenied("Camera");
  assert.equal(isPermissionDeniedError(permissionDenied), true);
  assert.equal(isPermissionDeniedError(cancelled), false);
  assert.equal(isPermissionDeniedError(new Error("Permission denied")), false);

  const settingsPermission = NativePlatformError.permissionDenied(
    "Camera",
    undefined,
    NativeErrorRecoveries.OpenSettings,
  );
  assert.equal(permissionErrorRequiresSettings(settingsPermission), true);
  assert.equal(permissionErrorRequiresSettings(permissionDenied), false);

  // Raw plugin errors are classified, not leaked.
  assert.equal(looksCancelled({ code: "USER_CANCELLED" }), true);
  assert.equal(looksCancelled(new Error("No image picked")), true);
  assert.equal(looksPermissionDenied(new Error("Permission denied")), true);

  assert.equal(
    toNativeError("Camera", { code: "takePhotoCancelled" }).code,
    NativeErrorCodes.Cancelled,
  );
  assert.equal(
    toNativeError("Location", new Error("User denied Geolocation")).code,
    NativeErrorCodes.PermissionDenied,
  );
  assert.equal(
    toNativeError("Files", new Error("disk exploded")).code,
    NativeErrorCodes.Internal,
  );
  // An already-normalized error passes through untouched.
  assert.equal(toNativeError("Camera", cancelled), cancelled);
}

// ---------------------------------------------------------------------------
// Permission mapping
// ---------------------------------------------------------------------------
{
  assert.equal(fromCapacitorState("granted"), PermissionStates.Granted);
  assert.equal(fromCapacitorState("denied"), PermissionStates.Denied);
  assert.equal(fromCapacitorState("prompt"), PermissionStates.Prompt);
  // Android's post-denial state must still be promptable.
  assert.equal(
    fromCapacitorState("prompt-with-rationale"),
    PermissionStates.Prompt,
  );
  // iOS limited photo access is usable.
  assert.equal(fromCapacitorState("limited"), PermissionStates.Granted);
  assert.equal(fromCapacitorState(undefined), PermissionStates.Unsupported);

  const blocked = toPermissionResult("camera", PermissionStates.Blocked);
  assert.equal(blocked.granted, false);
  assert.equal(blocked.requiresSettings, true);

  const granted = toPermissionResult("camera", PermissionStates.Granted);
  assert.equal(granted.granted, true);
  assert.equal(granted.requiresSettings, false);

  assert.deepEqual(nativePermissionRequestOptions("camera"), {
    permissions: ["camera"],
  });
  assert.deepEqual(nativePermissionRequestOptions("photos"), {
    permissions: ["photos"],
  });
  assert.equal(nativePermissionRequestOptions("notifications"), undefined);
}

// ---------------------------------------------------------------------------
// Application path safety
// ---------------------------------------------------------------------------
{
  assert.equal(assertSafePath("/inbox/file.txt"), "inbox/file.txt");
  assert.equal(assertSafePath("a\\b\\c.txt"), "a/b/c.txt");

  for (const unsafe of ["../secrets", "a/../../b", "..", "C:/Windows", ""]) {
    assert.throws(
      () => assertSafePath(unsafe),
      /Unsafe application file path/,
      `Path traversal was not rejected: ${unsafe}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Share validation — untrusted input from other applications
// ---------------------------------------------------------------------------
{
  assert.equal(isSafeUrl("https://example.com"), true);
  assert.equal(isSafeUrl("http://example.com"), true);
  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("file:///etc/passwd"), false);
  assert.equal(isSafeUrl("data:text/html,<script>"), false);
  assert.equal(isSafeUrl("not a url"), false);

  const url = validatePayload({ type: "url", value: "https://asol.app/x" });
  assert.equal(url?.kind, "url");
  assert.equal(url?.value, "https://asol.app/x");

  assert.equal(validatePayload({ type: "url", value: "javascript:x" }), null);

  const text = validatePayload({ type: "text", value: "  hello  " });
  assert.equal(text?.kind, "text");
  assert.equal(text?.value, "hello");

  assert.equal(validatePayload({ type: "text", value: "   " }), null);

  // Unknown binary MIME types are discarded rather than trusted.
  assert.equal(
    validatePayload({
      type: "file",
      mimeType: "application/x-msdownload",
      data: "AAAA",
    }),
    null,
  );

  // A file name cannot escape its directory.
  const png = validatePayload({
    type: "file",
    mimeType: "image/png",
    name: "../../evil.png",
    data: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64"),
  });
  assert.equal(png?.kind, "image");
  assert.ok(!png?.fileName?.includes(".."), "Traversal survived sanitisation.");
}

// ---------------------------------------------------------------------------
// Share queue — delivery exactly once, with replay for late subscribers
// ---------------------------------------------------------------------------
{
  const queue = new ShareQueue();
  const item = validatePayload({ type: "text", value: "queued" });
  assert.ok(item);

  queue.enqueue(item);
  assert.equal(queue.size(), 1);

  // A listener attaching after the fact still sees the pending item.
  const replayed: string[] = [];
  const unsubscribe = queue.addListener((entry) => replayed.push(entry.id));
  assert.deepEqual(replayed, [item.id]);

  assert.equal(queue.consume(item.id)?.id, item.id);
  assert.equal(queue.consume(item.id), null, "Item was delivered twice.");
  assert.equal(queue.size(), 0);
  unsubscribe();
}

// ---------------------------------------------------------------------------
// Barcode duplicate suppression
// ---------------------------------------------------------------------------
{
  const filter = new DuplicateFilter(1_000);
  assert.equal(filter.accept("ABC", 0), true);
  assert.equal(filter.accept("ABC", 500), false, "Duplicate was not filtered.");
  assert.equal(filter.accept("ABC", 1_500), true, "Window did not expire.");
  assert.equal(filter.accept("XYZ", 1_500), true);

  // A zero window disables suppression entirely.
  const passthrough = new DuplicateFilter(0);
  assert.equal(passthrough.accept("ABC", 0), true);
  assert.equal(passthrough.accept("ABC", 0), true);
}

// ---------------------------------------------------------------------------
// Emitter isolation — one bad subscriber must not break the others
// ---------------------------------------------------------------------------
{
  const emitter = createEmitter<number>("test");
  const seen: number[] = [];

  emitter.add(() => {
    throw new Error("subscriber exploded");
  });
  emitter.add((value) => seen.push(value));

  emitter.emit(7);
  assert.deepEqual(seen, [7], "A throwing subscriber blocked the others.");

  emitter.clear();
  assert.equal(emitter.size(), 0);
}

console.log("Native Platform contract tests passed.");
