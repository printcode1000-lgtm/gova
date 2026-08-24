"use client";

import { formatDate } from "@asol/format-core";

import {
  CalendarDays,
  Gift,
  PackagePlus,
  Percent,
  Repeat2,
  ShoppingBag,
  Ticket,
  Truck,
  Users,
} from "lucide-react";
import { useSellerDiscounts } from "./hooks/use-seller-discounts";
import {
  formatMinorCurrency,
  type SellerDiscountRule,
} from "../domain/seller-discount.entity";

export function SellerDiscountsPreview({
  sellerUid,
  locale,
}: {
  sellerUid: string;
  locale: "ar" | "en";
}) {
  const ar = locale === "ar";
  const { discounts, isLoading } = useSellerDiscounts(sellerUid, false);
  const visible = discounts.filter((discount) => discount.status === "active");
  if (isLoading) {
    return (
      <section className="rounded-3xl border border-outline-variant/70 bg-surface p-4 text-sm text-on-surface-variant shadow-sm">
        {ar ? "جاري تحميل عروض المتجر..." : "Loading store offers..."}
      </section>
    );
  }
  if (visible.length === 0) return null;
  return (
    <section className="rounded-3xl border border-primary/20 bg-surface p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Percent className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold">
            {ar ? "عروض وخصومات المتجر" : "Store offers"}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {ar
              ? "العروض المؤهلة تطبق في السلة حسب شروط كل بائع."
              : "Eligible offers apply in cart according to seller rules."}
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((discount) => (
          <OfferCard key={discount.id} discount={discount} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function OfferCard({
  discount,
  locale,
}: {
  discount: SellerDiscountRule;
  locale: "ar" | "en";
}) {
  const ar = locale === "ar";
  const Icon =
    discount.type === "free_shipping"
      ? Truck
      : discount.type === "coupon"
        ? Ticket
        : discount.type === "free_gift"
          ? Gift
          : discount.type === "bundle"
            ? PackagePlus
            : Percent;
  return (
    <article className="rounded-2xl border border-outline-variant bg-surface-container-low/40 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-bold text-on-surface">
            {discount.title || (ar ? "عرض متاح" : "Available offer")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            {describe(discount, locale)}
          </p>
          {discount.couponCode ? (
            <code className="mt-2 inline-flex rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              {discount.couponCode}
            </code>
          ) : null}
          {discount.description ? (
            <p className="mt-2 break-words text-xs leading-5 text-on-surface-variant">
              {discount.description}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 border-t border-outline-variant/70 pt-3 text-[11px] leading-5 text-on-surface-variant sm:grid-cols-2">
            <Detail icon={Users} text={describeAudience(discount, locale)} />
            <Detail icon={ShoppingBag} text={describeScope(discount, locale)} />
            <Detail icon={CalendarDays} text={describeValidity(discount, locale)} />
            <Detail icon={Repeat2} text={describeUsage(discount, locale)} />
          </div>
        </div>
      </div>
    </article>
  );
}

function Detail({
  icon: Icon,
  text,
}: {
  icon: typeof Users;
  text: string;
}) {
  return (
    <span className="flex items-start gap-1.5 rounded-lg bg-surface px-2 py-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{text}</span>
    </span>
  );
}

function describeAudience(discount: SellerDiscountRule, locale: "ar" | "en") {
  const ar = locale === "ar";
  const audiences = [
    discount.conditions.followersOnly ? (ar ? "المتابعون" : "Followers") : "",
    discount.conditions.firstOrderOnly ? (ar ? "الطلب الأول" : "First order") : "",
    discount.conditions.appOnly ? (ar ? "مستخدمو التطبيق" : "App users") : "",
  ].filter(Boolean);
  return audiences.length > 0
    ? `${ar ? "مخصص لـ" : "For"}: ${audiences.join(ar ? "، " : ", ")}`
    : ar
      ? "متاح لجميع العملاء المؤهلين"
      : "Available to all eligible customers";
}

function describeScope(discount: SellerDiscountRule, locale: "ar" | "en") {
  const ar = locale === "ar";
  const parts: string[] = [];
  if (discount.scope.productIds.length > 0) {
    parts.push(ar ? `${discount.scope.productIds.length} منتج محدد` : `${discount.scope.productIds.length} selected products`);
  }
  if (discount.scope.categoryIds.length > 0) {
    parts.push(ar ? `${discount.scope.categoryIds.length} فئة` : `${discount.scope.categoryIds.length} categories`);
  }
  if (discount.conditions.minQuantity > 0) {
    parts.push(ar ? `حد أدنى ${discount.conditions.minQuantity} قطع` : `minimum ${discount.conditions.minQuantity} items`);
  }
  if (discount.scope.excludedProductIds.length > 0) {
    parts.push(ar ? `يستثني ${discount.scope.excludedProductIds.length} منتج` : `excludes ${discount.scope.excludedProductIds.length} products`);
  }
  return parts.length > 0
    ? parts.join(ar ? "، " : ", ")
    : ar
      ? "يشمل منتجات المتجر المؤهلة"
      : "Covers eligible store products";
}

function describeValidity(discount: SellerDiscountRule, locale: "ar" | "en") {
  const ar = locale === "ar";
  const start = formatDate(discount.startsAt, locale);
  const end = formatDate(discount.endsAt, locale);
  if (start && end) return ar ? `من ${start} إلى ${end}` : `${start} to ${end}`;
  if (end) return ar ? `متاح حتى ${end}` : `Available until ${end}`;
  if (start) return ar ? `يبدأ في ${start}` : `Starts ${start}`;
  return ar ? "متاح دون تاريخ انتهاء محدد" : "No specified end date";
}

function describeUsage(discount: SellerDiscountRule, locale: "ar" | "en") {
  const ar = locale === "ar";
  const limits: string[] = [];
  if (discount.usageLimits.perBuyer > 0) {
    limits.push(ar ? `${discount.usageLimits.perBuyer} مرة لكل عميل` : `${discount.usageLimits.perBuyer} per customer`);
  }
  if (discount.usageLimits.total > 0) {
    limits.push(ar ? `${discount.usageLimits.total} استخدام إجمالي` : `${discount.usageLimits.total} total uses`);
  }
  limits.push(
    discount.combinable
      ? ar ? "يقبل الدمج مع عروض أخرى" : "Can combine with other offers"
      : ar ? "لا يدمج مع عروض أخرى" : "Cannot combine with other offers",
  );
  return limits.join(ar ? "، " : ", ");
}

function describe(discount: SellerDiscountRule, locale: "ar" | "en") {
  const ar = locale === "ar";
  const value =
    discount.valueType === "percentage"
      ? `${discount.value}%`
      : discount.valueType === "fixed_amount"
        ? formatMinorCurrency(discount.value, locale)
        : discount.valueType === "fixed_bundle_price"
          ? `${ar ? "سعر باقة" : "Bundle price"} ${formatMinorCurrency(discount.value, locale)}`
          : discount.valueType === "free_shipping"
            ? ar
              ? "شحن مجاني"
              : "free shipping"
            : ar
              ? "هدية مجانية"
              : "free gift";
  const min =
    discount.conditions.minSubtotalMinor > 0
      ? ar
        ? ` عند الشراء بقيمة ${formatMinorCurrency(discount.conditions.minSubtotalMinor, locale)} أو أكثر`
        : ` on orders from ${formatMinorCurrency(discount.conditions.minSubtotalMinor, locale)}`
      : "";
  const end = discount.endsAt
    ? ar
      ? ` حتى ${formatDate(discount.endsAt, "ar")}`
      : ` until ${formatDate(discount.endsAt, "en")}`
    : "";
  return `${value}${min}${end}`;
}
