/**
 * Cloudflare R2 Platform API — uses R2_API_TOKEN only.
 * Bucket CORS and account-level R2 management (never in browser).
 */

import { asolHttpFetch } from '@/core/api/asol-http-transport';
import {
  getR2CloudflareCredentials,
  getR2S3Credentials,
  getOtaR2CloudflareCredentials,
  getOtaR2S3Credentials,
} from '@/core/config/server-env.values';
import type { R2CorsPolicy, R2CorsRule } from './r2.types';

export type R2PlatformAccount = 'general' | 'ota';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ message: string }>;
  result: T;
}

class CloudflareR2ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function resolveCredentials(account: R2PlatformAccount) {
  if (account === 'ota') {
    return {
      cloudflare: getOtaR2CloudflareCredentials(),
      s3: getOtaR2S3Credentials(),
    };
  }
  return {
    cloudflare: getR2CloudflareCredentials(),
    s3: getR2S3Credentials(),
  };
}

function getCloudflareHeaders(account: R2PlatformAccount): HeadersInit {
  const { cloudflare } = resolveCredentials(account);
  return {
    Authorization: `Bearer ${cloudflare.apiToken}`,
    'Content-Type': 'application/json',
  };
}

function getJurisdictionHeader(account: R2PlatformAccount): HeadersInit {
  const { s3 } = resolveCredentials(account);
  if (s3.jurisdiction === 'default') return {};
  return { 'cf-r2-jurisdiction': s3.jurisdiction };
}

async function cloudflareFetch<T>(
  path: string,
  init?: RequestInit,
  account: R2PlatformAccount = 'general',
): Promise<T> {
  const response = await asolHttpFetch(`${CF_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getCloudflareHeaders(account),
      ...getJurisdictionHeader(account),
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
  account: R2PlatformAccount = 'general',
): Promise<R2CorsRule[]> {
  const { cloudflare, s3 } = resolveCredentials(account);
  const bucket = bucketName ?? s3.bucketName;
  let result: { rules?: R2CorsRule[] };
  try {
    result = await cloudflareFetch<{ rules?: R2CorsRule[] }>(
      `/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
      undefined,
      account,
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
  account: R2PlatformAccount = 'general',
): Promise<R2CorsRule[]> {
  const { cloudflare, s3 } = resolveCredentials(account);
  const bucket = bucketName ?? s3.bucketName;
  const result = await cloudflareFetch<{ rules?: R2CorsRule[] }>(
    `/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
    {
      method: 'PUT',
      body: JSON.stringify({ rules } satisfies R2CorsPolicy),
    },
    account,
  );
  return result.rules ?? rules;
}

export async function deleteR2BucketCors(
  bucketName?: string,
  account: R2PlatformAccount = 'general',
): Promise<void> {
  const { cloudflare, s3 } = resolveCredentials(account);
  const bucket = bucketName ?? s3.bucketName;
  await cloudflareFetch<null>(
    `/accounts/${cloudflare.accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
    { method: 'DELETE' },
    account,
  );
}

export async function verifyCloudflareApiToken(
  account: R2PlatformAccount = 'general',
): Promise<boolean> {
  const { cloudflare } = resolveCredentials(account);
  const response = await asolHttpFetch(
    `${CF_API_BASE}/accounts/${cloudflare.accountId}/tokens/verify`,
    { headers: { Authorization: `Bearer ${cloudflare.apiToken}` } }
  );
  const body = (await response.json()) as { success: boolean; result?: { status: string } };
  return response.ok && body.success && body.result?.status === 'active';
}
