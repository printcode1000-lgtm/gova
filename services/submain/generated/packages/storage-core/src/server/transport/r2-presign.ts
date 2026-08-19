import {
  getOrCreateS3Client,
  GetObjectCommand,
  PutObjectCommand,
  getSignedUrl,
} from '../../adapters/s3-client.adapter';
import { getAccountS3Credentials } from '../config/account-credentials';

export async function createPresignedGetUrl(
  key: string,
  expiresInSeconds = 3600,
  accountId = 'general',
): Promise<string> {
  const creds = getAccountS3Credentials(accountId);
  const client = getOrCreateS3Client(creds);

  const command = new GetObjectCommand({
    Bucket: creds.bucketName,
    Key: key.replace(/^\/+/, ''),
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900,
  accountId = 'general',
): Promise<string> {
  const creds = getAccountS3Credentials(accountId);
  const client = getOrCreateS3Client(creds);

  const command = new PutObjectCommand({
    Bucket: creds.bucketName,
    Key: key.replace(/^\/+/, ''),
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
