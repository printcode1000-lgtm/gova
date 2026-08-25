import type { ProductDetails } from '@asol/product-core';

export interface PharmacyInitialDetailsPort {
  createInitialDetails(categoryId: string, subcategoryId: string): ProductDetails;
}

let pharmacyInitialDetailsPort: PharmacyInitialDetailsPort | null = null;

export function registerPharmacyInitialDetailsPort(
  port: PharmacyInitialDetailsPort,
): void {
  pharmacyInitialDetailsPort = port;
}

export function getPharmacyInitialDetailsPort(): PharmacyInitialDetailsPort {
  if (!pharmacyInitialDetailsPort) {
    throw new Error('PharmacyInitialDetailsPort is not registered');
  }
  return pharmacyInitialDetailsPort;
}
