import { asolHttpFetch } from '@/core/api/asol-http-transport';
import {
  getAccountCloudflareCredentials,
  getAccountS3Credentials,
} from '../config/account-credentials';
import type { R2CorsPolicy, R2CorsRule } from './r2-cors-policy';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ message: string }>;
  result: T;
}

export class CloudflareR2ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CloudflareR2ApiError';
  }
}

function getCloudflareHeaders(accountId: string): HeadersInit {
  const cloudflare = getAccountCloudflareCredentials(accountId);
  return {
    Authorization: `Bearer ${cloudflare.apiToken}`,
    'Content-Type': 'application/json',
  };
}

function getJurisdictionHeader(accountId: string): HeadersInit {
  const s3 = getAccountS3Credentials(accountId);
  if (s3.jurisdiction === 'default') return {};
  return { 'cf-r2-jurisdiction': s3.jurisdiction };
}

async function cloudflareFetch<T>(
  path: string,
  init?: RequestInit,
  accountId = 'general',
): Promise<T> {
  const response = await asolHttpFetch(`${CF_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getCloudflareHeaders(accountId),
      ...getJurisdictionHeader(accountId),
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as CloudflareApiResponse<T>;

  if (!response.ok || !body.success) {
    const message = body.errors?.map((e) => e.message).join('; ') || response.statusText;
    throw new CloudflareR2ApiError(
      response.status,
      `Cloudflare R2 API error (${response.status}): ${message}`,
    );
  }

  return body.result;
}

export async function getR2BucketCors(
  bucketName?: string,
  accountId = 'general',
): Promise<R2CorsRule[]> {
  const cloudflare = getAccountCloudflareCredentials(accountId);
  const s3 = getAccountS3Credentials(accountId);
  const bucket = bucketName ?? s3.bucketName;
  let result: { rules?: R2CorsRule[] };
  try {
    result = await cloudflareFetch<{ rules?: R2CorsRule[] }>(
      `/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
      undefined,
      accountId,
    );
  } catch (error) {
    if (error instanceof CloudflareR2ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
  return result.rules ?? [];
}

export async function putR2BucketCors(
  rules: R2CorsRule[],
  bucketName?: string,
  accountId = 'general',
): Promise<R2CorsRule[]> {
  const cloudflare = getAccountCloudflareCredentials(accountId);
  const s3 = getAccountS3Credentials(accountId);
  const bucket = bucketName ?? s3.bucketName;
  const result = await cloudflareFetch<{ rules?: R2CorsRule[] }>(
    `/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
    {
      method: 'PUT',
      body: JSON.stringify({ rules } satisfies R2CorsPolicy),
    },
    accountId,
  );
  return result.rules ?? rules;
}

export async function deleteR2BucketCors(
  bucketName?: string,
  accountId = 'general',
): Promise<void> {
  const cloudflare = getAccountCloudflareCredentials(accountId);
  const s3 = getAccountS3Credentials(accountId);
  const bucket = bucketName ?? s3.bucketName;
  await cloudflareFetch<null>(
    `/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
    { method: 'DELETE' },
    accountId,
  );
}

export async function verifyCloudflareApiToken(
  accountId = 'general',
): Promise<boolean> {
  const cloudflare = getAccountCloudflareCredentials(accountId);
  const response = await asolHttpFetch(
    `${CF_API_BASE}/accounts/${cloudflare.accountId}/tokens/verify`,
    { headers: { Authorization: `Bearer ${cloudflare.apiToken}` } },
  );
  const body = (await response.json()) as { success: boolean; result?: { status: string } };
  return response.ok && body.success && body.result?.status === 'active';
}
