"use client";

import {
  deleteAsolImageCache,
  readAsolImageCache,
  refreshAsolImageCache,
  writeAsolImageCache,
  type AsolImageCacheRecord,
} from "@asol/data-core/browser";
import { downloadStorageImage } from "./image-cache-port";

const DAY = 24 * 60 * 60 * 1000;
export const STORAGE_IMAGE_CACHE_MAX_AGE_MS = 7 * DAY;
export const LOCAL_FIRST_IMAGE_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

export type StorageImageCacheSource = "local" | "memory" | "asoldb" | "network" | "stale" | "fallback";

export interface LocalFirstStorageImageResult {
  source: StorageImageCacheSource;
  blob?: Blob;
  fallbackUrl?: string;
  cacheKey?: string;
}

const memory = new Map<string, AsolImageCacheRecord>();
const inFlight = new Map<string, Promise<LocalFirstStorageImageResult>>();

export function isRemoteStorageImageUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

export function buildStorageImageCacheKey(sourceUrl: string, identity?: string): string {
  const normalizedUrl = sourceUrl.split("#", 1)[0] ?? sourceUrl;
  const identityPart = identity?.trim() || normalizedUrl;
  return `storage-image-v1:${encodeURIComponent(identityPart)}`;
}

async function resolveRemoteImage(
  sourceUrl: string,
  options: { cacheKey?: string; maxAgeMs?: number } = {},
): Promise<LocalFirstStorageImageResult> {
  const cacheKey = buildStorageImageCacheKey(sourceUrl, options.cacheKey);
  const maxAgeMs = options.maxAgeMs ?? STORAGE_IMAGE_CACHE_MAX_AGE_MS;
  const now = Date.now();

  const memoryRecord = memory.get(cacheKey);
  if (memoryRecord?.sourceUrl === sourceUrl && now < memoryRecord.expiresAt) {
    return { source: "memory", blob: memoryRecord.blob, cacheKey };
  }

  const local = await readAsolImageCache(cacheKey, sourceUrl, now);
  if (local && !local.stale) {
    memory.set(cacheKey, local.record);
    return { source: "asoldb", blob: local.record.blob, cacheKey };
  }

  try {
    const downloaded = await downloadStorageImage({
      url: sourceUrl,
      ...(local?.record.etag ? { etag: local.record.etag } : {}),
    });
    if (downloaded.status === "not-modified" && local) {
      const refreshed = await refreshAsolImageCache(local.record, maxAgeMs, now);
      memory.set(cacheKey, refreshed);
      return { source: "asoldb", blob: refreshed.blob, cacheKey };
    }
    if (downloaded.status === "ok") {
      const stored = await writeAsolImageCache({
        cacheKey,
        sourceUrl,
        blob: downloaded.blob,
        ...(downloaded.etag ? { etag: downloaded.etag } : {}),
        maxAgeMs,
        now,
      });
      memory.set(cacheKey, stored);
      return { source: "network", blob: stored.blob, cacheKey };
    }
  } catch {
    if (local) {
      memory.set(cacheKey, local.record);
      return { source: "stale", blob: local.record.blob, cacheKey };
    }
  }

  return { source: "fallback", cacheKey };
}

export async function resolveLocalFirstStorageImage(
  sourceUrl: string | null | undefined,
  options: { cacheKey?: string; maxAgeMs?: number } = {},
): Promise<LocalFirstStorageImageResult> {
  if (!sourceUrl) return { source: "local" };
  if (!isRemoteStorageImageUrl(sourceUrl)) {
    return { source: "local", fallbackUrl: sourceUrl };
  }
  const key = buildStorageImageCacheKey(sourceUrl, options.cacheKey);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = resolveRemoteImage(sourceUrl, options).finally(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

export async function invalidateLocalFirstStorageImage(
  sourceUrl: string | null | undefined,
  cacheKey?: string,
): Promise<void> {
  if (!sourceUrl || !isRemoteStorageImageUrl(sourceUrl)) return;
  const key = buildStorageImageCacheKey(sourceUrl, cacheKey);
  memory.delete(key);
  await deleteAsolImageCache(key);
}
