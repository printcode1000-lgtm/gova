import type { ReactNode } from 'react';

import type { ProductDetails } from '@asol/product-core';
import type { ProductComponentConfig } from '@asol/product-style-core';

import type { ProductMode } from '../presentation/product-mode';

export interface PharmacySpecsSlotProps {
  mode: ProductMode;
  config: ProductComponentConfig;
  details: ProductDetails;
  ownerUid?: string;
  onChange: (details: ProductDetails) => void;
}

export type PharmacySpecsSlot = (props: PharmacySpecsSlotProps) => ReactNode;

let pharmacySpecsSlot: PharmacySpecsSlot | null = null;

export function registerPharmacySpecsSlot(slot: PharmacySpecsSlot): void {
  pharmacySpecsSlot = slot;
}

export function getPharmacySpecsSlot(): PharmacySpecsSlot {
  if (!pharmacySpecsSlot) {
    throw new Error('PharmacySpecsSlot is not registered');
  }
  return pharmacySpecsSlot;
}
