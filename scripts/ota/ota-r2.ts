import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  getOtaBucketName,
  type OtaManifest,
} from './ota-config';

const R2_MAX_ATTEMPTS = 6;

function retryableR2Error(error: unknown): boolean {
  const value = error as {
    name?: string;
    code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const status = value.$metadata?.httpStatusCode;
  if (status === 408 || status === 429 || (status !== undefined && status >= 500)) return true;
  const code = value.name ?? value.code ?? '';
  if (['InternalError', 'SlowDown', 'RequestTimeout', 'ServiceUnavailable', 'TimeoutError'].includes(code)) {
    return true;
  }
  return /internal error|timed? ?out|econnreset|econnrefused|socket hang up|network/i.test(
    value.message ?? '',
  );
}

function r2ErrorDetails(error: unknown): string {
  const value = error as {
    name?: string;
    code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number; requestId?: string; attempts?: number };
  };
  return [
    value.name ?? value.code ?? 'R2Error',
    value.message ?? String(error),
    value.$metadata?.httpStatusCode ? `status=${value.$metadata.httpStatusCode}` : null,
    value.$metadata?.requestId ? `requestId=${value.$metadata.requestId}` : null,
    value.$metadata?.attempts ? `sdkAttempts=${value.$metadata.attempts}` : null,
  ].filter(Boolean).join(', ');
}

async function withR2Retry<T>(operation: string, action: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= R2_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!retryableR2Error(error)) throw error;
      if (attempt === R2_MAX_ATTEMPTS) break;
      const delayMs = Math.min(20_000, 500 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 300);
      console.warn(
        `R2 ${operation} transient failure (attempt ${attempt}/${R2_MAX_ATTEMPTS}); retrying in ${delayMs}ms: ${r2ErrorDetails(error)}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`R2 ${operation} failed after retries: ${r2ErrorDetails(lastError)}`, {
    cause: lastError,
  });
}

function requireEnv(key: string, fallbackKey?: string): string {
  const value = process.env[key] ?? (fallbackKey ? process.env[fallbackKey] : undefined);
  if (!value) throw new Error(`${key}${fallbackKey ? ` or ${fallbackKey}` : ''} is required`);
  return value;
}

export function createOtaR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: requireEnv('ASOL_OTA_R2_ENDPOINT', 'R2_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('ASOL_OTA_R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('ASOL_OTA_R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
    maxAttempts: 4,
    retryMode: 'adaptive',
  });
}

export async function putOtaObject(
  client: S3Client,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  cacheControl: string,
): Promise<void> {
  await withR2Retry(`PUT ${key}`, () =>
    client.send(new PutObjectCommand({
      Bucket: getOtaBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    })),
  );
}

export async function getOtaManifestObject(client: S3Client, key: string): Promise<OtaManifest> {
  const response = await withR2Retry(`GET ${key}`, () => client.send(new GetObjectCommand({
    Bucket: getOtaBucketName(),
    Key: key,
  })));
  if (!response.Body) throw new Error(`OTA object is empty: ${key}`);
  return JSON.parse(await response.Body.transformToString()) as OtaManifest;
}

export async function getOtaObjectBytes(client: S3Client, key: string): Promise<Uint8Array> {
  const response = await withR2Retry(`GET ${key}`, () => client.send(new GetObjectCommand({
    Bucket: getOtaBucketName(),
    Key: key,
  })));
  if (!response.Body) throw new Error(`OTA object is empty: ${key}`);
  return response.Body.transformToByteArray();
}

export async function listOtaObjectKeys(client: S3Client, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const response = await withR2Retry(`LIST ${prefix}`, () => client.send(new ListObjectsV2Command({
      Bucket: getOtaBucketName(),
      Prefix: prefix,
      ContinuationToken: continuationToken,
    })));
    for (const object of response.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

export async function deleteOtaObjects(client: S3Client, keys: string[]): Promise<void> {
  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000);
    if (batch.length === 0) continue;
    await withR2Retry(`DELETE ${batch.length} objects`, () => client.send(new DeleteObjectsCommand({
      Bucket: getOtaBucketName(),
      Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
    })));
  }
}

export async function deleteOtaObject(client: S3Client, key: string): Promise<void> {
  await withR2Retry(`DELETE ${key}`, () =>
    client.send(new DeleteObjectCommand({ Bucket: getOtaBucketName(), Key: key })),
  );
}

export async function otaObjectExists(client: S3Client, key: string): Promise<boolean> {
  try {
    await withR2Retry(`HEAD ${key}`, () =>
      client.send(new HeadObjectCommand({ Bucket: getOtaBucketName(), Key: key })),
    );
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw error;
  }
}
