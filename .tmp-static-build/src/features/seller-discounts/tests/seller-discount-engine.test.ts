import assert from "node:assert/strict";
import {
  calculateCartDiscounts,
  createEmptySellerDiscount,
  type DiscountCartItem,
  type SellerDiscountRule,
} from "@/features/seller-discounts";

const items: DiscountCartItem[] = [
  {
    id: "p1:seller-a",
    productId: "p1",
    sellerId: "seller-a",
    name: "P1",
    quantity: 2,
    unitPriceMinor: 50_000,
    mainCategoryId: "cat-a",
  },
  {
    id: "p2:seller-a",
    productId: "p2",
    sellerId: "seller-a",
    name: "P2",
    quantity: 1,
    unitPriceMinor: 40_000,
    mainCategoryId: "cat-a",
  },
];

function rule(
  overrides: Partial<SellerDiscountRule>,
): SellerDiscountRule {
  return {
    ...createEmptySellerDiscount("seller-a", overrides.type ?? "order_total"),
    id: overrides.id ?? `discount-${Math.random()}`,
    title: overrides.title ?? "Discount",
    status: "active",
    combinable: true,
    ...overrides,
  };
}

const quote = calculateCartDiscounts({
  items,
  context: {
    buyerUid: "buyer-a",
    couponCodes: ["WELCOME10"],
    isApp: true,
  },
  discounts: [
    rule({
      id: "total",
      title: "10% order total",
      type: "order_total",
      valueType: "percentage",
      value: 10,
      conditions: {
        minSubtotalMinor: 100_000,
        minQuantity: 0,
        buyQuantity: 0,
        getQuantity: 0,
        firstOrderOnly: false,
        followersOnly: false,
        appOnly: false,
      },
    }),
    rule({
      id: "coupon",
      title: "Coupon",
      type: "coupon",
      couponCode: "WELCOME10",
      valueType: "fixed_amount",
      value: 5_000,
    }),
    rule({
      id: "ship",
      title: "Free shipping",
      type: "free_shipping",
      valueType: "free_shipping",
    }),
    rule({
      id: "gift",
      title: "Gift",
      type: "free_gift",
      valueType: "free_gift",
      scope: {
        productIds: [],
        categoryIds: [],
        excludedProductIds: [],
        bundleProductIds: [],
        giftProductId: "gift-1",
      },
    }),
  ],
});

assert.equal(quote.subtotalMinor, 140_000);
assert.equal(quote.discountMinor, 19_000);
assert.equal(quote.sellers[0]?.applied.length, 4);
assert.equal(
  quote.sellers[0]?.applied.some((discount) => discount.giftProductId === "gift-1"),
  true,
);
assert.equal(quote.shippingDiscountMinor, Number.MAX_SAFE_INTEGER);

console.log("seller-discount-engine: all discount types in quote path verified");
