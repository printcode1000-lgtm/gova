import type { ProductDetails, ProductRecord } from '@asol/product-core';

export interface PharmacyProductLookupPort {
  getProduct(id: string): Promise<ProductRecord | null>;
  isPharmacyProductBucket(mainCategoryId: string, subcategoryId: string): boolean;
  listProducts(uid: string): Promise<ProductRecord[]>;
  updateFixedProduct(
    id: string,
    uid: string,
    details: ProductDetails,
  ): Promise<ProductRecord | null>;
  hideFixedProduct(id: string, uid: string): Promise<boolean>;
}

type PharmacyProductLookupPortRegistry = typeof globalThis & {
  __asolPharmacyProductLookupPort?: PharmacyProductLookupPort;
};

/**
 * Keep the application registration on the process global rather than in module
 * scope. During local Next.js/Turbopack development this module can be reloaded
 * without re-running the instrumentation composition root; module-local state
 * would then reset to null and make valid requests fail with
 * "PharmacyProductLookupPort is not registered".
 */
function registry(): PharmacyProductLookupPortRegistry {
  return globalThis as PharmacyProductLookupPortRegistry;
}

export function registerPharmacyProductLookupPort(
  port: PharmacyProductLookupPort,
): void {
  registry().__asolPharmacyProductLookupPort = port;
}

export function getPharmacyProductLookupPort(): PharmacyProductLookupPort {
  const port = registry().__asolPharmacyProductLookupPort;
  if (!port) {
    throw new Error('PharmacyProductLookupPort is not registered');
  }
  return port;
}
