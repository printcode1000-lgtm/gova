export interface StorageAccountDefinition {
  id: string;
  accountId: string;
  endpoint: string;
  bucketName: string;
  publicUrl: string;
  location: string;
  jurisdiction: 'default' | 'eu' | 'fedramp';
  envPrefix: string;
  catalogUriKey?: string;
  warehouseNameKey?: string;
}

export type BuiltInStorageAccountId = 'general' | 'products';
