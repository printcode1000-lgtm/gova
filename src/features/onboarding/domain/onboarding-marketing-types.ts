import type { UploadedImage } from './onboarding-upload-types';

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
