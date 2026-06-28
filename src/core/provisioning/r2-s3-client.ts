/**
 * Cloudflare R2 S3-compatible client — upload, delete, list, presigned URLs.
 * Uses R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY (server & scripts only).
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Config, getR2S3Credentials } from '@/core/config/server-env.values';
import { buildR2PublicObjectUrl } from './r2-cors-policy';
import type { R2ListResult, R2UploadResult } from './r2.types';

let cachedClient: S3Client | null = null;

export function createR2S3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const { accessKeyId, secretAccessKey, endpoint } = getR2S3Credentials();

  cachedClient = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  return cachedClient;
}

export async function uploadR2Object(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<R2UploadResult> {
  const { bucketName } = getR2S3Credentials();
  const { publicUrl } = getR2Config();
  const client = createR2S3Client();

  const result = await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return {
    key,
    etag: result.ETag,
    publicUrl: buildR2PublicObjectUrl(publicUrl, key),
  };
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

export async function listR2Objects(prefix = '', maxKeys = 1000): Promise<R2ListResult> {
  const { bucketName } = getR2S3Credentials();
  const client = createR2S3Client();

  const result = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix || undefined,
      MaxKeys: maxKeys,
    })
  );

  return {
    keys: (result.Contents ?? []).map((item) => item.Key).filter((key): key is string => Boolean(key)),
    isTruncated: result.IsTruncated ?? false,
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
