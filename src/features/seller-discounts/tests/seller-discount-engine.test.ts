import assert from "node:assert/strict";
import {
  calculateCartDiscounts,
  calculateSellerDiscounts,
  createEmptySellerDiscount,
  type DiscountCartItem,
  type SellerDiscountConditions,
  type SellerDiscountRule,
  type SellerDiscountScope,
  type SellerDiscountUsageLimits,
} from "@/features/seller-discounts";
import {
  majorCurrencyInputToMinor,
  minorCurrencyToInputValue,
} from "@asol/format-core";

type RuleOverrides = Omit<
  Partial<SellerDiscountRule>,
  "conditions" | "scope" | "usageLimits"
> & {
  conditions?: Partial<SellerDiscountConditions>;
  scope?: Partial<SellerDiscountScope>;
  usageLimits?: Partial<SellerDiscountUsageLimits>;
};

function item(
  productId: string,
  unitPriceMinor: number,
  quantity = 1,
  sellerId = "seller-a",
  mainCategoryId = "cat-a",
): DiscountCartItem {
  return {
    id: `${productId}:${sellerId}`,
    productId,
    sellerId,
    name: productId,
    quantity,
    unitPriceMinor,
    mainCategoryId,
  };
}

function rule(overrides: RuleOverrides = {}): SellerDiscountRule {
  const base = createEmptySellerDiscount(
    overrides.sellerUid ?? "seller-a",
    overrides.type ?? "order_total",
  );
  return {
    ...base,
    id: overrides.id ?? `discount-${Math.random()}`,
    title: overrides.title ?? "Discount",
    status: "active",
    combinable: true,
    ...overrides,
    scope: { ...base.scope, ...overrides.scope },
    conditions: { ...base.conditions, ...overrides.conditions },
    usageLimits: { ...base.usageLimits, ...overrides.usageLimits },
  };
}

assert.equal(minorCurrencyToInputValue(0), "");
assert.equal(minorCurrencyToInputValue(25_050), "250.5");
assert.equal(majorCurrencyInputToMinor("250.50"), 25_050);
assert.equal(majorCurrencyInputToMinor("0.009"), 1);
assert.equal(majorCurrencyInputToMinor("-20"), 0);

// Baseline: the major offer families can coexist in one seller quote.
const baselineItems = [item("p1", 50_000, 2), item("p2", 40_000)];
const baseline = calculateCartDiscounts({
  items: baselineItems,
  context: { buyerUid: "buyer-a", couponCodes: ["welcome10"], isApp: true },
  discounts: [
    rule({
      id: "total",
      type: "order_total",
      valueType: "percentage",
      value: 10,
      conditions: { minSubtotalMinor: 100_000 },
    }),
    rule({
      id: "coupon",
      type: "coupon",
      couponCode: "WELCOME10",
      valueType: "fixed_amount",
      value: 5_000,
    }),
    rule({ id: "ship", type: "free_shipping", valueType: "free_shipping" }),
    rule({
      id: "gift",
      type: "free_gift",
      valueType: "free_gift",
      scope: { giftProductId: "gift-1" },
    }),
  ],
});
assert.equal(baseline.subtotalMinor, 140_000);
assert.equal(baseline.discountMinor, 19_000);
assert.equal(baseline.sellers[0]?.applied.length, 4);
assert.equal(baseline.sellers[0]?.applied.some((d) => d.giftProductId === "gift-1"), true);
assert.equal(baseline.shippingDiscountMinor, Number.MAX_SAFE_INTEGER);

// Regression: a free gift with combinable=false is still a real benefit and
// must not disappear merely because its monetary discount is zero.
const giftOnly = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p1", 10_000)],
  discounts: [
    rule({
      id: "gift-only",
      type: "free_gift",
      valueType: "free_gift",
      combinable: false,
      scope: { giftProductId: "gift-2" },
    }),
  ],
});
assert.deepEqual(giftOnly.applied.map((d) => d.discountId), ["gift-only"]);
assert.equal(giftOnly.applied[0]?.giftProductId, "gift-2");

// Regression: a fixed-price bundle A+B must never use an unrelated C in its
// discount base. Two complete groups are priced as two bundles.
const bundle = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("a", 10_000, 2), item("b", 20_000, 2), item("c", 100_000)],
  discounts: [
    rule({
      id: "bundle-ab",
      type: "bundle",
      valueType: "fixed_bundle_price",
      value: 25_000,
      scope: { bundleProductIds: ["a", "b"] },
    }),
  ],
});
assert.equal(bundle.discountMinor, 10_000);
assert.deepEqual(bundle.applied[0]?.affectedItemIds.sort(), ["a:seller-a", "b:seller-a"]);

