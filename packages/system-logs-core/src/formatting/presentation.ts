import type { SystemLogInput } from '../domain/entities';

/** Best-effort stack cleanup for bundled/minified frames. */
export function prettifyStack(stack: string | undefined): string {
  if (!stack) return '';
  return stack
    .replace(/webpack-internal:\/\/\/\([^)]+\)/g, '<bundle>')
    .replace(/\?v=[a-f0-9]+/gi, '')
    .replace(/\.next\/static\/chunks\//g, 'chunks/');
}

export function formatExportCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]!);
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => escape(row[key])).join(',')),
  ].join('\n');
}

export function groupEntriesByFingerprint<T extends { fingerprint: string }>(
  entries: T[],
): Array<{ fingerprint: string; entries: T[] }> {
  const map = new Map<string, T[]>();
  for (const entry of entries) {
    const bucket = map.get(entry.fingerprint) ?? [];
    bucket.push(entry);
    map.set(entry.fingerprint, bucket);
  }
  return [...map.entries()].map(([fingerprint, grouped]) => ({
    fingerprint,
    entries: grouped,
  }));
}

export function matchesLogQuery(
  entry: SystemLogInput & { fingerprint?: string },
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    entry.message,
    entry.errorName,
    entry.routeName,
    entry.page,
    entry.feature,
    entry.operation,
    entry.stack,
    entry.correlationId,
    entry.fingerprint,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}
