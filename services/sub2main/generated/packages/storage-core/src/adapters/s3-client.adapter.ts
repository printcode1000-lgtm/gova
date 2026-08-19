import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AccountS3Credentials } from '../server/config/account-credentials';

const clientCache = new Map<string, S3Client>();

export function getOrCreateS3Client(credentials: AccountS3Credentials): S3Client {
  const cacheKey = `${credentials.accountId}:${credentials.endpoint}:${credentials.bucketName}`;
  const existing = clientCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: credentials.endpoint,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    },
  });

  clientCache.set(cacheKey, client);
  return client;
}

export {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  getSignedUrl,
};
