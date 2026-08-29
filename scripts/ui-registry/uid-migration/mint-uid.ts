import { isUiUid, isUiUidPrefix } from "@asol/ui-registry-core";

import { semanticHostToken } from "../static-dom-ids/component-host-policy";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Dev-time-only Base62 suffix mint. Migration is a one-shot developer tool
 * that writes its output into source; `Math.random` never reaches an
 * application render path from here.
 */
function mintSuffix(): string {
  const pick = (alphabet: string) => alphabet[Math.floor(Math.random() * alphabet.length)]!;
  const characters = [pick(DIGITS), pick(UPPERCASE)];
  while (characters.length < 6) characters.push(pick(BASE62));
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const held = characters[index]!;
    characters[index] = characters[swap]!;
    characters[swap] = held;
  }
  return characters.join("");
}

/** Mints a fresh, globally unique semantic id (dedup'd within `taken`). */
export function mintSemanticId(prefix: string, tag: string, taken: Set<string>): string {
  const token = semanticHostToken(tag) || "host";
  const base = `${prefix}.${token}`;
  let candidate = isUiUidPrefix(base) ? base : `${prefix}.host-${token}`;
  if (!isUiUidPrefix(candidate)) candidate = `host.${token}`;
  if (!taken.has(candidate) && isUiUidPrefix(candidate)) {
    taken.add(candidate);
    return candidate;
  }
  let index = 2;
  while (true) {
    const next = `${candidate}.${index}`;
    if (!taken.has(next) && isUiUidPrefix(next)) {
      taken.add(next);
      return next;
    }
    index += 1;
  }
}

/** Mints a fresh, globally unique uid for the given semantic id. */
export function mintUid(id: string, takenUids: Set<string>): string {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = `${id}-${mintSuffix()}`;
    if (isUiUid(candidate) && !takenUids.has(candidate)) {
      takenUids.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Could not mint a unique uid for "${id}" after 1000 attempts.`);
}
