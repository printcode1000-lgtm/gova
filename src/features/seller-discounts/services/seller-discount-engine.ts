import type {
  AppliedSellerDiscount,
  DiscountBuyerContext,
  DiscountCartItem,
  SellerDiscountCalculation,
  SellerDiscountCartQuote,
  SellerDiscountRule,
  SellerDiscountUsageSummary,
} from "../domain/seller-discount.entity";

function isActiveNow(rule: SellerDiscountRule, now = new Date()): boolean {
  if (rule.status !== "active") return false;
  if (rule.startsAt && new Date(rule.startsAt) > now) return false;
  if (rule.endsAt && new Date(rule.endsAt) < now) return false;
  return true;
}

function itemInScope(rule: SellerDiscountRule, item: DiscountCartItem): boolean {
  if (rule.scope.excludedProductIds.includes(item.productId)) return false;
  if (rule.scope.productIds.length > 0) {
    return rule.scope.productIds.includes(item.productId);
  }
  if (rule.scope.categoryIds.length > 0) {
    return rule.scope.categoryIds.includes(item.mainCategoryId);
  }
  return true;
}

function matchingItems(rule: SellerDiscountRule, items: DiscountCartItem[]) {
  return items.filter((item) => itemInScope(rule, item));
}

function subtotal(items: DiscountCartItem[]) {
  return items.reduce(
    (total, item) => total + item.unitPriceMinor * item.quantity,
    0,
  );
}

