/**
 * Integration: the public API against a host with no native shell.
 *
 * Node is the harshest realistic host — no Capacitor bridge, no DOM. Every
 * public method must still settle, and settle as a Result. A method that throws
 * here would crash a web build; a method that never settles would hang a screen
 * behind a spinner with no error to show, which is worse than failing.
 *
 * This exercises the real adapter and validation code paths rather than mocks,
 * so it also proves the "runs on web" and "plugin missing" degradation the
 * capability registry promises.
 */

import assert from "node:assert/strict";
import { NativeCore, PermissionKinds, isErr, isOk } from "../../index";

const SETTLE_BUDGET_MS = 5_000;

/** A public method must settle within the budget; hanging is a failure. */
async function settles<T>(label: string, run: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} did not settle within ${SETTLE_BUDGET_MS}ms`)),
      SETTLE_BUDGET_MS,
    );
  });
  try {
    return await Promise.race([run(), guard]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Every public method returns the Result union — never a bare value, never a throw. */
function assertResultShape(label: string, value: unknown): void {
  assert.ok(
    value !== null && typeof value === "object" && "ok" in (value as object),
    `${label} must return a Result, got ${typeof value}`,
  );
  const result = value as { ok: boolean };
  assert.equal(typeof result.ok, "boolean", `${label}.ok must be a boolean`);
  if (result.ok) {
    assert.ok(isOk(result as never), `${label} ok-result must satisfy isOk`);
  } else {
    const failed = result as { ok: false; error?: { code?: string } };
    assert.ok(isErr(result as never), `${label} err-result must satisfy isErr`);
    assert.ok(failed.error, `${label} failure must carry an error`);
    assert.equal(
      typeof failed.error?.code,
      "string",
      `${label} error must carry a string code`,
    );
  }
}

const failures: string[] = [];

async function check(label: string, run: () => Promise<unknown>): Promise<void> {
  try {
    const value = await settles(label, run);
    assertResultShape(label, value);
  } catch (error) {
    failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ── 1. Device/state reads degrade instead of crashing ──────────────────────
await check("getAppInfo", () => NativeCore.getAppInfo());
await check("getAppState", () => NativeCore.getAppState());
await check("getNetworkStatus", () => NativeCore.getNetworkStatus());
await check("getStorageFreeSpace", () => NativeCore.getStorageFreeSpace());
await check("getDeviceInfo", () => NativeCore.getDeviceInfo());

// ── 2. Permission flow: denied/unsupported must be a value, not an exception ─
await check("checkPermission", () =>
  NativeCore.checkPermission(PermissionKinds.Notifications),
);
await check("requestPermission", () =>
  NativeCore.requestPermission(PermissionKinds.Notifications),
);

// ── 3. Push registration with no bridge ────────────────────────────────────
await check("registerForPushNotifications", () => NativeCore.registerForPushNotifications());
await check("ensureNotificationChannels", () => NativeCore.ensureNotificationChannels());
await check("listPendingInbox", () => NativeCore.listPendingInbox());

// ── 4. Storage, files, downloads, clipboard, share ─────────────────────────
await check("readClipboard", () => NativeCore.readClipboard());
await check("getPreference", () => NativeCore.getPreference({ key: "integration-probe" }));
await check("openFileExternally", () =>
  NativeCore.openFileExternally({ path: "outbox/probe.pdf" }),
);
await check("startDownload", () =>
  NativeCore.startDownload({
    url: "https://example.invalid/probe.zip",
    fileName: "probe.zip",
  }),
);

// ── 5. Validation rejects hostile input as a Result, not a throw ───────────
await check("writeClipboard(empty options)", () =>
  NativeCore.writeClipboard({} as never),
);
await check("openFileExternally(empty path)", () =>
  NativeCore.openFileExternally({ path: "" } as never),
);
await check("getPreference(missing key)", () =>
  NativeCore.getPreference({} as never),
);

if (failures.length > 0) {
  assert.fail(
    `Public methods misbehaved on a host with no native shell:\n  - ${failures.join("\n  - ")}`,
  );
}

// ── 6. Invalid input must be rejected before any adapter call ──────────────
const rejected = await NativeCore.writeClipboard({} as never);
assert.equal(
  rejected.ok,
  false,
  "Clipboard write with no string/image/url must be rejected by validation.",
);

const emptyPath = await NativeCore.openFileExternally({ path: "" } as never);
assert.equal(
  emptyPath.ok,
  false,
  "openFileExternally must reject an empty path before touching the filesystem.",
);

console.log("Native Core host-behaviour integration tests passed.");
