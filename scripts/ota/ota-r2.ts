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

export async function getOtaObjectBytes(client: S3Client, key: string): Promise<Uint8Array> {
  const response = await client.send(new GetObjectCommand({
    Bucket: getOtaBucketName(),
    Key: key,
  }));
  if (!response.Body) throw new Error(`OTA object is empty: ${key}`);
  return response.Body.transformToByteArray();
}

export async function listOtaObjectKeys(client: S3Client, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: getOtaBucketName(),
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
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
    await client.send(new DeleteObjectsCommand({
      Bucket: getOtaBucketName(),
      Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
    }));
  }
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
