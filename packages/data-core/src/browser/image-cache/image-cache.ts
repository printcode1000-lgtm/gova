import {
  ASOL_DB_STORES,
  asolDbClearStore,
  asolDbDelete,
  asolDbGet,
  asolDbGetAll,
  asolDbSetStructured,
} from '../asol-db';

const TOUCH_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_MAX_BYTES = 96 * 1024 * 1024;
const DEFAULT_MAX_ENTRIES = 500;

export interface AsolImageCacheRecord {
  schemaVersion: 1;
  cacheKey: string;
  sourceUrl: string;
  blob: Blob;
  contentType: string;
  byteLength: number;
  etag?: string;
  storedAt: number;
  lastAccessedAt: number;
  expiresAt: number;
}

export interface AsolImageCacheRead {
  record: AsolImageCacheRecord;
  stale: boolean;
}

function isValidRecord(value: unknown): value is AsolImageCacheRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<AsolImageCacheRecord>;
  return (
    record.schemaVersion === 1 &&
    typeof record.cacheKey === 'string' &&
    typeof record.sourceUrl === 'string' &&
    record.blob instanceof Blob &&
    typeof record.byteLength === 'number' &&
    typeof record.storedAt === 'number' &&
    typeof record.lastAccessedAt === 'number' &&
    typeof record.expiresAt === 'number'
  );
}

export async function readAsolImageCache(
  cacheKey: string,
  sourceUrl: string,
  now = Date.now(),
): Promise<AsolImageCacheRead | null> {
  const record = await asolDbGet<unknown>(ASOL_DB_STORES.IMAGE_CACHE, cacheKey);
  if (!isValidRecord(record) || record.sourceUrl !== sourceUrl) return null;

  if (now - record.lastAccessedAt >= TOUCH_INTERVAL_MS) {
    const touched = { ...record, lastAccessedAt: now };
    void asolDbSetStructured(ASOL_DB_STORES.IMAGE_CACHE, cacheKey, touched).catch(() => {});
  }
  return { record, stale: now >= record.expiresAt };
}

export async function writeAsolImageCache(input: {
  cacheKey: string;
  sourceUrl: string;
  blob: Blob;
  etag?: string;
  maxAgeMs: number;
  now?: number;
}): Promise<AsolImageCacheRecord> {
  const now = input.now ?? Date.now();
  const record: AsolImageCacheRecord = {
    schemaVersion: 1,
    cacheKey: input.cacheKey,
    sourceUrl: input.sourceUrl,
    blob: input.blob,
    contentType: input.blob.type || 'application/octet-stream',
    byteLength: input.blob.size,
    ...(input.etag ? { etag: input.etag } : {}),
    storedAt: now,
    lastAccessedAt: now,
    expiresAt: now + Math.max(0, input.maxAgeMs),
  };
  await asolDbSetStructured(ASOL_DB_STORES.IMAGE_CACHE, input.cacheKey, record);
  void pruneAsolImageCache().catch(() => {});
  return record;
}

export async function refreshAsolImageCache(
  record: AsolImageCacheRecord,
  maxAgeMs: number,
  now = Date.now(),
): Promise<AsolImageCacheRecord> {
  const refreshed = {
    ...record,
    lastAccessedAt: now,
    expiresAt: now + Math.max(0, maxAgeMs),
  };
  await asolDbSetStructured(ASOL_DB_STORES.IMAGE_CACHE, record.cacheKey, refreshed);
  return refreshed;
}

export async function deleteAsolImageCache(cacheKey: string): Promise<void> {
  await asolDbDelete(ASOL_DB_STORES.IMAGE_CACHE, cacheKey);
}

export async function clearAsolImageCache(): Promise<void> {
  await asolDbClearStore(ASOL_DB_STORES.IMAGE_CACHE);
}

export async function pruneAsolImageCache(options: {
  maxBytes?: number;
  maxEntries?: number;
} = {}): Promise<void> {
  const maxBytes = Math.max(0, options.maxBytes ?? DEFAULT_MAX_BYTES);
  const maxEntries = Math.max(0, options.maxEntries ?? DEFAULT_MAX_ENTRIES);
  const rows = await asolDbGetAll<unknown>(ASOL_DB_STORES.IMAGE_CACHE);
  const records = rows
    .map((row) => ({ key: row.key, value: row.value }))
    .filter((row): row is { key: string; value: AsolImageCacheRecord } => isValidRecord(row.value))
    .sort((left, right) => right.value.lastAccessedAt - left.value.lastAccessedAt);

  let keptBytes = 0;
  let keptEntries = 0;
  const deletions: Promise<void>[] = [];
  for (const row of records) {
    const fits = keptEntries < maxEntries && keptBytes + row.value.byteLength <= maxBytes;
    if (fits) {
      keptEntries += 1;
      keptBytes += row.value.byteLength;
    } else {
      deletions.push(asolDbDelete(ASOL_DB_STORES.IMAGE_CACHE, row.key));
    }
  }
  await Promise.all(deletions);
}
