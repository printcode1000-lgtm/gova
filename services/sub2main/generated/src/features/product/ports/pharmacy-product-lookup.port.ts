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

let pharmacyProductLookupPort: PharmacyProductLookupPort | null = null;

export function registerPharmacyProductLookupPort(
  port: PharmacyProductLookupPort,
): void {
  pharmacyProductLookupPort = port;
}

export function getPharmacyProductLookupPort(): PharmacyProductLookupPort {
  if (!pharmacyProductLookupPort) {
    throw new Error('PharmacyProductLookupPort is not registered');
  }
  return pharmacyProductLookupPort;
}
