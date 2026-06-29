import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  getOtaBucketName,
  type OtaManifest,
} from './ota-config';

function requireEnv(key: string, fallbackKey?: string): string {
  const value = process.env[key] ?? (fallbackKey ? process.env[fallbackKey] : undefined);
  if (!value) throw new Error(`${key}${fallbackKey ? ` or ${fallbackKey}` : ''} is required`);
  return value;
}

export function createOtaR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: requireEnv('GOVA_OTA_R2_ENDPOINT', 'R2_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('GOVA_OTA_R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('GOVA_OTA_R2_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
  });
}

export async function putOtaObject(
  client: S3Client,
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
  cacheControl: string,
): Promise<void> {
  await client.send(new PutObjectCommand({
    Bucket: getOtaBucketName(),
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  }));
}

export async function getOtaManifestObject(client: S3Client, key: string): Promise<OtaManifest> {
  const response = await client.send(new GetObjectCommand({
    Bucket: getOtaBucketName(),
    Key: key,
  }));
  if (!response.Body) throw new Error(`OTA object is empty: ${key}`);
  return JSON.parse(await response.Body.transformToString()) as OtaManifest;
}

export async function deleteOtaObject(client: S3Client, key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: getOtaBucketName(), Key: key }));
}

export async function otaObjectExists(client: S3Client, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: getOtaBucketName(), Key: key }));
    return true;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw error;
  }
}
