export type { SellerDiscountScope, SellerDiscountConditions, SellerDiscountUsageLimits, SellerDiscountRule, SaveSellerDiscountInput, SellerDiscountUsageSummary, DiscountCartItem, DiscountBuyerContext, AppliedSellerDiscount, SellerDiscountCalculation, SellerDiscountCartQuote, SellerDiscountType, SellerDiscountStatus, SellerDiscountValueType } from "@asol/data-core/seller-discounts/entities";
export { EMPTY_SELLER_DISCOUNT_SCOPE, EMPTY_SELLER_DISCOUNT_CONDITIONS, EMPTY_SELLER_DISCOUNT_USAGE_LIMITS, createEmptySellerDiscount } from "@asol/data-core/seller-discounts/entities";

import { formatPlainMoneyMinor } from "@asol/format-core";
export function formatMinorCurrency(value: number, locale: "ar" | "en" = "ar") {
  return formatPlainMoneyMinor(value, locale);
}
