import {
  UI_UID_SUFFIX_LENGTH,
  assertUiUid,
  isUiUidPrefix,
  isUiUidSuffix,
  type UiUid,
} from "./ui-uid";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * A source of randomness returning values in `[0, 1)`.
 *
 * It is injected rather than read from a global so this package stays free of
 * every runtime API. Development tooling passes `Math.random`; tests pass a
 * deterministic sequence.
 */
export type UiUidRandom = () => number;

function pick(alphabet: string, random: UiUidRandom): string {
  const index = Math.floor(random() * alphabet.length);
  return alphabet[Math.min(Math.max(index, 0), alphabet.length - 1)]!;
}

/**
 * Builds one immutable Base62 suffix.
 *
 * One digit and one uppercase letter are placed deliberately so the result can
 * never be mistaken for — or hand-written as — a deterministic lowercase copy
 * of an element id.
 */
export function uiUidSuffix(random: UiUidRandom): string {
  const characters = [pick(DIGITS, random), pick(UPPERCASE, random)];
  while (characters.length < UI_UID_SUFFIX_LENGTH) characters.push(pick(BASE62, random));
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = characters[index]!;
    characters[index] = characters[swap]!;
    characters[swap] = held;
  }
  return characters.join("");
}

/** Joins a reviewed semantic prefix with an already-generated suffix. */
export function createUiUid(prefix: string, suffix: string): UiUid {
  if (!isUiUidPrefix(prefix)) {
    throw new Error(`UI uid prefix "${prefix}" must be lowercase dot/dash-separated metadata.`);
  }
  if (!isUiUidSuffix(suffix)) {
    throw new Error(`UI uid suffix "${suffix}" must be a generated Base62 suffix.`);
  }
  return assertUiUid(`${prefix}-${suffix}`);
}

/**
 * Development-only helper: mints a uid for a new registration.
 *
 * The result is written into source by a developer. Never call this on an
 * application render path — a uid generated at runtime is not an identity.
 */
export function generateUiUid(prefix: string, random: UiUidRandom): UiUid {
  return createUiUid(prefix, uiUidSuffix(random));
}
