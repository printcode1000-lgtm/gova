"use client";

import { Gift, PackagePlus, Percent, Ticket, Truck } from "lucide-react";
import { useSellerDiscounts } from "../hooks/use-seller-discounts";
import {
  formatMinorCurrency,
  type SellerDiscountRule,
} from "../entities/seller-discount.entity";

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
    <article className="rounded-2xl border border-outline-variant bg-surface-container-low/40 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
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
        </div>
      </div>
    </article>
  );
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
      ? ` حتى ${new Date(discount.endsAt).toLocaleDateString("ar-EG")}`
      : ` until ${new Date(discount.endsAt).toLocaleDateString("en-US")}`
    : "";
  return `${value}${min}${end}`;
}
