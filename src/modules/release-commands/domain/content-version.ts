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
 *
 * Lives in the domain rather than in `scripts/` because the release console
 * previews these same numbers before a build starts; a preview derived from a
 * second implementation is a preview that can lie.
 */
// Relative, not `@/`: release scripts import this module through
// `scripts/ota/ota-release-line.ts`, and tsx does not resolve the alias for
// them. A path that only works in one of the two callers is a module that
// breaks the release the first time it is used.
import { compareOtaVersions } from "../../../features/ota/utils/ota-state";

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
  const next = parsed && parsed.nativeVersion === nativeVersion
    ? `${nativeVersion}.${parsed.counter + 1}`
    : `${nativeVersion}.1`;
  assertContentVersionAdvances(next, previous);
  return next;
}

/**
 * A published version that does not outrank the one it replaces is read as
 * "no update" by every installed bundle, which is indistinguishable from a
 * release that never shipped. Refuse, and name the way out.
 */
export function assertContentVersionAdvances(
  next: string,
  previous: string | null,
): void {
  if (!previous || compareOtaVersions(next, previous) > 0) return;
  throw new Error(
    `Refusing to use content version ${next}: it does not outrank ${previous}.\n` +
      "Installed bundles compare the published version against their own, so a version that\n" +
      "does not advance is read as \"no update\" and the release never reaches anyone.\n" +
      `Raise the Android version above ${previous} and release that shell first.`,
  );
}
