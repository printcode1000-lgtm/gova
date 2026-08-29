"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";

import {
  clearCart,
  getCartTotalMinor,
  removeCartItem,
  updateCartItemQuantity,
} from "@/features/cart/application/cart-store";
import { useCart } from "@/features/cart/presentation/hooks/use-cart";
import { useSessionRuntime } from "@/shared/session-runtime";
import { useTranslation } from "@/shared/i18n";
import { notifications } from "@/features/notifications";
import { useCartDiscountQuote } from "@/features/seller-discounts/ui";
import { formatMoney, orderErrorMessage } from "./cart-page-format";
import { cartPageCopy } from "./cart-page-copy";
import { buildCartSellerGroups, sellerIdsFromCartItems } from "./cart-seller-groups";
import { submitCartOrder } from "./cart-order-submit";
import { useCartCheckoutSettings } from "./use-cart-checkout-settings";
import { uiAttributes } from "@asol/ui-registry-core";

export function CartPageContent() {
  const router = useRouter();
  const { locale } = useTranslation();
  const copy = cartPageCopy(locale);
  const { session, isLoading: isSessionLoading } = useSessionRuntime();
  const { items, totalQuantity } = useCart();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [couponText, setCouponText] = React.useState("");
  const productsTotalMinor = getCartTotalMinor(items);
  const sellerIds = React.useMemo(
    () => sellerIdsFromCartItems(items),
    [items],
  );

  const { sellerSettings, qualifiedDeliveryAvailable } =
    useCartCheckoutSettings(sellerIds);

  const sellerGroups = React.useMemo(
    () => buildCartSellerGroups({ items, sellerIds, sellerSettings }),
    [items, sellerIds, sellerSettings],
  );

  const couponCodes = React.useMemo(
    () =>
      couponText
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
    [couponText],
  );
  const { quote: discountQuote, isLoading: isLoadingDiscountQuote } =
    useCartDiscountQuote(items, {
      buyerUid: session?.uid,
      couponCodes,
      isApp: true,
      isFirstOrder: false,
      isFollower: false,
    });

  const separateDeliveryEstimateMinor = sellerGroups.reduce(
    (total, group) => total + group.shippingMinor,
    0,
  );
  const unifiedDeliveryAvailable =
    sellerGroups.length > 1 &&
    (qualifiedDeliveryAvailable ||
      sellerGroups.some((group) => group.settings.carrierUids.length > 0));
  const shippingTotalMinor = unifiedDeliveryAvailable
    ? 0
    : separateDeliveryEstimateMinor;
  const productsDiscountMinor = discountQuote?.discountMinor ?? 0;
  const shippingDiscountMinor =
    discountQuote?.sellers.reduce((total, seller) => {
      if (seller.shippingDiscountMinor !== Number.MAX_SAFE_INTEGER) {
        return total + seller.shippingDiscountMinor;
      }
      const group = sellerGroups.find((item) => item.sellerId === seller.sellerUid);
      return total + (group?.shippingMinor ?? 0);
    }, 0) ?? 0;
  const payableShippingMinor = Math.max(
    0,
    shippingTotalMinor - shippingDiscountMinor,
  );
  const totalMinor =
    productsTotalMinor - productsDiscountMinor + payableShippingMinor;
  const hasPendingShippingQuote =
    unifiedDeliveryAvailable ||
    sellerGroups.some((group) => group.quoteRequired);

  const submitOrder = async () => {
    if (!session?.uid) {
      setSubmitError("يجب تسجيل الدخول قبل إرسال الطلب.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const orderId = await submitCartOrder({
        session,
        couponCodes,
        items,
      });
      await clearCart();
      router.push(
        `/orders/details?orderId=${encodeURIComponent(orderId)}`,
      );
    } catch (error) {
      setSubmitError(
        orderErrorMessage(
          error instanceof Error ? error.message : String(error),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main {...uiAttributes({ uid: "cart.cart-page-content.main.2-1GzA4d", id: "cart.cart-page-content.main.2" })} id="cart.cart-page-content.main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div {...uiAttributes({ uid: "cart.cart-page-content.div.17-A95CK1", id: "cart.cart-page-content.div.17" })} id="cart.cart-page-content.div" className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div {...uiAttributes({ uid: "cart.cart-page-content.div.18-F8Owl8", id: "cart.cart-page-content.div.18" })} id="cart.cart-page-content.div.2">
          <h1 {...uiAttributes({ uid: "cart.cart-page-content.h1.2-46BJP1", id: "cart.cart-page-content.h1.2" })} id="cart.cart-page-content.h1" className="text-2xl font-bold text-on-surface">{copy.title}</h1>
          <p {...uiAttributes({ uid: "cart.cart-page-content.p.8-uVbE7C", id: "cart.cart-page-content.p.8" })} id="cart.cart-page-content.p" className="mt-1 text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        {items.length > 0 ? (
          <button {...uiAttributes({ uid: "cart.cart-page-content.button.2-T933Ez", id: "cart.cart-page-content.button.2" })} id="cart.cart-page-content.button"
            type="button"
            onClick={() => void clearCart()}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition"
          >
            <Trash2 id="cart.cart-page-content.trash2" className="h-4 w-4" />
            {copy.clear}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <section {...uiAttributes({ uid: "cart.cart-page-content.section.3-F0rYgD", id: "cart.cart-page-content.section.3" })} id="cart.cart-page-content.section" className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
          <div {...uiAttributes({ uid: "cart.cart-page-content.div.19-eaBy4Z", id: "cart.cart-page-content.div.19" })} id="cart.cart-page-content.div.3" className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShoppingCart id="cart.cart-page-content.shopping-cart" className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 {...uiAttributes({ uid: "cart.cart-page-content.h2.4-k6nVJI", id: "cart.cart-page-content.h2.4" })} id="cart.cart-page-content.h2" className="mt-4 text-lg font-bold">{copy.emptyTitle}</h2>
          <p {...uiAttributes({ uid: "cart.cart-page-content.p.9-1Q95vA", id: "cart.cart-page-content.p.9" })} id="cart.cart-page-content.p.2" className="mt-2 text-sm text-muted-foreground">
            {copy.emptyText}
          </p>
          <Link id="cart.cart-page-content.link"
            href="/home"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary"
          >
            {copy.browse}
          </Link>
        </section>
      ) : (
        <div {...uiAttributes({ uid: "cart.cart-page-content.div.20-w5COoh", id: "cart.cart-page-content.div.20" })} id="cart.cart-page-content.div.4" className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section {...uiAttributes({ uid: "cart.cart-page-content.section.4-t1XwV4", id: "cart.cart-page-content.section.4" })} id="cart.cart-page-content.section.2" className="space-y-4">
            {unifiedDeliveryAvailable ? (
              <div {...uiAttributes({ uid: "cart.cart-page-content.div.21-Ix3eP6", id: "cart.cart-page-content.div.21" })} id="cart.cart-page-content.div.5" className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div {...uiAttributes({ uid: "cart.cart-page-content.div.22-bBhG7a", id: "cart.cart-page-content.div.22" })} id="cart.cart-page-content.div.6" className="flex items-start gap-3">
                  <Truck id="cart.cart-page-content.truck" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div {...uiAttributes({ uid: "cart.cart-page-content.div.23-0VOVwX", id: "cart.cart-page-content.div.23" })} id="cart.cart-page-content.div.7">
                    <h2 {...uiAttributes({ uid: "cart.cart-page-content.h2.5-VLpPA0", id: "cart.cart-page-content.h2.5" })} id="cart.cart-page-content.h2.2" className="font-bold text-primary">
                      توصيل موحّد لعدة بائعين
                    </h2>
                    <p {...uiAttributes({ uid: "cart.cart-page-content.p.10-nTGM5D", id: "cart.cart-page-content.p.10" })} id="cart.cart-page-content.p.3" className="mt-1 text-sm leading-6 text-muted-foreground">
                      سيطلب النظام عرضًا واحدًا لجمع المنتجات من{""}
                      {sellerGroups.length} بائعين وتسليمها إليك في شحنة واحدة،
                      ولن تُحسب رسوم كل بائع بصورة منفصلة.
                    </p>
                    <p {...uiAttributes({ uid: "cart.cart-page-content.p.11-1CxP5Y", id: "cart.cart-page-content.p.11" })} id="cart.cart-page-content.p.4" className="mt-2 text-xs font-semibold text-on-surface">
                      تكلفة التوصيل المنفصل المؤكدة حاليًا:{""}
                      {formatMoney(separateDeliveryEstimateMinor)}
                      {sellerGroups.some((group) => group.quoteRequired)
                        ? "، وقد تزيد بعد تسعير المواقع."
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            {sellerGroups.map((group) => (
              <div
                key={group.sellerId} {...uiAttributes({ uid: "cart.cart-page-content.div.24-ZH6UD8", id: "cart.cart-page-content.div.24" })}
                className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm"
              >
                <div {...uiAttributes({ uid: "cart.cart-page-content.div.25-SN5we4", id: "cart.cart-page-content.div.25" })} className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
                  <div {...uiAttributes({ uid: "cart.cart-page-content.div.26-Ks9XBW", id: "cart.cart-page-content.div.26" })}>
                    <h2 {...uiAttributes({ uid: "cart.cart-page-content.h2.6-nA3JLR", id: "cart.cart-page-content.h2.6" })} className="text-sm font-bold">{copy.seller}</h2>
                    <p {...uiAttributes({ uid: "cart.cart-page-content.p.12-GD3NUM", id: "cart.cart-page-content.p.12" })} className="text-xs text-muted-foreground">
                      {unifiedDeliveryAvailable
                        ? `مرجع التوصيل المنفصل: ${formatMoney(group.shippingMinor)}`
                        : group.quoteRequired
                          ? `رسوم مؤكدة حاليًا: ${formatMoney(group.shippingMinor)} — تكلفة الشحن حسب المكان تُحدد بعد الطلب`
                          : `الشحن: ${formatMoney(group.shippingMinor)}`}
                      {group.eligibleForFree
                        ? " - تم تطبيق حد الشحن المجاني"
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/profile?mode=view&uid=${encodeURIComponent(group.sellerId)}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface transition"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {copy.viewSeller}
                  </Link>
                  {group.hasSpecialVehicle ? (
                    <span {...uiAttributes({ uid: "cart.cart-page-content.span.17-apW0HY", id: "cart.cart-page-content.span.17" })} className="rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                      يتضمن منتجًا يحتاج سيارة نقل
                    </span>
                  ) : null}
                </div>

                {discountQuote?.sellers
                  .find((seller) => seller.sellerUid === group.sellerId)
                  ?.applied.length ? (
                  <div {...uiAttributes({ uid: "cart.cart-page-content.div.27-jTQW1X", id: "cart.cart-page-content.div.27" })} className="mb-3 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm">
                    <p {...uiAttributes({ uid: "cart.cart-page-content.p.13-3H6h3B", id: "cart.cart-page-content.p.13" })} className="font-bold text-primary">خصومات مطبقة</p>
                    <div {...uiAttributes({ uid: "cart.cart-page-content.div.28-O8Vj1H", id: "cart.cart-page-content.div.28" })} className="mt-2 space-y-1 text-xs text-on-surface">
                      {discountQuote.sellers
                        .find((seller) => seller.sellerUid === group.sellerId)!
                        .applied.map((discount) => (
                          <div
                            key={discount.discountId} {...uiAttributes({ uid: "cart.cart-page-content.div.29-BOa9jv", id: "cart.cart-page-content.div.29" })}
                            className="flex justify-between gap-3"
                          >
                            <span {...uiAttributes({ uid: "cart.cart-page-content.span.18-JKWnQ3", id: "cart.cart-page-content.span.18" })}>{discount.title}</span>
                            <span {...uiAttributes({ uid: "cart.cart-page-content.span.19-25Ct4Y", id: "cart.cart-page-content.span.19" })} className="font-semibold text-primary">
                              {discount.shippingDiscountMinor ===
                              Number.MAX_SAFE_INTEGER
                                ? "شحن مجاني"
                                : discount.giftProductId
                                  ? "هدية مجانية"
                                  : `-${formatMoney(discount.discountMinor)}`}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                <div {...uiAttributes({ uid: "cart.cart-page-content.div.30-jMX7h6", id: "cart.cart-page-content.div.30" })} className="space-y-3">
                  {group.items.map((item) => (
                    <article
                      key={item.id} {...uiAttributes({ uid: "cart.cart-page-content.article-108XMM", id: "cart.cart-page-content.article" })}
                      className="rounded-xl border border-outline-variant bg-background p-4"
                    >
                      <div {...uiAttributes({ uid: "cart.cart-page-content.div.31-tCF21Q", id: "cart.cart-page-content.div.31" })} className="flex gap-4">
                        <div {...uiAttributes({ uid: "cart.cart-page-content.div.32-013PnD", id: "cart.cart-page-content.div.32" })} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-muted">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <div {...uiAttributes({ uid: "cart.cart-page-content.div.33-S8Rnyd", id: "cart.cart-page-content.div.33" })} className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              {copy.noImage}
                            </div>
                          )}
                        </div>
                        <div {...uiAttributes({ uid: "cart.cart-page-content.div.34-0Sf8Ay", id: "cart.cart-page-content.div.34" })} className="min-w-0 flex-1">
                          <div {...uiAttributes({ uid: "cart.cart-page-content.div.35-P7y6ds", id: "cart.cart-page-content.div.35" })} className="flex flex-wrap items-start justify-between gap-3">
                            <div {...uiAttributes({ uid: "cart.cart-page-content.div.36-6hwURf", id: "cart.cart-page-content.div.36" })} className="min-w-0">
                              <h2 {...uiAttributes({ uid: "cart.cart-page-content.h2.7-5VxQJK", id: "cart.cart-page-content.h2.7" })} className="truncate font-bold text-on-surface">
                                {item.name}
                              </h2>
                              {item.requiresSpecialVehicle ? (
                                <span {...uiAttributes({ uid: "cart.cart-page-content.span.20-6wK5J3", id: "cart.cart-page-content.span.20" })} className="mt-2 inline-flex rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                                  يحتاج سيارة خاصة
                                </span>
                              ) : null}
                            </div>
                            <button {...uiAttributes({ uid: "cart-remove-SlqB5g", id: "cart-remove", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "cart-remove" } })}
                              type="button"
                              onClick={() => void removeCartItem(item.id)}
                              className="rounded-full p-2 text-muted-foreground transition"
                              aria-label="إزالة من السلة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div {...uiAttributes({ uid: "cart.cart-page-content.div.37-ETX8Fp", id: "cart.cart-page-content.div.37" })} className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div {...uiAttributes({ uid: "cart.cart-page-content.div.38-t2wW4j", id: "cart.cart-page-content.div.38" })} className="inline-flex items-center overflow-hidden rounded-lg border border-outline-variant">
                              <button {...uiAttributes({ uid: "cart-decrease-AyGe00", id: "cart-decrease", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "cart-decrease" } })}
                                type="button"
                                onClick={() =>
                                  void updateCartItemQuantity(
                                    item.id,
                                    item.quantity - 1,
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center transition"
                                aria-label="تقليل الكمية"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span {...uiAttributes({ uid: "cart.cart-page-content.span.21-iL0sNo", id: "cart.cart-page-content.span.21" })} className="min-w-10 px-3 text-center text-sm font-bold">
                                {item.quantity}
                              </span>
                              <button {...uiAttributes({ uid: "cart-increase-EKf2uz", id: "cart-increase", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "cart-increase" } })}
                                type="button"
                                onClick={() =>
                                  void updateCartItemQuantity(
                                    item.id,
                                    item.quantity + 1,
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center transition"
                                aria-label="زيادة الكمية"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <div {...uiAttributes({ uid: "cart.cart-page-content.div.39-BN8nrP", id: "cart.cart-page-content.div.39" })} className="text-end">
                              <p {...uiAttributes({ uid: "cart.cart-page-content.p.14-9X8WlW", id: "cart.cart-page-content.p.14" })} className="text-xs text-muted-foreground">
                                {copy.unitPrice}
                              </p>
                              <p {...uiAttributes({ uid: "cart.cart-page-content.p.15-5fWmE7", id: "cart.cart-page-content.p.15" })} className="font-bold">
                                {item.unitPriceMinor === 0 && item.priceLabel
                                  ? item.priceLabel
                                  : formatMoney(item.unitPriceMinor)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <details {...uiAttributes({ uid: "cart.cart-page-content.details-2lY116", id: "cart.cart-page-content.details" })} className="mt-4 rounded-lg border border-outline-variant bg-muted/20 p-3">
                  <summary {...uiAttributes({ uid: "cart.cart-page-content.summary-x3AEdS", id: "cart.cart-page-content.summary" })} className="flex list-none items-center justify-between gap-3 text-sm font-bold">
                    سياسة الشحن والإرجاع الخاصة بالبائع
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </summary>
                  <div {...uiAttributes({ uid: "cart.cart-page-content.div.40-ASH060", id: "cart.cart-page-content.div.40" })} className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {group.settings.shippingPricing.notes ? (
                      <p {...uiAttributes({ uid: "cart.cart-page-content.p.16-tUA8JW", id: "cart.cart-page-content.p.16" })} className="whitespace-pre-wrap rounded-lg bg-background p-3">
                        ملاحظات الشحن: {group.settings.shippingPricing.notes}
                      </p>
                    ) : null}
                    <p {...uiAttributes({ uid: "cart.cart-page-content.p.17-tTJw65", id: "cart.cart-page-content.p.17" })}>
                      الحالة:{""}
                      <span {...uiAttributes({ uid: "cart.cart-page-content.span.22-sM1I4r", id: "cart.cart-page-content.span.22" })} className="font-semibold text-on-surface">
                        {group.settings.returns.enabled
                          ? "الإرجاع متاح"
                          : "الإرجاع غير متاح"}
                      </span>
                    </p>
                    {group.settings.returns.enabled ? (
                      <>
                        <p {...uiAttributes({ uid: "cart.cart-page-content.p.18-0Ffu0F", id: "cart.cart-page-content.p.18" })}>
                          عدد أيام الإرجاع:{""}
                          <span {...uiAttributes({ uid: "cart.cart-page-content.span.23-8PTDKC", id: "cart.cart-page-content.span.23" })} className="font-semibold text-on-surface">
                            {group.settings.returns.returnWindowDays}
                          </span>
                        </p>
                        <p {...uiAttributes({ uid: "cart.cart-page-content.p.19-1S4ZFU", id: "cart.cart-page-content.p.19" })}>
                          تكلفة شحن الإرجاع:{""}
                          <span {...uiAttributes({ uid: "cart.cart-page-content.span.24-VD31Nc", id: "cart.cart-page-content.span.24" })} className="font-semibold text-on-surface">
                            {group.settings.returns.returnShippingPayer ===
                            "buyer"
                              ? "المشتري"
                              : group.settings.returns.returnShippingPayer ===
                                  "seller"
                                ? "البائع"
                                : "حسب الحالة"}
                          </span>
                        </p>
                      </>
                    ) : null}
                    {group.settings.returns.policyText ? (
                      <p {...uiAttributes({ uid: "cart.cart-page-content.p.20-DWy1M3", id: "cart.cart-page-content.p.20" })} className="whitespace-pre-wrap rounded-lg bg-background p-3">
                        {group.settings.returns.policyText}
                      </p>
                    ) : (
                      <p {...uiAttributes({ uid: "cart.cart-page-content.p.21-V6xrDW", id: "cart.cart-page-content.p.21" })}>لا يوجد نص سياسة مضاف من البائع.</p>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </section>

          <aside {...uiAttributes({ uid: "cart.cart-page-content.aside.2-to1El1", id: "cart.cart-page-content.aside.2" })} id="cart.cart-page-content.aside" className="h-fit rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
            <h2 {...uiAttributes({ uid: "cart.cart-page-content.h2.8-8M4qWv", id: "cart.cart-page-content.h2.8" })} id="cart.cart-page-content.h2.3" className="font-bold">{copy.summary}</h2>
            <div {...uiAttributes({ uid: "cart.cart-page-content.div.41-HCf11J", id: "cart.cart-page-content.div.41" })} id="cart.cart-page-content.div.8" className="mt-4 space-y-3 text-sm">
              <label {...uiAttributes({ uid: "cart.cart-page-content.label.2-bY14NA", id: "cart.cart-page-content.label.2" })} id="cart.cart-page-content.label" className="block space-y-1.5">
                <span {...uiAttributes({ uid: "cart.cart-page-content.span.25-o9N1Zt", id: "cart.cart-page-content.span.25" })} id="cart.cart-page-content.span" className="text-xs font-semibold text-muted-foreground">
                  {copy.coupon}
                </span>
                <input {...uiAttributes({ uid: "cart.cart-page-content.input.2-JyI7j8", id: "cart.cart-page-content.input.2" })} id="cart.cart-page-content.input"
                  value={couponText}
                  onChange={(event) => setCouponText(event.target.value)}
                  placeholder="WELCOME10"
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
                />
                <span {...uiAttributes({ uid: "cart.cart-page-content.span.26-7xIW3E", id: "cart.cart-page-content.span.26" })} id="cart.cart-page-content.span.2" className="block text-[11px] text-muted-foreground">
                  {copy.couponHint}
                </span>
              </label>
              <div {...uiAttributes({ uid: "cart.cart-page-content.div.42-sW2blR", id: "cart.cart-page-content.div.42" })} id="cart.cart-page-content.div.9" className="flex justify-between">
                <span {...uiAttributes({ uid: "cart.cart-page-content.span.27-3wPkbR", id: "cart.cart-page-content.span.27" })} id="cart.cart-page-content.span.3" className="text-muted-foreground">{copy.itemCount}</span>
                <span {...uiAttributes({ uid: "cart.cart-page-content.span.28-60IQW9", id: "cart.cart-page-content.span.28" })} id="cart.cart-page-content.span.4" className="font-semibold">{totalQuantity}</span>
              </div>
              <div {...uiAttributes({ uid: "cart.cart-page-content.div.43-8Gh9bW", id: "cart.cart-page-content.div.43" })} id="cart.cart-page-content.div.10" className="flex justify-between">
                <span {...uiAttributes({ uid: "cart.cart-page-content.span.29-1ofVhv", id: "cart.cart-page-content.span.29" })} id="cart.cart-page-content.span.5" className="text-muted-foreground">{copy.productsTotal}</span>
                <span {...uiAttributes({ uid: "cart.cart-page-content.span.30-Wb4O0o", id: "cart.cart-page-content.span.30" })} id="cart.cart-page-content.span.6" className="font-semibold">
                  {formatMoney(productsTotalMinor, locale)}
                </span>
              </div>
              {isLoadingDiscountQuote ? (
                <div {...uiAttributes({ uid: "cart.cart-page-content.div.44-vA1Dhv", id: "cart.cart-page-content.div.44" })} id="cart.cart-page-content.div.11" className="flex justify-between text-primary">
                  <span {...uiAttributes({ uid: "cart.cart-page-content.span.31-kv0mRK", id: "cart.cart-page-content.span.31" })} id="cart.cart-page-content.span.7">{copy.loadingDiscounts}</span>
                  <span {...uiAttributes({ uid: "cart.cart-page-content.span.32-9sPUSG", id: "cart.cart-page-content.span.32" })} id="cart.cart-page-content.span.8">...</span>
                </div>
              ) : null}
              {productsDiscountMinor > 0 ? (
                <div {...uiAttributes({ uid: "cart.cart-page-content.div.45-GzxPj3", id: "cart.cart-page-content.div.45" })} id="cart.cart-page-content.div.12" className="flex justify-between text-primary">
                  <span {...uiAttributes({ uid: "cart.cart-page-content.span.33-08oX3U", id: "cart.cart-page-content.span.33" })} id="cart.cart-page-content.span.9">خصومات المنتجات والطلبات</span>
                  <span {...uiAttributes({ uid: "cart.cart-page-content.span.34-OLD7Dm", id: "cart.cart-page-content.span.34" })} id="cart.cart-page-content.span.10" className="font-semibold">
                    -{formatMoney(productsDiscountMinor)}
                  </span>
                </div>
              ) : null}
              <div {...uiAttributes({ uid: "cart.cart-page-content.div.46-6Kxbz6", id: "cart.cart-page-content.div.46" })} id="cart.cart-page-content.div.13" className="flex justify-between">
                <span {...uiAttributes({ uid: "cart.cart-page-content.span.35-krR2J6", id: "cart.cart-page-content.span.35" })} id="cart.cart-page-content.span.11" className="text-muted-foreground">
                  {unifiedDeliveryAvailable
                    ? "التوصيل الموحد"
                    : hasPendingShippingQuote
                      ? "رسوم الشحن المؤكدة حاليًا"
                      : "إجمالي الشحن"}
                </span>
                <span {...uiAttributes({ uid: "cart.cart-page-content.span.36-FZ9eJl", id: "cart.cart-page-content.span.36" })} id="cart.cart-page-content.span.12" className="font-semibold">
                  {unifiedDeliveryAvailable
                    ? "بانتظار العروض"
                    : formatMoney(shippingTotalMinor)}
                </span>
              </div>
              {shippingDiscountMinor > 0 && !unifiedDeliveryAvailable ? (
                <div {...uiAttributes({ uid: "cart.cart-page-content.div.47-trP7TS", id: "cart.cart-page-content.div.47" })} id="cart.cart-page-content.div.14" className="flex justify-between text-primary">
                  <span {...uiAttributes({ uid: "cart.cart-page-content.span.37-4m2gGs", id: "cart.cart-page-content.span.37" })} id="cart.cart-page-content.span.13">خصم الشحن</span>
                  <span {...uiAttributes({ uid: "cart.cart-page-content.span.38-SP8gEE", id: "cart.cart-page-content.span.38" })} id="cart.cart-page-content.span.14" className="font-semibold">
                    -{formatMoney(shippingDiscountMinor)}
                  </span>
                </div>
              ) : null}
              <div {...uiAttributes({ uid: "cart.cart-page-content.div.48-QIG3iP", id: "cart.cart-page-content.div.48" })} id="cart.cart-page-content.div.15" className="border-t border-outline-variant pt-3">
                <div {...uiAttributes({ uid: "cart.cart-page-content.div.49-BAh8Je", id: "cart.cart-page-content.div.49" })} id="cart.cart-page-content.div.16" className="flex justify-between text-base font-bold">
                  <span {...uiAttributes({ uid: "cart.cart-page-content.span.39-BRYEL2", id: "cart.cart-page-content.span.39" })} id="cart.cart-page-content.span.15">{copy.total}</span>
                  <span {...uiAttributes({ uid: "cart.cart-page-content.span.40-v73oQm", id: "cart.cart-page-content.span.40" })} id="cart.cart-page-content.span.16">{formatMoney(totalMinor, locale)}</span>
                </div>
              </div>
            </div>
            {hasPendingShippingQuote ? (
              <p {...uiAttributes({ uid: "cart.cart-page-content.p.22-9KW9MG", id: "cart.cart-page-content.p.22" })} id="cart.cart-page-content.p.5" className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm leading-6 text-on-surface">
                {unifiedDeliveryAvailable
                  ? "الإجمالي مبدئي ولا يشمل التوصيل الموحد. ستظهر عروض مقدمي التوصيل في صفحة الطلب، ولن تُضاف أي قيمة إلا بعد اختيارك وموافقتك."
                  : "الإجمالي مبدئي ولا يشمل عروض الشحن حسب المكان. ستُضاف قيمة كل عرض فقط بعد موافقتك عليه من صفحة تفاصيل الطلب."}
              </p>
            ) : null}
            {submitError ? (
              <p {...uiAttributes({ uid: "cart.cart-page-content.p.23-I52wpL", id: "cart.cart-page-content.p.23" })} id="cart.cart-page-content.p.6" className="mt-4 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
                {submitError}
              </p>
            ) : null}
            <button {...uiAttributes({ uid: "cart-checkout-0A1kX4", id: "cart-checkout", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "cart-checkout" } })}
              type="button"
              disabled={isSubmitting || isSessionLoading}
              onClick={submitOrder}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-on-primary transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 id="cart.cart-page-content.loader2" className="h-4 w-4 animate-spin" />
              ) : null}
              {copy.submit}
            </button>
            <p {...uiAttributes({ uid: "cart.cart-page-content.p.24-4kBJr3", id: "cart.cart-page-content.p.24" })} id="cart.cart-page-content.p.7" className="mt-3 text-xs leading-5 text-muted-foreground">
              {copy.submitHint}
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
