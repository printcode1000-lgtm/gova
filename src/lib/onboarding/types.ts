import type { z } from 'zod';

export type OnboardingStep =
  | 'store-identity'
  | 'merchant-info'
  | 'contact-info'
  | 'location'
  | 'categories'
  | 'shipping'
  | 'returns'
  | 'brand-identity'
  | 'products'
  | 'collections'
  | 'verification'
  | 'marketing';

export interface OnboardingStepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  icon: string;
  isComplete: boolean;
  isRequired: boolean;
}

import type { StoredImage } from '@/core/storage/types/stored-image.types';

/** Stored image reference — extends StoredImage with optional legacy blob-upload fields. */
export interface UploadedImage extends Omit<StoredImage, 'imageKey'> {
  imageKey?: string;
  id?: string;
  preview?: string;
}

export interface StoreIdentity {
  storeName: string;
  storeLogo: UploadedImage | null;
  coverImage: UploadedImage | null;
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
  handle: string;
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

export type ShippingProvider = 'standard' | 'express' | 'same_day' | 'pickup' | 'international';

export interface ShippingMethod {
  id: string;
  provider: ShippingProvider;
  name: string;
  deliveryDays: { min: number; max: number };
  fee: number;
  freeThreshold: number | null;
  isActive: boolean;
}

export interface ShippingInfo {
  methods: ShippingMethod[];
  defaultMethod: string;
  pickupAvailable: boolean;
  pickupAddress: string;
}

export type ReturnPolicyType = 'no_returns' | 'exchange_only' | 'full_returns' | 'store_credit';

export interface ReturnPolicy {
  policyType: ReturnPolicyType;
  returnPeriod: number;
  exchangePeriod: number;
  policyDescription: string;
  conditions: string[];
  refundMethod: 'original' | 'store_credit' | 'choice';
}

export interface BrandIdentity {
  mission: string;
  vision: string;
  uniqueSellingPoints: string[];
  targetAudience: string[];
  brandValues: string[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  material: string;
  price: number;
 discountPrice: number | null;
  inventory: number;
  images: UploadedImage[];
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  basePrice: number;
  discountPrice: number | null;
  image: UploadedImage | null;
  variants: ProductVariant[];
  isActive: boolean;
  isFeatured: boolean;
}

export interface ProductsInfo {
  products: Product[];
  draftProducts: Product[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImage: UploadedImage | null;
  productIds: string[];
  isActive: boolean;
  isFeatured: boolean;
}

export interface CollectionsInfo {
  collections: Collection[];
}

export type DocumentType = 'business_license' | 'tax_certificate' | 'id_card' | 'bank_statement';

export interface VerificationDocument {
  id: string;
  type: DocumentType;
  file: UploadedImage;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

export interface VerificationInfo {
  documents: VerificationDocument[];
  isVerified: boolean;
  requestedBadges: string[];
  verificationStatus: 'not_started' | 'pending' | 'verified' | 'rejected';
}

export interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string;
  image: UploadedImage | null;
  linkUrl: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface DiscountCampaign {
  id: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  appliesTo: 'all' | 'categories' | 'products';
  applicableItems: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CouponCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
}

export interface MarketingInfo {
  featuredProductIds: string[];
  banners: PromotionalBanner[];
  campaigns: DiscountCampaign[];
  coupons: CouponCode[];
}

export interface OnboardingData {
  storeIdentity: StoreIdentity;
  merchantInfo: MerchantInfo;
  contactInfo: ContactInfo;
  location: LocationInfo;
  categories: CategoriesInfo;
  shipping: ShippingInfo;
  returns: ReturnPolicy;
  brandIdentity: BrandIdentity;
  products: ProductsInfo;
  collections: CollectionsInfo;
  verification: VerificationInfo;
  marketing: MarketingInfo;
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: OnboardingData;
  isDirty: boolean;
  lastSaved: string | null;
  errors: Record<string, string>;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
