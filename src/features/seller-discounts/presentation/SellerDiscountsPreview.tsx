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
import { uiAttributes } from "@asol/ui-registry-core";

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
      <section {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.section.3-In8kKN", id: "seller-discounts.seller-discounts-preview.section.3" })} id="seller-discounts.seller-discounts-preview.section" className="mx-2 min-w-0 rounded-3xl border border-outline-variant/70 bg-surface p-4 text-sm text-on-surface-variant shadow-sm sm:mx-0">
        {ar ? "جاري تحميل عروض المتجر..." : "Loading store offers..."}
      </section>
    );
  }
  if (visible.length === 0) return null;
  return (
    <section {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.section.4-Ur1LvZ", id: "seller-discounts.seller-discounts-preview.section.4" })} id="seller-discounts.seller-discounts-preview.section.2" className="mx-2 min-w-0 rounded-3xl border border-primary/20 bg-surface p-4 shadow-sm sm:mx-0 sm:p-6">
      <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.div.4-6BnFcq", id: "seller-discounts.seller-discounts-preview.div.4" })} id="seller-discounts.seller-discounts-preview.div" className="mb-4 flex min-w-0 items-center gap-3">
        <span {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.span.2-YBY4zW", id: "seller-discounts.seller-discounts-preview.span.2" })} id="seller-discounts.seller-discounts-preview.span" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Percent id="seller-discounts.seller-discounts-preview.percent" className="h-5 w-5" />
        </span>
        <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.div.5-d935YP", id: "seller-discounts.seller-discounts-preview.div.5" })} id="seller-discounts.seller-discounts-preview.div.2" className="min-w-0">
          <h2 {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.h2.2-Z8NfL9", id: "seller-discounts.seller-discounts-preview.h2.2" })} id="seller-discounts.seller-discounts-preview.h2" className="break-words text-lg font-bold">
            {ar ? "عروض وخصومات المتجر" : "Store offers"}
          </h2>
          <p {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.p.2-0VihR7", id: "seller-discounts.seller-discounts-preview.p.2" })} id="seller-discounts.seller-discounts-preview.p" className="break-words text-xs text-on-surface-variant">
            {ar
              ? "العروض المؤهلة تطبق في السلة حسب شروط كل بائع."
              : "Eligible offers apply in cart according to seller rules."}
          </p>
        </div>
      </div>
      <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.div.6-J0H0aX", id: "seller-discounts.seller-discounts-preview.div.6" })} id="seller-discounts.seller-discounts-preview.div.3" className="grid min-w-0 gap-3 md:grid-cols-2">
        {visible.map((discount) => (
          <OfferCard key={discount.id} discount={discount} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function OfferCard({ id,
  discount,
  locale,
}: {
  discount: SellerDiscountRule;
  locale: "ar" | "en";
} & { id?: string }) {
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
    <article {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.article-5XvCSm", id: "seller-discounts.seller-discounts-preview.article" })} id={id} className="min-w-0 rounded-2xl border border-outline-variant bg-surface-container-low/40 p-3 sm:p-4">
      <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.div.7-18FN62", id: "seller-discounts.seller-discounts-preview.div.7" })} className="flex min-w-0 items-start gap-3">
        <span {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.span.3-6D0rB5", id: "seller-discounts.seller-discounts-preview.span.3" })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </span>
        <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.div.8-EsH0R2", id: "seller-discounts.seller-discounts-preview.div.8" })} className="min-w-0 flex-1">
          <h3 {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.h3-0R8eJS", id: "seller-discounts.seller-discounts-preview.h3" })} className="break-words text-sm font-bold text-on-surface">
            {discount.title || (ar ? "عرض متاح" : "Available offer")}
          </h3>
          <p {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.p.3-F8SbfL", id: "seller-discounts.seller-discounts-preview.p.3" })} className="mt-1 break-words text-xs leading-5 text-on-surface-variant">
            {describe(discount, locale)}
          </p>
          {discount.couponCode ? (
            <code className="mt-2 inline-flex max-w-full break-all rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
              {discount.couponCode}
            </code>
          ) : null}
          {discount.description ? (
            <p {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.p.4-8k3GYO", id: "seller-discounts.seller-discounts-preview.p.4" })} className="mt-2 break-words text-xs leading-5 text-on-surface-variant">
              {discount.description}
            </p>
          ) : null}
          <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.div.9-8a5THX", id: "seller-discounts.seller-discounts-preview.div.9" })} className="mt-3 grid min-w-0 gap-2 border-t border-outline-variant/70 pt-3 text-[11px] leading-5 text-on-surface-variant sm:grid-cols-2">
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

function Detail({ id,
  icon: Icon,
  text,
}: {
  icon: typeof Users;
  text: string;
} & { id?: string }) {
  return (
    <span {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.span.4-NN6orE", id: "seller-discounts.seller-discounts-preview.span.4" })} id={id} className="flex min-w-0 items-start gap-1.5 rounded-lg bg-surface px-2 py-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span {...uiAttributes({ uid: "seller-discounts.seller-discounts-preview.span.5-BMRR41", id: "seller-discounts.seller-discounts-preview.span.5" })} className="min-w-0 break-words">{text}</span>
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
