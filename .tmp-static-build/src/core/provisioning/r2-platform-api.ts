/**
 * Cloudflare R2 Platform API — uses R2_API_TOKEN only.
 * Bucket CORS and account-level R2 management (never in browser).
 */

import { asolHttpFetch } from '@/core/api/asol-http-transport';
import { getR2CloudflareCredentials, getR2S3Credentials } from '@/core/config/server-env.values';
import type { R2CorsPolicy, R2CorsRule } from './r2.types';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ message: string }>;
  result: T;
}

function getCloudflareHeaders(): HeadersInit {
  const { apiToken } = getR2CloudflareCredentials();
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

function getJurisdictionHeader(): HeadersInit {
  const { jurisdiction } = getR2S3Credentials();
  if (jurisdiction === 'default') return {};
  return { 'cf-r2-jurisdiction': jurisdiction };
}

async function cloudflareFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await asolHttpFetch(`${CF_API_BASE}${path}`, {
    ...init,
    headers: {
      ...getCloudflareHeaders(),
      ...getJurisdictionHeader(),
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as CloudflareApiResponse<T>;

  if (!response.ok || !body.success) {
    const message = body.errors?.map((e) => e.message).join('; ') || response.statusText;
    throw new Error(`Cloudflare R2 API error (${response.status}): ${message}`);
  }

  return body.result;
}

export async function getR2BucketCors(bucketName?: string): Promise<R2CorsRule[]> {
  const { accountId } = getR2CloudflareCredentials();
  const bucket = bucketName ?? getR2S3Credentials().bucketName;
  const result = await cloudflareFetch<{ rules?: R2CorsRule[] }>(
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`
  );
  return result.rules ?? [];
}

export async function putR2BucketCors(rules: R2CorsRule[], bucketName?: string): Promise<R2CorsRule[]> {
  const { accountId } = getR2CloudflareCredentials();
  const bucket = bucketName ?? getR2S3Credentials().bucketName;
  const result = await cloudflareFetch<{ rules?: R2CorsRule[] }>(
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
    {
      method: 'PUT',
      body: JSON.stringify({ rules } satisfies R2CorsPolicy),
    }
  );
  return result.rules ?? rules;
}

export async function deleteR2BucketCors(bucketName?: string): Promise<void> {
  const { accountId } = getR2CloudflareCredentials();
  const bucket = bucketName ?? getR2S3Credentials().bucketName;
  await cloudflareFetch<null>(
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
    { method: 'DELETE' }
  );
}

export async function verifyCloudflareApiToken(): Promise<boolean> {
  const { accountId, apiToken } = getR2CloudflareCredentials();
  const response = await asolHttpFetch(
    `${CF_API_BASE}/accounts/${accountId}/tokens/verify`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  const body = (await response.json()) as { success: boolean; result?: { status: string } };
  return response.ok && body.success && body.result?.status === 'active';
}
