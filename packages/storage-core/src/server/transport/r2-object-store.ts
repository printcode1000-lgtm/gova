import {
  getOrCreateS3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '../../adapters/s3-client.adapter';
import { getAccountPublicBaseUrl, getAccountS3Credentials } from '../config/account-credentials';
import { StorageCoreError } from '../../errors/storage-core-error';

function cleanKey(key: string): string {
  return key.replace(/^\/+/, '');
}

export function buildR2PublicObjectUrl(key: string, accountId = 'general'): string {
  // The public base URL only. Demanding the full credential set here forced a
  // read-only account to hold write keys — see `getAccountPublicBaseUrl`.
  const base = getAccountPublicBaseUrl(accountId).replace(/\/+$/, '');
  return `${base}/${cleanKey(key)}`;
}

export async function uploadR2Object(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType = 'application/octet-stream',
  accountId = 'general',
): Promise<string> {
  const creds = getAccountS3Credentials(accountId);
  const client = getOrCreateS3Client(creds);
  const cleanedKey = cleanKey(key);

  let payload: Buffer | Uint8Array;
  if (typeof body === 'string') {
    payload = Buffer.from(body, 'utf-8');
  } else if (body instanceof Uint8Array || Buffer.isBuffer(body)) {
    payload = body;
  } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
    payload = Buffer.from(await body.arrayBuffer());
  } else {
    throw new StorageCoreError(`Unsupported upload payload body type for key ${key}`);
  }

  await client.send(
    new PutObjectCommand({
      Bucket: creds.bucketName,
      Key: cleanedKey,
      Body: payload,
      ContentType: contentType,
    }),
  );

  return buildR2PublicObjectUrl(cleanedKey, accountId);
}

export async function deleteR2Object(key: string, accountId = 'general'): Promise<void> {
  const creds = getAccountS3Credentials(accountId);
  const client = getOrCreateS3Client(creds);

  await client.send(
    new DeleteObjectCommand({
      Bucket: creds.bucketName,
      Key: cleanKey(key),
    }),
  );
}

export async function r2ObjectExists(key: string, accountId = 'general'): Promise<boolean> {
  const creds = getAccountS3Credentials(accountId);
  const client = getOrCreateS3Client(creds);

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: creds.bucketName,
        Key: cleanKey(key),
      }),
    );
    return true;
  } catch (error: unknown) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

export async function downloadR2Object(key: string, accountId = 'general'): Promise<Buffer> {
  const creds = getAccountS3Credentials(accountId);
  const client = getOrCreateS3Client(creds);

  const response = await client.send(
    new GetObjectCommand({
      Bucket: creds.bucketName,
      Key: cleanKey(key),
    }),
  );

  if (!response.Body) {
    throw new StorageCoreError(`R2 Object ${key} has empty body`);
  }

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

export async function listR2Objects(
  prefix?: string,
  accountId = 'general',
): Promise<Array<{ key: string; size: number; lastModified?: Date }>> {
  const creds = getAccountS3Credentials(accountId);
  const client = getOrCreateS3Client(creds);

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: creds.bucketName,
      Prefix: prefix ? cleanKey(prefix) : undefined,
    }),
  );

  return (response.Contents ?? []).map((item) => ({
    key: item.Key ?? '',
    size: item.Size ?? 0,
    lastModified: item.LastModified,
  }));
}