function quantity(items: DiscountCartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function valueDiscount(rule: SellerDiscountRule, baseMinor: number) {
  if (baseMinor <= 0) return 0;
  if (rule.valueType === "percentage") {
    const raw = Math.floor((baseMinor * Math.max(0, rule.value)) / 100);
    return rule.maxDiscountMinor > 0
      ? Math.min(raw, rule.maxDiscountMinor)
      : raw;
  }
  if (rule.valueType === "fixed_amount") {
    return Math.min(baseMinor, Math.max(0, rule.value));
  }
  return 0;
}

function usageFor(
  rule: SellerDiscountRule,
  usage: SellerDiscountUsageSummary[],
): SellerDiscountUsageSummary {
  return (
    usage.find((item) => item.discountId === rule.id) ?? {
      discountId: rule.id,
      totalUses: 0,
      buyerUses: 0,
    }
  );
}

function eligibilityReason(
  rule: SellerDiscountRule,
  items: DiscountCartItem[],
  context: DiscountBuyerContext,
  usage: SellerDiscountUsageSummary[],
): string | null {
  if (!isActiveNow(rule)) return "inactive";
  if (rule.type === "coupon") {
    const codes = (context.couponCodes ?? []).map((code) =>
      code.trim().toLowerCase(),
    );
    if (!rule.couponCode || !codes.includes(rule.couponCode.toLowerCase())) {
      return "coupon_required";
    }
  }
  if (rule.conditions.followersOnly && !context.isFollower) return "followers_only";
  if (rule.conditions.firstOrderOnly && !context.isFirstOrder) return "first_order_only";
  if (rule.conditions.appOnly && !context.isApp) return "app_only";
  const ruleUsage = usageFor(rule, usage);
  if (rule.usageLimits.total > 0 && ruleUsage.totalUses >= rule.usageLimits.total) {
    return "usage_limit_total";
  }
  if (
    context.buyerUid &&
    rule.usageLimits.perBuyer > 0 &&
    ruleUsage.buyerUses >= rule.usageLimits.perBuyer
  ) {
    return "usage_limit_buyer";
  }
  const scoped = matchingItems(rule, items);
  if (scoped.length === 0 && rule.type !== "free_shipping") return "no_matching_items";
  if (rule.conditions.minSubtotalMinor > 0 && subtotal(scoped.length ? scoped : items) < rule.conditions.minSubtotalMinor) {
    return "min_subtotal";
  }
  if (rule.conditions.minQuantity > 0 && quantity(scoped) < rule.conditions.minQuantity) {
    return "min_quantity";
  }
  if (rule.type === "bundle") {
    const ids = new Set(items.map((item) => item.productId));
    if (rule.scope.bundleProductIds.some((id) => !ids.has(id))) return "bundle_missing_items";
  }
  if (rule.type === "free_gift" && !rule.scope.giftProductId) return "gift_required";
  return null;
}

function calculateSingle(
  rule: SellerDiscountRule,
  items: DiscountCartItem[],
): AppliedSellerDiscount | null {
  const scoped = matchingItems(rule, items);
  const scopedSubtotal = subtotal(scoped);
  const affectedItemIds = scoped.map((item) => item.id);
  if (rule.type === "free_shipping") {
    return {
      discountId: rule.id,
      sellerUid: rule.sellerUid,
      type: rule.type,
      title: rule.title,
      discountMinor: 0,
      shippingDiscountMinor: Number.MAX_SAFE_INTEGER,
      giftProductId: "",
      affectedItemIds,
      reason: "free_shipping",
    };
  }
  if (rule.type === "free_gift") {
    return {
      discountId: rule.id,
      sellerUid: rule.sellerUid,
      type: rule.type,
      title: rule.title,
      discountMinor: 0,
      shippingDiscountMinor: 0,
      giftProductId: rule.scope.giftProductId,
      affectedItemIds,
      reason: "free_gift",
    };
  }
  if (rule.type === "bundle" && rule.valueType === "fixed_bundle_price") {
    const discountMinor = Math.max(0, scopedSubtotal - rule.value);
    return discountMinor > 0
      ? {
          discountId: rule.id,
          sellerUid: rule.sellerUid,
          type: rule.type,
          title: rule.title,
          discountMinor,
          shippingDiscountMinor: 0,
          giftProductId: "",
          affectedItemIds,
          reason: "bundle_fixed_price",
        }
      : null;
  }
  if (rule.type === "quantity" && rule.conditions.buyQuantity > 0) {
    const units = quantity(scoped);
    const eligibleGroups = Math.floor(units / rule.conditions.buyQuantity);
    if (eligibleGroups <= 0) return null;
    const discountBase = scopedSubtotal;
    const discountMinor = valueDiscount(rule, discountBase);
    return discountMinor > 0
      ? {
          discountId: rule.id,
          sellerUid: rule.sellerUid,
          type: rule.type,
          title: rule.title,
          discountMinor,
          shippingDiscountMinor: 0,
          giftProductId: "",
          affectedItemIds,
          reason: "quantity",
        }
      : null;
  }
  const base = rule.type === "order_total" ? subtotal(items) : scopedSubtotal;
  const discountMinor = valueDiscount(rule, base);
  return discountMinor > 0
    ? {
        discountId: rule.id,
        sellerUid: rule.sellerUid,
        type: rule.type,
        title: rule.title,
        discountMinor,
        shippingDiscountMinor: 0,
        giftProductId: "",
        affectedItemIds,
        reason: rule.type,
      }
    : null;
}

export function calculateSellerDiscounts(input: {
  sellerUid: string;
  items: DiscountCartItem[];
  discounts: SellerDiscountRule[];
  context?: DiscountBuyerContext;
  usage?: SellerDiscountUsageSummary[];
}): SellerDiscountCalculation {
  const context = input.context ?? {};
  const usage = input.usage ?? [];
  const sellerSubtotal = subtotal(input.items);
  const candidates = input.discounts
    .filter((rule) => rule.sellerUid === input.sellerUid)
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
  const rejected: SellerDiscountCalculation["rejected"] = [];
  const eligible: AppliedSellerDiscount[] = [];

  for (const rule of candidates) {
    const reason = eligibilityReason(rule, input.items, context, usage);
    if (reason) {
      rejected.push({ discountId: rule.id, title: rule.title, reason });
      continue;
    }
    const applied = calculateSingle(rule, input.items);
    if (applied) eligible.push(applied);
  }

  const nonCombinable = eligible.filter(
    (item) => !candidates.find((rule) => rule.id === item.discountId)?.combinable,
  );
  const combinable = eligible.filter((item) =>
    candidates.find((rule) => rule.id === item.discountId)?.combinable,
  );
  const bestSingle = nonCombinable.sort(
    (a, b) =>
      b.discountMinor +
        b.shippingDiscountMinor -
        (a.discountMinor + a.shippingDiscountMinor),
  )[0];
  const applied =
    bestSingle && bestSingle.discountMinor + bestSingle.shippingDiscountMinor > combinable.reduce((sum, item) => sum + item.discountMinor + item.shippingDiscountMinor, 0)
      ? [bestSingle]
      : combinable;
  const discountMinor = Math.min(
    sellerSubtotal,
    applied.reduce((sum, item) => sum + item.discountMinor, 0),
  );
  const shippingDiscountMinor = applied.some(
    (item) => item.shippingDiscountMinor === Number.MAX_SAFE_INTEGER,
  )
    ? Number.MAX_SAFE_INTEGER
    : applied.reduce((sum, item) => sum + item.shippingDiscountMinor, 0);

  return {
    sellerUid: input.sellerUid,
    subtotalMinor: sellerSubtotal,
    discountMinor,
    shippingDiscountMinor,
    totalAfterDiscountMinor: Math.max(0, sellerSubtotal - discountMinor),
    applied,
    rejected,
  };
}

export function calculateCartDiscounts(input: {
  items: DiscountCartItem[];
  discounts: SellerDiscountRule[];
  context?: DiscountBuyerContext;
  usage?: SellerDiscountUsageSummary[];
}): SellerDiscountCartQuote {
  const sellerUids = Array.from(new Set(input.items.map((item) => item.sellerId)));
  const sellers = sellerUids.map((sellerUid) =>
    calculateSellerDiscounts({
      sellerUid,
      items: input.items.filter((item) => item.sellerId === sellerUid),
      discounts: input.discounts,
      context: input.context,
      usage: input.usage,
    }),
  );
  const subtotalMinor = sellers.reduce((sum, seller) => sum + seller.subtotalMinor, 0);
  const discountMinor = sellers.reduce((sum, seller) => sum + seller.discountMinor, 0);
  const hasFreeShipping = sellers.some(
    (seller) => seller.shippingDiscountMinor === Number.MAX_SAFE_INTEGER,
  );
  return {
    sellers,
    subtotalMinor,
    discountMinor,
    shippingDiscountMinor: hasFreeShipping
      ? Number.MAX_SAFE_INTEGER
      : sellers.reduce((sum, seller) => sum + seller.shippingDiscountMinor, 0),
    totalAfterDiscountMinor: Math.max(0, subtotalMinor - discountMinor),
  };
}
