export type SellerDiscountType =
  | "quantity"
  | "bundle"
  | "free_shipping"
  | "coupon"
  | "free_gift"
  | "automatic"
  | "order_total";

export type SellerDiscountStatus = "draft" | "active" | "paused" | "expired";
export type SellerDiscountValueType =
  | "percentage"
  | "fixed_amount"
  | "fixed_bundle_price"
  | "free_shipping"
  | "free_gift";

export interface SellerDiscountScope {
  productIds: string[];
  categoryIds: string[];
  excludedProductIds: string[];
  bundleProductIds: string[];
  giftProductId: string;
}

export interface SellerDiscountConditions {
  minSubtotalMinor: number;
  minQuantity: number;
  buyQuantity: number;
  getQuantity: number;
  firstOrderOnly: boolean;
  followersOnly: boolean;
  appOnly: boolean;
}

export interface SellerDiscountUsageLimits {
  total: number;
  perBuyer: number;
}

export interface SellerDiscountRule {
  id: string;
  sellerUid: string;
  type: SellerDiscountType;
  title: string;
  description: string;
  status: SellerDiscountStatus;
  priority: number;
  combinable: boolean;
  startsAt: string;
  endsAt: string;
  couponCode: string;
  valueType: SellerDiscountValueType;
  value: number;
  maxDiscountMinor: number;
  scope: SellerDiscountScope;
  conditions: SellerDiscountConditions;
  usageLimits: SellerDiscountUsageLimits;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSellerDiscountInput
  extends Omit<SellerDiscountRule, "createdAt" | "updatedAt"> {}

export interface SellerDiscountUsageSummary {
  discountId: string;
  totalUses: number;
  buyerUses: number;
}

export interface DiscountCartItem {
  id: string;
  productId: string;
  sellerId: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  mainCategoryId: string;
}

export interface DiscountBuyerContext {
  buyerUid?: string;
  couponCodes?: string[];
  isFollower?: boolean;
  isFirstOrder?: boolean;
  isApp?: boolean;
}

export interface AppliedSellerDiscount {
  discountId: string;
  sellerUid: string;
  type: SellerDiscountType;
  title: string;
  discountMinor: number;
  shippingDiscountMinor: number;
  giftProductId: string;
  affectedItemIds: string[];
  reason: string;
}

export interface SellerDiscountCalculation {
  sellerUid: string;
  subtotalMinor: number;
  discountMinor: number;
  shippingDiscountMinor: number;
  totalAfterDiscountMinor: number;
  applied: AppliedSellerDiscount[];
  rejected: Array<{ discountId: string; title: string; reason: string }>;
}

export interface SellerDiscountCartQuote {
  sellers: SellerDiscountCalculation[];
  subtotalMinor: number;
  discountMinor: number;
  shippingDiscountMinor: number;
  totalAfterDiscountMinor: number;
}

export const EMPTY_SELLER_DISCOUNT_SCOPE: SellerDiscountScope = {
  productIds: [],
  categoryIds: [],
  excludedProductIds: [],
  bundleProductIds: [],
  giftProductId: "",
};

export const EMPTY_SELLER_DISCOUNT_CONDITIONS: SellerDiscountConditions = {
  minSubtotalMinor: 0,
  minQuantity: 0,
  buyQuantity: 0,
  getQuantity: 0,
  firstOrderOnly: false,
  followersOnly: false,
  appOnly: false,
};

export const EMPTY_SELLER_DISCOUNT_USAGE_LIMITS: SellerDiscountUsageLimits = {
  total: 0,
  perBuyer: 0,
};

export function createEmptySellerDiscount(
  sellerUid: string,
  type: SellerDiscountType = "order_total",
): SellerDiscountRule {
  const now = new Date().toISOString();
  return {
    id: `discount_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    sellerUid,
    type,
    title: "",
    description: "",
    status: "draft",
    priority: 100,
    combinable: false,
    startsAt: "",
    endsAt: "",
    couponCode: "",
    valueType:
      type === "free_shipping"
        ? "free_shipping"
        : type === "free_gift"
          ? "free_gift"
          : "percentage",
    value: type === "free_shipping" || type === "free_gift" ? 0 : 10,
    maxDiscountMinor: 0,
    scope: { ...EMPTY_SELLER_DISCOUNT_SCOPE },
    conditions: { ...EMPTY_SELLER_DISCOUNT_CONDITIONS },
    usageLimits: { ...EMPTY_SELLER_DISCOUNT_USAGE_LIMITS },
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function formatMinorCurrency(value: number, locale: "ar" | "en" = "ar") {
  return `${(Math.max(0, value) / 100).toLocaleString(locale === "ar" ? "ar-EG" : "en-US")} ${locale === "ar" ? "ج.م" : "EGP"}`;
}
