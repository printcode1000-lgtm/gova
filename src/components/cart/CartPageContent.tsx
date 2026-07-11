"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import {
  clearCart,
  getCartTotalMinor,
  removeCartItem,
  updateCartItemQuantity,
} from "@/features/cart/cart-store";
import { useCart } from "@/features/cart/use-cart";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  normalizeProfileFulfillmentSettings,
  type ProfileFulfillmentSettings,
} from "@/features/profile/entities/profile-fulfillment-settings.entity";
import { profileService } from "@/features/profile/services/profile-service";

function formatMoney(minor: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(minor / 100);
}

export function CartPageContent() {
  const { items, totalQuantity } = useCart();
  const [sellerSettings, setSellerSettings] = React.useState<
    Record<string, ProfileFulfillmentSettings>
  >({});
  const productsTotalMinor = getCartTotalMinor(items);
  const sellerIds = React.useMemo(
    () => Array.from(new Set(items.map((item) => item.sellerId))).filter(Boolean),
    [items],
  );

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        sellerIds.map(async (sellerId) => {
          try {
            const settings = await profileService.getFulfillmentSettings(sellerId);
            return [sellerId, normalizeProfileFulfillmentSettings(settings)] as const;
          } catch {
            return [sellerId, EMPTY_PROFILE_FULFILLMENT_SETTINGS] as const;
          }
        }),
      );
      if (!cancelled) setSellerSettings(Object.fromEntries(entries));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [sellerIds]);

  const sellerGroups = React.useMemo(
    () =>
      sellerIds.map((sellerId) => {
        const sellerItems = items.filter((item) => item.sellerId === sellerId);
        const subtotalMinor = getCartTotalMinor(sellerItems);
        const settings =
          sellerSettings[sellerId] ?? EMPTY_PROFILE_FULFILLMENT_SETTINGS;
        const pricing = settings.shippingPricing;
        const hasSpecialVehicle = sellerItems.some(
          (item) => item.requiresSpecialVehicle,
        );
        const thresholdMinor = Math.round(pricing.freeShippingThreshold * 100);
        const eligibleForFree =
          thresholdMinor > 0 && subtotalMinor >= thresholdMinor;
        const baseShipping =
          pricing.mode === "free" || eligibleForFree
            ? 0
            : pricing.mode === "flat"
              ? pricing.flatRate
              : pricing.locationBaseRate;
        const shippingMinor =
          Math.round(baseShipping * 100) +
          (hasSpecialVehicle ? Math.round(pricing.specialVehicleFee * 100) : 0);

        return {
          sellerId,
          items: sellerItems,
          settings,
          subtotalMinor,
          shippingMinor,
          eligibleForFree,
          hasSpecialVehicle,
        };
      }),
    [items, sellerIds, sellerSettings],
  );

  const shippingTotalMinor = sellerGroups.reduce(
    (total, group) => total + group.shippingMinor,
    0,
  );
  const totalMinor = productsTotalMinor + shippingTotalMinor;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">السلة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            راجع المنتجات والخدمات قبل تحويلها لاحقًا إلى طلب رسمي.
          </p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-error hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
            تفريغ السلة
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <section className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-bold">السلة فارغة</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            عند إضافة منتج أو خدمة ستظهر هنا، وستظهر النقطة الحمراء في الهيدر.
          </p>
          <Link
            href="/home"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary"
          >
            تصفح المنتجات
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            {sellerGroups.map((group) => (
              <div
                key={group.sellerId}
                className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
                  <div>
                    <h2 className="text-sm font-bold">البائع: {group.sellerId}</h2>
                    <p className="text-xs text-muted-foreground">
                      الشحن: {formatMoney(group.shippingMinor)}
                      {group.eligibleForFree ? " - تم تطبيق حد الشحن المجاني" : ""}
                    </p>
                  </div>
                  {group.hasSpecialVehicle ? (
                    <span className="rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                      يتضمن منتجًا يحتاج سيارة نقل
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {group.items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-outline-variant bg-background p-4"
              >
                <div className="flex gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        بدون صورة
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-on-surface">
                          {item.name}
                        </h2>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          البائع: {item.sellerId}
                        </p>
                        {item.requiresSpecialVehicle ? (
                          <span className="mt-2 inline-flex rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                            يحتاج سيارة خاصة
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                        className="rounded-full p-2 text-muted-foreground transition hover:bg-error/10 hover:text-error"
                        aria-label="حذف من السلة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex items-center overflow-hidden rounded-lg border border-outline-variant">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemQuantity(item.id, item.quantity - 1)
                          }
                          className="flex h-9 w-9 items-center justify-center transition hover:bg-muted"
                          aria-label="تقليل الكمية"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-10 px-3 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemQuantity(item.id, item.quantity + 1)
                          }
                          className="flex h-9 w-9 items-center justify-center transition hover:bg-muted"
                          aria-label="زيادة الكمية"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-end">
                        <p className="text-xs text-muted-foreground">
                          سعر الوحدة
                        </p>
                        <p className="font-bold">
                          {formatMoney(item.unitPriceMinor)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
                  ))}
                </div>

                <details className="mt-4 rounded-lg border border-outline-variant bg-muted/20 p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold">
                    سياسة الشحن والإرجاع الخاصة بالبائع
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {group.settings.shippingPricing.notes ? (
                      <p className="whitespace-pre-wrap rounded-lg bg-background p-3">
                        ملاحظات الشحن: {group.settings.shippingPricing.notes}
                      </p>
                    ) : null}
                    <p>
                      الحالة:{" "}
                      <span className="font-semibold text-on-surface">
                        {group.settings.returns.enabled ? "الإرجاع متاح" : "الإرجاع غير متاح"}
                      </span>
                    </p>
                    {group.settings.returns.enabled ? (
                      <>
                        <p>
                          عدد أيام الإرجاع:{" "}
                          <span className="font-semibold text-on-surface">
                            {group.settings.returns.returnWindowDays}
                          </span>
                        </p>
                        <p>
                          تكلفة شحن الإرجاع:{" "}
                          <span className="font-semibold text-on-surface">
                            {group.settings.returns.returnShippingPayer === "buyer"
                              ? "المشتري"
                              : group.settings.returns.returnShippingPayer === "seller"
                                ? "البائع"
                                : "حسب الحالة"}
                          </span>
                        </p>
                      </>
                    ) : null}
                    {group.settings.returns.policyText ? (
                      <p className="whitespace-pre-wrap rounded-lg bg-background p-3">
                        {group.settings.returns.policyText}
                      </p>
                    ) : (
                      <p>لا يوجد نص سياسة مضاف من البائع.</p>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </section>

          <aside className="h-fit rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
            <h2 className="font-bold">ملخص السلة</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد العناصر</span>
                <span className="font-semibold">{totalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">إجمالي المنتجات</span>
                <span className="font-semibold">{formatMoney(productsTotalMinor)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">إجمالي الشحن</span>
                <span className="font-semibold">{formatMoney(shippingTotalMinor)}</span>
              </div>
              <div className="border-t border-outline-variant pt-3">
                <div className="flex justify-between text-base font-bold">
                  <span>الإجمالي المبدئي</span>
                  <span>{formatMoney(totalMinor)}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="mt-5 w-full rounded-xl bg-primary px-5 py-3 font-bold text-on-primary opacity-60"
              title="سيتم ربطها لاحقًا بنظام إنشاء الطلب الرسمي"
            >
              متابعة الطلب لاحقًا
            </button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              هذه السلة مؤقتة في المتصفح. عند تفعيل إتمام الطلب لاحقًا سيتم إنشاء
              طلب رسمي متوافق مع نظام إدارة طلبات السوق.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
