import type { PageSnapshotIdentity } from "../domain/page-snapshot.types";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function normalizeSnapshotRecord(
  value?: Record<string, string | string[]>,
): Record<string, string | string[]> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function queryToRecord(
  query?: Record<string, string | string[]>,
): Record<string, string | string[]> {
  if (query) return normalizeSnapshotRecord(query);
  if (!isBrowser()) return {};
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of params.entries()) {
    const existing = result[key];
    if (Array.isArray(existing)) existing.push(value);
    else if (existing !== undefined) result[key] = [existing, value];
    else result[key] = value;
  }
  return normalizeSnapshotRecord(result);
}

export function stableSerializeSnapshotValue(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableSerializeSnapshotValue).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, item]) =>
        `${JSON.stringify(key)}:${stableSerializeSnapshotValue(item)}`,
    )
    .join(",")}}`;
}

export function createPageSnapshotKey(identity: PageSnapshotIdentity): string {
  const params = normalizeSnapshotRecord(identity.params);
  const query = queryToRecord(identity.query);
  return [
    "page-snapshot",
    identity.userId || "anonymous",
    identity.route || identity.pathname || "/",
    identity.pathname || "/",
    stableSerializeSnapshotValue(params),
    stableSerializeSnapshotValue(query),
  ].join("|");
}
