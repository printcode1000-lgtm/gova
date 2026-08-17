/**
 * Single responsibility: derive content (web bundle) versions from the native
 * shell line.
 *
 * A store release ships a complete, current web bundle inside the shell, so it
 * opens a new content line at counter zero: shell `0.2.3` carries `0.2.3.0`.
 * Nothing is published for it — whoever installs that build already holds the
 * content. Every OTA published afterwards advances the counter alone
 * (`0.2.3.1`, `0.2.3.2`), and the next shell opens `0.2.4.0`.
 *
 * The counter restarts per shell, but the version never moves backwards: the
 * native triple leads the comparison, so `0.2.4.0` outranks `0.2.3.9`. That
 * ordering is load-bearing. `ota-update-service` decides an update exists by
 * comparing the published version against the one baked into the installed
 * bundle, and each device runs the comparison that shipped inside its own
 * bundle — code no update can fix if that update is the one being rejected. A
 * version that dipped would tell an old shell it is up to date instead of
 * routing it to the native-version gate.
 */

import { compareOtaVersions } from "./version-ordering";

const NATIVE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const CONTENT_VERSION_PATTERN = /^(\d+\.\d+\.\d+)\.(\d+)$/;

export interface ContentVersionParts {
  nativeVersion: string;
  counter: number;
}

export function isNativeVersion(value: string): boolean {
  return NATIVE_VERSION_PATTERN.test(value);
}

export function assertNativeVersion(value: string): string {
  if (!isNativeVersion(value)) {
    throw new Error(`Invalid native shell version: ${value}. Expected x.y.z.`);
  }
  return value;
}

/** Null for a legacy three-part version, which belongs to no line. */
export function parseContentVersion(value: string): ContentVersionParts | null {
  const match = CONTENT_VERSION_PATTERN.exec(value);
  return match
    ? { nativeVersion: match[1]!, counter: Number(match[2]) }
    : null;
}

/** The version stamped into a shell that carries its own complete bundle. */
export function releaseContentVersion(nativeVersion: string): string {
  return `${assertNativeVersion(nativeVersion)}.0`;
}

/**
 * The next OTA version on this shell's line.
 *
 * `previous` is the live manifest version, or null when R2 holds none. A
 * legacy three-part version belongs to no line, so publication restarts the
 * counter at one — one above the `.0` the shell itself already carries.
 */
export function nextContentVersion(
  previous: string | null,
  nativeVersion: string,
): string {
  assertNativeVersion(nativeVersion);
  const parsed = previous ? parseContentVersion(previous) : null;
  const next =
    parsed && parsed.nativeVersion === nativeVersion
      ? `${nativeVersion}.${parsed.counter + 1}`
      : `${nativeVersion}.1`;
  assertContentVersionAdvances(next, previous);
  return next;
}

/**
 * The store-release ordering rule: compare **content lines**, not counters.
 *
 * A shell stamps its content version as `<native>.0`, which is structurally the lowest
 * value on its line — every OTA published onto that shell is `.1`, `.2`, and upward. So
 * comparing a shell build against the previous *local* build is comparing two different
 * things the moment any OTA has been built locally, and the comparison is guaranteed to
 * look like a regression:
 *
 * ```text
 * published OTA        0.2.3.1
 * shell being rebuilt  0.2.3.0   ← lower counter, same line, not a regression
 * ```
 *
 * That is the normal state of a store rebuild. Google Play is published at `0.2.3`, R2
 * carries OTA `0.2.3.1`, and a fresh local package for testing carries the newest `out/`
 * bundle stamped `0.2.3.0`. Nothing is published, so no installed bundle compares
 * anything.
 *
 * What must not regress is the **line**: dropping the shell from `0.2.5` back to `0.2.4`
 * would ship older native content as if it were current. The counter within a line is the
 * publisher's concern, and `assertContentVersionAdvances` enforces it there.
 *
 * Applying the publish rule here made the "keep the current version" choice impossible —
 * the release console offered a button that always failed with "does not outrank".
 */
export function assertContentLineDoesNotRegress(
  next: string,
  previous: string | null,
): void {
  if (!previous) return;
  // A legacy three-part version belongs to no line, so it *is* its own line. Falling back
  // to the raw string keeps the comparison meaningful instead of throwing on old output.
  const nextLine = parseContentVersion(next)?.nativeVersion ?? next;
  const previousLine = parseContentVersion(previous)?.nativeVersion ?? previous;
  if (compareOtaVersions(nextLine, previousLine) >= 0) return;
  throw new Error(
    `Refusing to build content line ${nextLine}: it is older than ${previousLine}.\n` +
      "A store rebuild may reuse its own line — the shell's `.0` is always below any OTA\n" +
      "published onto it — but it must never move the line backwards, which would ship\n" +
      "older native content as if it were current.\n" +
      `Raise the Android version to at least ${previousLine}.`,
  );
}

/**
 * A published version that does not outrank the one it replaces is read as
 * "no update" by every installed bundle, which is indistinguishable from a
 * release that never shipped. Refuse, and name the way out.
 *
 * For a build that publishes nothing, use `assertContentLineDoesNotRegress` instead.
 */
export function assertContentVersionAdvances(
  next: string,
  previous: string | null,
): void {
  if (!previous || compareOtaVersions(next, previous) > 0) return;
  throw new Error(
    `Refusing to use content version ${next}: it does not outrank ${previous}.\n` +
      "Installed bundles compare the published version against their own, so a version that\n" +
      'does not advance is read as "no update" and the release never reaches anyone.\n' +
      `Raise the Android version above ${previous} and release that shell first.`,
  );
}
