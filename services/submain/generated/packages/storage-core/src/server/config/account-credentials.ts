import {
  getStorageAccount,
  assertStorageAccountTargetFields,
} from '../../domain/accounts/account-registry';
import { StorageCoreError } from '../../errors/storage-core-error';

export interface AccountS3Credentials {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucketName: string;
  location: string;
  jurisdiction: 'default' | 'eu' | 'fedramp';
  publicUrl: string;
}

export interface AccountCloudflareCredentials {
  accountId: string;
  apiToken: string;
}

export interface AccountConfig {
  cloudflare: AccountCloudflareCredentials;
  s3: AccountS3Credentials;
  publicUrl: string;
  catalogUri: string;
  warehouseName: string;
}

function readEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * The public base URL of an account's bucket, and nothing else.
 *
 * Turning a stored key into a public URL is a read that needs one value. It went
 * through `getAccountS3Credentials`, which demands the access key and the secret
 * as well — so an account that only renders images had to hold the credentials
 * that can overwrite them. `asol-submain` renders the home surfaces and holds no
 * R2 write credential, and every advertisements read answered
 * `StorageCoreError: Missing required credentials for account "general": R2_ENDPOINT`.
 *
 * Least privilege is the point of splitting the accounts: a read must not demand
 * the credentials of a write. Signing and uploading still go through the full
 * credential set below.
 */
export function getAccountPublicBaseUrl(accountId: string): string {
  const account = getStorageAccount(accountId);
  const publicUrl = readEnv(`${account.envPrefix}_PUBLIC_URL`);
  if (!publicUrl) {
    throw StorageCoreError.missingCredentials(accountId, [`${account.envPrefix}_PUBLIC_URL`]);
  }
  return publicUrl;
}

export function getAccountS3Credentials(accountId: string): AccountS3Credentials {
  const account = getStorageAccount(accountId);
  const p = account.envPrefix;

  const accessKeyId = readEnv(`${p}_ACCESS_KEY_ID`);
  const secretAccessKey = readEnv(`${p}_SECRET_ACCESS_KEY`);
  const endpoint = readEnv(`${p}_ENDPOINT`);
  const bucketName = readEnv(`${p}_BUCKET_NAME`);
  const publicUrl = readEnv(`${p}_PUBLIC_URL`);

  const missing: string[] = [];
  if (!accessKeyId) missing.push(`${p}_ACCESS_KEY_ID`);
  if (!secretAccessKey) missing.push(`${p}_SECRET_ACCESS_KEY`);
  if (!endpoint) missing.push(`${p}_ENDPOINT`);
  if (!bucketName) missing.push(`${p}_BUCKET_NAME`);
  if (!publicUrl) missing.push(`${p}_PUBLIC_URL`);

  if (missing.length > 0) {
    throw StorageCoreError.missingCredentials(accountId, missing);
  }

  const location = readEnv(`${p}_LOCATION`) ?? account.location;
  const jurisdiction = (readEnv(`${p}_JURISDICTION`) ?? account.jurisdiction) as AccountS3Credentials['jurisdiction'];

  const credentials: AccountS3Credentials = {
    accountId: account.accountId,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    endpoint: endpoint!,
    bucketName: bucketName!,
    location,
    jurisdiction,
    publicUrl: publicUrl!,
  };

  assertStorageAccountTargetFields(accountId, credentials);
  return credentials;
}

export function getAccountCloudflareCredentials(accountId: string): AccountCloudflareCredentials {
  const account = getStorageAccount(accountId);
  const p = account.envPrefix;

  const accountIdEnv = readEnv(`${p}_ACCOUNT_ID`) ?? account.accountId;
  const apiToken = readEnv(`${p}_API_TOKEN`);

  const missing: string[] = [];
  if (!apiToken) missing.push(`${p}_API_TOKEN`);

  if (missing.length > 0) {
    throw StorageCoreError.missingCredentials(accountId, missing);
  }

  const credentials: AccountCloudflareCredentials = {
    accountId: accountIdEnv,
    apiToken: apiToken!,
  };

  assertStorageAccountTargetFields(accountId, { accountId: credentials.accountId });
  return credentials;
}

export function getAccountConfig(accountId: string): AccountConfig {
  const cloudflare = getAccountCloudflareCredentials(accountId);
  const s3 = getAccountS3Credentials(accountId);
  const account = getStorageAccount(accountId);
  const p = account.envPrefix;

  return {
    cloudflare,
    s3,
    publicUrl: s3.publicUrl,
    catalogUri: readEnv(`${p}_CATALOG_URI`) ?? '',
    warehouseName: readEnv(`${p}_WAREHOUSE_NAME`) ?? '',
  };
}
