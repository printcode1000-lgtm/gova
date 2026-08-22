export interface StorageAccountDefinition {
  id: string;
  accountId: string;
  /**
   * The Cloudflare login this account belongs to.
   *
   * Required, and deliberately not optional. Three of the four R2 accounts once had an
   * email recorded only on the super-admin page and the fourth had an em dash, which is
   * how an account nobody could sign into went unnoticed. An R2 account is unreachable
   * without knowing whose login owns it — the account id identifies the tenant, not the
   * human who can rotate its keys.
   *
   * `registerStorageAccount` rejects a definition without one, so the rule holds for
   * accounts added at runtime as well as the built-ins below.
   */
  email: string;
  endpoint: string;
  bucketName: string;
  publicUrl: string;
  location: string;
  jurisdiction: 'default' | 'eu' | 'fedramp';
  envPrefix: string;
  catalogUriKey?: string;
  warehouseNameKey?: string;
}

export type BuiltInStorageAccountId = 'general' | 'products' | 'products-apparel-pets';
