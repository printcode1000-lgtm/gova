import type { ProductRecord } from "@/features/product/entities/product.entity";

export const PHARMACY_MAIN_CATEGORY_ID = "20";
export const PHARMACY_SUBCATEGORY_ID = "204";
export const PHARMACY_PRICE_LABEL = "السعر التجاري";
export const PHARMACY_FIXED_PRODUCT_PREFIX = "pharmacy-fixed";

export type PharmacyOverrideStatus = "visible" | "hidden" | "custom";

export interface PharmacyProfileCategoryOverride {
  id: string;
  uid: string;
  fixedCategoryId: number | null;
  nameAr: string | null;
  nameEn: string | null;
  icon: string | null;
  status: PharmacyOverrideStatus;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyProfileSubcategoryOverride {
  id: string;
  uid: string;
  fixedSubcategoryId: number | null;
  parentCategoryId: string;
  nameAr: string | null;
  nameEn: string | null;
  status: PharmacyOverrideStatus;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyProfileProductOverride {
  id: string;
  uid: string;
  fixedProductId: number | null;
  parentSubcategoryId: string;
  nameAr: string | null;
  nameEn: string | null;
  description: string | null;
  imageUrl: string | null;
  imageKey: string | null;
  formId: string | null;
  formNameAr: string | null;
  strengthId: string | null;
  strengthValue: string | null;
  prescriptionRequired: boolean | null;
  priceText: string | null;
  priceMinor: number | null;
  status: PharmacyOverrideStatus;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyProfileProduct extends ProductRecord {
  pharmacy: {
    fixedProductId: number | null;
    fixedSubcategoryId: number | null;
    fixedCategoryId: number | null;
    isFixedBase: boolean;
  };
}

export interface PharmacyFixedProductIdentity {
  uid: string;
  fixedProductId: number;
}
