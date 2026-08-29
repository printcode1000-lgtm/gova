/**
 * Literal-uid minting: dev-time-only, called by the migration codemod and
 * written into source once. Never reachable from an application render path.
 */
import { isUiUid, isUiUidPrefix } from '@asol/ui-registry-core';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function pick(alphabet: string): string {
  return alphabet[Math.floor(Math.random() * alphabet.length)]!;
}

function mintSuffix(): string {
  const characters = [pick(DIGITS), pick(UPPERCASE)];
  while (characters.length < 6) characters.push(pick(BASE62));
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const held = characters[index]!;
    characters[index] = characters[swap]!;
    characters[swap] = held;
  }
  return characters.join('');
}

function semanticHostToken(tag: string): string {
  return tag
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const DROPPED_SEGMENTS = new Set(['src', 'features', 'presentation', 'components', 'hooks', 'application', 'ui', 'app']);

function camelToKebab(value: string): string {
  return value
    .replace(/\.tsx$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Stable semantic prefix for a new id, derived from the source path only. */
export function fileSemanticPrefix(relativePath: string): string {
  const parts = relativePath
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
  const kept = parts.map(camelToKebab).filter((part) => part.length > 0 && !DROPPED_SEGMENTS.has(part));
  const joined = kept.join('.');
  return joined.length > 0 ? joined : 'app';
}

/** Mints a fresh, globally unique semantic id (dedup'd within `taken`). */
export function mintSemanticId(prefix: string, tag: string, taken: Set<string>): string {
  const token = semanticHostToken(tag) || 'host';
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
