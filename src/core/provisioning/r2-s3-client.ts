/**
 * Cloudflare R2 S3-compatible client — upload, delete, list, presigned URLs.
 * Uses R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (server & scripts only).
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  getProductR2Config,
  getProductR2S3Credentials,
  getR2Config,
  getR2S3Credentials,
  type R2Config,
  type R2S3Credentials,
} from '@/core/config/server-env.values';
import { buildR2PublicObjectUrl } from './r2-cors-policy';
import type { R2ListResult, R2UploadResult } from './r2.types';

let cachedClient: S3Client | null = null;
let cachedProductClient: S3Client | null = null;

function createConfiguredR2S3Client(credentials: R2S3Credentials): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: credentials.endpoint,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export function createR2S3Client(): S3Client {
  if (cachedClient) return cachedClient;

  cachedClient = createConfiguredR2S3Client(getR2S3Credentials());

  return cachedClient;
}

export function createProductR2S3Client(): S3Client {
  if (cachedProductClient) return cachedProductClient;
  cachedProductClient = createConfiguredR2S3Client(getProductR2S3Credentials());
  return cachedProductClient;
}

async function uploadConfiguredR2Object(
  config: R2Config,
  client: S3Client,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string,
): Promise<R2UploadResult> {
  const result = await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    key,
    etag: result.ETag,
    publicUrl: buildR2PublicObjectUrl(config.publicUrl, key),
  };
}

export async function uploadR2Object(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<R2UploadResult> {
  return uploadConfiguredR2Object(
    getR2Config(),
    createR2S3Client(),
    key,
    body,
    contentType,
  );
}

export async function uploadProductR2Object(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<R2UploadResult> {
  return uploadConfiguredR2Object(
    getProductR2Config(),
    createProductR2S3Client(),
    key,
    body,
    contentType,
  );
}

export async function deleteR2Object(key: string): Promise<void> {
  const { bucketName } = getR2S3Credentials();
  const client = createR2S3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

export async function deleteProductR2Object(key: string): Promise<void> {
  const { bucketName } = getProductR2S3Credentials();
  const client = createProductR2S3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

async function configuredR2ObjectExists(
  client: S3Client,
  bucketName: string,
  key: string,
): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
    return true;
  } catch (error) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;
    const name = (error as { name?: string }).name;
    if (statusCode === 404 || name === 'NotFound' || name === 'NoSuchKey') {
      return false;
    }
    throw error;
  }
}

export async function r2ObjectExists(key: string): Promise<boolean> {
  // S3 credentials only. An existence check is not an account operation, so it
  // must not pull in R2_API_TOKEN through the full config — the profiles
  // deployment resolves avatars and never holds that token.
  return configuredR2ObjectExists(
    createR2S3Client(),
    getR2S3Credentials().bucketName,
    key,
  );
}

export async function productR2ObjectExists(key: string): Promise<boolean> {
  const config = getProductR2Config();
  return configuredR2ObjectExists(
    createProductR2S3Client(),
    config.s3.bucketName,
    key,
  );
}

export async function downloadR2Object(key: string): Promise<{
  body: Uint8Array;
  contentType?: string;
  size?: number;
  lastModified?: string;
  etag?: string;
}> {
  const { bucketName } = getR2S3Credentials();
  const client = createR2S3Client();

  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
  const body = result.Body
    ? await result.Body.transformToByteArray()
    : new Uint8Array();

  return {
    body,
    contentType: result.ContentType,
    size: result.ContentLength,
    lastModified: result.LastModified?.toISOString(),
    etag: result.ETag,
  };
}

export async function downloadProductR2Object(key: string): Promise<{
  body: Uint8Array;
  contentType?: string;
  size?: number;
  lastModified?: string;
  etag?: string;
}> {
  const { bucketName } = getProductR2S3Credentials();
  const client = createProductR2S3Client();

  const result = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
  const body = result.Body
    ? await result.Body.transformToByteArray()
    : new Uint8Array();

  return {
    body,
    contentType: result.ContentType,
    size: result.ContentLength,
    lastModified: result.LastModified?.toISOString(),
    etag: result.ETag,
  };
}

export async function listR2Objects(
  prefix = '',
  maxKeys = 1000,
  continuationToken?: string,
): Promise<R2ListResult> {
  const { bucketName } = getR2S3Credentials();
  const client = createR2S3Client();

  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix || undefined,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    })
  );

  return {
    keys: (result.Contents ?? []).map((item) => item.Key).filter((key): key is string => Boolean(key)),
    objects: (result.Contents ?? [])
      .filter((item): item is typeof item & { Key: string } => Boolean(item.Key))
      .map((item) => ({
        path: item.Key,
        ...(item.LastModified
          ? { updatedAt: item.LastModified.toISOString() }
          : {}),
      })),
    isTruncated: result.IsTruncated ?? false,
    continuationToken: result.NextContinuationToken,
  };
}

export async function listProductR2Objects(
  prefix = '',
  maxKeys = 1000,
  continuationToken?: string,
): Promise<R2ListResult> {
  const { bucketName } = getProductR2S3Credentials();
  const client = createProductR2S3Client();

  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix || undefined,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    })
  );

  return {
    keys: (result.Contents ?? []).map((item) => item.Key).filter((key): key is string => Boolean(key)),
    objects: (result.Contents ?? [])
      .filter((item): item is typeof item & { Key: string } => Boolean(item.Key))
      .map((item) => ({
        path: item.Key,
        ...(item.LastModified
          ? { updatedAt: item.LastModified.toISOString() }
          : {}),
      })),
    isTruncated: result.IsTruncated ?? false,
    continuationToken: result.NextContinuationToken,
  };
}

export async function createR2PresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { bucketName } = getR2S3Credentials();
  const client = createR2S3Client();

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function createR2PresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { bucketName } = getR2S3Credentials();
  const client = createR2S3Client();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );
}
