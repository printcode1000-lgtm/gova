import type { StoredImage } from '@asol/storage-core';

export interface StoreIdentity {
  storeName: string;
  storeLogo: StoredImage | null;
  coverImage: StoredImage | null;
  storeDescription: string;
  storeStory: string;
  storeCategory: string;
  storeSpecialties: string[];
}

export type BusinessType = 'individual' | 'sole_proprietor' | 'llc' | 'corporation' | 'partnership';

export interface MerchantInfo {
  merchantName: string;
  businessType: BusinessType | '';
  companyName: string;
  registrationNumber: string;
  taxId: string;
  businessAge: number | '';
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface ContactInfo {
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  website: string;
  socialLinks: SocialLink[];
}

export interface ShippingRegion {
  country: string;
  regions: string[];
  isAvailable: boolean;
}

export interface LocationInfo {
  country: string;
  city: string;
  address: string;
  postalCode: string;
  shippingRegions: ShippingRegion[];
}

export interface FashionCategory {
  id: string;
  name: string;
  isSelected: boolean;
  subcategories: string[];
}

export interface CategoriesInfo {
  selectedCategories: FashionCategory[];
  customCategories: string[];
}

export interface BrandIdentity {
  mission: string;
  vision: string;
  uniqueSellingPoints: string[];
  targetAudience: string[];
  brandValues: string[];
}
