import { asolHttpFetch } from '../../ports/http-fetch';

/**
 * What an R2 bucket holds right now, read through Cloudflare's objects REST listing.
 *
 * Separate from GraphQL usage analytics because an API token may permit object
 * listing while denying Analytics Read, and the two answers must fail
 * independently. Only counts, byte totals, and the newest key leave this module.
 */
export interface CloudflareR2BucketContents {
  readonly capturedAt: string;
  readonly objectCount: number;
  readonly totalSizeBytes: number;
  readonly latestObjectKey: string | null;
  readonly latestObjectLastModified: string | null;
}

export interface ReadCloudflareR2BucketContentsInput {
  readonly accountId: string;
  readonly bucketName: string;
  readonly apiToken: string;
  readonly now?: Date;
}

type R2ObjectSummary = {
  readonly key?: string;
  readonly size?: number;
  readonly last_modified?: string;
};

type CloudflareObjectsEnvelope = {
  readonly success?: boolean;
  readonly errors?: readonly { readonly message?: string; readonly code?: number }[];
  readonly result?: readonly R2ObjectSummary[];
  readonly result_info?: { readonly cursor?: string; readonly is_truncated?: boolean };
};

const CLOUDFLARE_API_BASE_URL = 'https://api.cloudflare.com/client/v4';
const PAGE_SIZE = 1000;

async function readObjectPage(
  input: ReadCloudflareR2BucketContentsInput,
  cursor: string | null,
): Promise<CloudflareObjectsEnvelope> {
  const url = new URL(
    `${CLOUDFLARE_API_BASE_URL}/accounts/${input.accountId}/r2/buckets/${encodeURIComponent(input.bucketName)}/objects`,
  );
  url.searchParams.set('per_page', String(PAGE_SIZE));
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await asolHttpFetch(url.toString(), {
    headers: { Authorization: 'Bearer ' + input.apiToken },
    cache: 'no-store',
  });
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as CloudflareObjectsEnvelope) : {};
  if (!response.ok || payload.success === false) {
    const detail = payload.errors?.map((error) => error.message ?? error.code).join('; ');
    throw new Error(detail || 'cloudflareR2ObjectsHttp' + response.status);
  }
  return payload;
}

export async function readCloudflareR2BucketContents(
  input: ReadCloudflareR2BucketContentsInput,
): Promise<CloudflareR2BucketContents> {
  const capturedAt = input.now ?? new Date();
  let objectCount = 0;
  let totalSizeBytes = 0;
  let latestObjectKey: string | null = null;
  let latestObjectLastModified: string | null = null;
  let cursor: string | null = null;

  do {
    const payload = await readObjectPage(input, cursor);
    for (const object of payload.result ?? []) {
      objectCount += 1;
      totalSizeBytes += object.size ?? 0;
      const modified = object.last_modified ?? null;
      if (
        modified &&
        (!latestObjectLastModified || Date.parse(modified) > Date.parse(latestObjectLastModified))
      ) {
        latestObjectLastModified = modified;
        latestObjectKey = object.key ?? null;
      }
    }
    cursor = payload.result_info?.is_truncated ? (payload.result_info.cursor ?? null) : null;
  } while (cursor);

  return {
    capturedAt: capturedAt.toISOString(),
    objectCount,
    totalSizeBytes,
    latestObjectKey,
    latestObjectLastModified,
  };
}