const missingBundle = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("a", 10_000)],
  discounts: [
    rule({
      id: "bundle-missing",
      type: "bundle",
      valueType: "fixed_bundle_price",
      value: 5_000,
      scope: { bundleProductIds: ["a", "b"] },
    }),
  ],
});
assert.equal(missingBundle.applied.length, 0);
assert.equal(missingBundle.rejected[0]?.reason, "bundle_missing_items");

// Buy 3 / discount 1 means the cheapest one unit in each qualifying group is
// the discount base. Here 50% of the 10 EGP unit is 5 EGP.
const quantityGet = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("cheap", 1_000), item("expensive", 2_000, 2)],
  discounts: [
    rule({
      id: "buy3-get1",
      type: "quantity",
      valueType: "percentage",
      value: 50,
      conditions: { buyQuantity: 3, getQuantity: 1 },
    }),
  ],
});
assert.equal(quantityGet.discountMinor, 500);

const invalidQuantity = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 1_000, 5)],
  discounts: [rule({ id: "quantity-no-threshold", type: "quantity", conditions: { buyQuantity: 0 } })],
});
assert.equal(invalidQuantity.rejected[0]?.reason, "quantity_threshold_required");

// Percentages are capped at 100% even if a malformed legacy row is higher.
const percentCap = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 12_345)],
  discounts: [rule({ id: "too-high", valueType: "percentage", value: 250 })],
});
assert.equal(percentCap.discountMinor, 12_345);

// Audience eligibility is seller-specific in a multi-seller cart.
const follower = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 10_000)],
  context: { isFollowerBySeller: { "seller-a": true } },
  discounts: [rule({ id: "followers", valueType: "percentage", value: 10, conditions: { followersOnly: true } })],
});
assert.equal(follower.discountMinor, 1_000);
const notFollower = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 10_000)],
  context: { isFollowerBySeller: { "seller-a": false } },
  discounts: [rule({ id: "followers", valueType: "percentage", value: 10, conditions: { followersOnly: true } })],
});
assert.equal(notFollower.rejected[0]?.reason, "followers_only");

const firstOrderRejected = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 10_000)],
  context: { isFirstOrder: false },
  discounts: [rule({ id: "first", valueType: "percentage", value: 10, conditions: { firstOrderOnly: true } })],
});
assert.equal(firstOrderRejected.rejected[0]?.reason, "first_order_only");
const appRejected = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 10_000)],
  context: { isApp: false },
  discounts: [rule({ id: "app", valueType: "percentage", value: 10, conditions: { appOnly: true } })],
});
assert.equal(appRejected.rejected[0]?.reason, "app_only");

// Time and usage limits reject before calculation.
const now = Date.now();
const future = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 10_000)],
  discounts: [rule({ id: "future", startsAt: new Date(now + 60_000).toISOString(), value: 10 })],
});
assert.equal(future.rejected[0]?.reason, "inactive");
const expired = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 10_000)],
  discounts: [rule({ id: "expired", endsAt: new Date(now - 60_000).toISOString(), value: 10 })],
});
assert.equal(expired.rejected[0]?.reason, "inactive");
const usageLimited = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 10_000)],
  context: { buyerUid: "buyer-a" },
  usage: [{ discountId: "limited", totalUses: 5, buyerUses: 1 }],
  discounts: [rule({ id: "limited", value: 10, usageLimits: { total: 5, perBuyer: 1 } })],
});
assert.equal(usageLimited.rejected[0]?.reason, "usage_limit_total");

// When benefits tie, higher priority wins, matching the editor description.
const priorityTie = calculateSellerDiscounts({
  sellerUid: "seller-a",
  items: [item("p", 10_000)],
  discounts: [
    rule({ id: "low-priority", priority: 10, combinable: false, valueType: "fixed_amount", value: 1_000 }),
    rule({ id: "high-priority", priority: 200, combinable: false, valueType: "fixed_amount", value: 1_000 }),
  ],
});
assert.equal(priorityTie.applied[0]?.discountId, "high-priority");

console.log("seller-discount-engine: pricing, eligibility, stacking, bundle, gift and quantity regressions passed");
