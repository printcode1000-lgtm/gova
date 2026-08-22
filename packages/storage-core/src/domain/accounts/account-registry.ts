import type { StorageAccountDefinition } from './account-registry.types';

const INITIAL_REGISTRY: Record<string, StorageAccountDefinition> = {
  general: {
    id: 'general',
    accountId: '8486fdbb1c87dc78481f2def0a23e043',
    email: 'print.code.1000@gmail.com',
    endpoint: 'https://8486fdbb1c87dc78481f2def0a23e043.r2.cloudflarestorage.com',
    bucketName: 'pic1',
    publicUrl: 'https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev',
    location: 'WEUR',
    jurisdiction: 'default',
    envPrefix: 'R2',
  },
  products: {
    id: 'products',
    accountId: '166409f3b449d8f1da0dee6d25ed3e08',
    email: 'bids.stories@gmail.com',
    endpoint: 'https://166409f3b449d8f1da0dee6d25ed3e08.r2.cloudflarestorage.com',
    bucketName: 'gova-storage',
    publicUrl: 'https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev',
    location: 'WEUR',
    jurisdiction: 'default',
    envPrefix: 'PRODUCT_R2',
  },
  'products-apparel-pets': {
    id: 'products-apparel-pets',
    accountId: 'f08cd5b705c3c57b1f65a220f7ef2642',
    email: 'hesham.gaber@gmail.com',
    endpoint: 'https://f08cd5b705c3c57b1f65a220f7ef2642.r2.cloudflarestorage.com',
    bucketName: 'productcat1',
    publicUrl: 'https://pub-de6cc53c347e4e6fa0dea7b79bd0ce3e.r2.dev',
    location: 'WEUR',
    jurisdiction: 'default',
    envPrefix: 'APPAREL_PETS_R2',
  },
};

const registry: Map<string, StorageAccountDefinition> = new Map(
  Object.entries(INITIAL_REGISTRY)
);

export function registerStorageAccount(account: StorageAccountDefinition): void {
  if (!account.id || !account.accountId || !account.bucketName || !account.endpoint) {
    throw new Error(`Invalid storage account definition: missing required fields`);
  }
  // Named separately from the check above, and with the account id in the message: an
  // account registered without a reachable owner is a bucket nobody can rotate keys on.
  if (!account.email || !account.email.includes('@')) {
    throw new Error(
      `Storage account "${account.id}" needs an email: the Cloudflare login that owns it.`,
    );
  }
  registry.set(account.id, account);
}

export function unregisterStorageAccount(id: string): void {
  if (id in INITIAL_REGISTRY) {
    return; // Do not unregister built-in accounts
  }
  registry.delete(id);
}

export function getStorageAccount(id: string): StorageAccountDefinition {
  const account = registry.get(id);
  if (!account) {
    throw new Error(`Unknown storage account id: "${id}"`);
  }
  return account;
}

export function getAllStorageAccounts(): StorageAccountDefinition[] {
  return Array.from(registry.values());
}

export function getStorageAccountIds(): string[] {
  return Array.from(registry.keys());
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

export function assertStorageAccountTargetFields(
  id: string,
  actual: Partial<StorageAccountDefinition>,
): void {
  const expected = getStorageAccount(id);
  const mismatches: string[] = [];

  if (actual.accountId !== undefined && actual.accountId.trim() !== expected.accountId) {
    mismatches.push('accountId');
  }
  if (
    actual.endpoint !== undefined &&
    normalizeUrl(actual.endpoint) !== normalizeUrl(expected.endpoint)
  ) {
    mismatches.push('endpoint');
  }
  if (actual.bucketName !== undefined && actual.bucketName.trim() !== expected.bucketName) {
    mismatches.push('bucketName');
  }
  if (
    actual.publicUrl !== undefined &&
    normalizeUrl(actual.publicUrl) !== normalizeUrl(expected.publicUrl)
  ) {
    mismatches.push('publicUrl');
  }
  if (
    actual.location !== undefined &&
    actual.location.trim().toUpperCase() !== expected.location
  ) {
    mismatches.push('location');
  }
  if (actual.jurisdiction !== undefined && actual.jurisdiction !== expected.jurisdiction) {
    mismatches.push('jurisdiction');
  }

  if (mismatches.length > 0) {
    throw new Error(`r2StorageTargetMismatch:${id}:${mismatches.join(',')}`);
  }
}
