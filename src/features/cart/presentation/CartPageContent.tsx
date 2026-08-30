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
import { uiAttributes , createOpaqueUiInstanceId, composeUiInstanceId} from "@asol/ui-registry-core";

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
                key={group.sellerId} {...uiAttributes({ uid: "cart.cart-page-content.div.24-ZH6UD8", id: "cart.cart-page-content.div.24" , instance: createOpaqueUiInstanceId("iter-4700ef576f", String(group.sellerId))})}
                className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm"
              >
                <div {...uiAttributes({ uid: "cart.cart-page-content.div.25-SN5we4", id: "cart.cart-page-content.div.25" , instance: createOpaqueUiInstanceId("iter-6798018e39", String(group.sellerId))})} className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
                  <div {...uiAttributes({ uid: "cart.cart-page-content.div.26-Ks9XBW", id: "cart.cart-page-content.div.26" , instance: createOpaqueUiInstanceId("iter-8833b5237d", String(group.sellerId))})}>
                    <h2 {...uiAttributes({ uid: "cart.cart-page-content.h2.6-nA3JLR", id: "cart.cart-page-content.h2.6" , instance: createOpaqueUiInstanceId("iter-46827628aa", String(group.sellerId))})} className="text-sm font-bold">{copy.seller}</h2>
                    <p {...uiAttributes({ uid: "cart.cart-page-content.p.12-GD3NUM", id: "cart.cart-page-content.p.12" , instance: createOpaqueUiInstanceId("iter-13d73e8543", String(group.sellerId))})} className="text-xs text-muted-foreground">
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
                    <span {...uiAttributes({ uid: "cart.cart-page-content.span.17-apW0HY", id: "cart.cart-page-content.span.17" , instance: createOpaqueUiInstanceId("iter-9ed1b72e01", String(group.sellerId))})} className="rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                      يتضمن منتجًا يحتاج سيارة نقل
                    </span>
                  ) : null}
                </div>

                {discountQuote?.sellers
                  .find((seller) => seller.sellerUid === group.sellerId)
                  ?.applied.length ? (
                  <div {...uiAttributes({ uid: "cart.cart-page-content.div.27-jTQW1X", id: "cart.cart-page-content.div.27" , instance: createOpaqueUiInstanceId("iter-146abd56ab", String(group.sellerId))})} className="mb-3 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm">
                    <p {...uiAttributes({ uid: "cart.cart-page-content.p.13-3H6h3B", id: "cart.cart-page-content.p.13" , instance: createOpaqueUiInstanceId("iter-64b69410ef", String(group.sellerId))})} className="font-bold text-primary">خصومات مطبقة</p>
                    <div {...uiAttributes({ uid: "cart.cart-page-content.div.28-O8Vj1H", id: "cart.cart-page-content.div.28" , instance: createOpaqueUiInstanceId("iter-46fa0cd0f9", String(group.sellerId))})} className="mt-2 space-y-1 text-xs text-on-surface">
                      {discountQuote.sellers
                        .find((seller) => seller.sellerUid === group.sellerId)!
                        .applied.map((discount) => (
                          <div
                            key={discount.discountId} {...uiAttributes({ uid: "cart.cart-page-content.div.29-BOa9jv", id: "cart.cart-page-content.div.29" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-be631dc320", String(discount.discountId)), createOpaqueUiInstanceId("iter-03794db4a0", String(discount.discountId)))})}
                            className="flex justify-between gap-3"
                          >
                            <span {...uiAttributes({ uid: "cart.cart-page-content.span.18-JKWnQ3", id: "cart.cart-page-content.span.18" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-4bad829dea", String(discount.discountId)), createOpaqueUiInstanceId("iter-5d882af73c", String(discount.discountId)))})}>{discount.title}</span>
                            <span {...uiAttributes({ uid: "cart.cart-page-content.span.19-25Ct4Y", id: "cart.cart-page-content.span.19" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-9edc9938cd", String(discount.discountId)), createOpaqueUiInstanceId("iter-25cd09805a", String(discount.discountId)))})} className="font-semibold text-primary">
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

                <div {...uiAttributes({ uid: "cart.cart-page-content.div.30-jMX7h6", id: "cart.cart-page-content.div.30" , instance: createOpaqueUiInstanceId("iter-ed2260c138", String(group.sellerId))})} className="space-y-3">
                  {group.items.map((item) => (
                    <article
                      key={item.id} {...uiAttributes({ uid: "cart.cart-page-content.article-108XMM", id: "cart.cart-page-content.article" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-14795fa10a", String(item.id)), createOpaqueUiInstanceId("iter-19289279a6", String(item.id)))})}
                      className="rounded-xl border border-outline-variant bg-background p-4"
                    >
                      <div {...uiAttributes({ uid: "cart.cart-page-content.div.31-tCF21Q", id: "cart.cart-page-content.div.31" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-a65cbfe020", String(item.id)), createOpaqueUiInstanceId("iter-5b05aab02d", String(item.id)))})} className="flex gap-4">
                        <div {...uiAttributes({ uid: "cart.cart-page-content.div.32-013PnD", id: "cart.cart-page-content.div.32" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-9c3ffb7ed5", String(item.id)), createOpaqueUiInstanceId("iter-4a643aaf08", String(item.id)))})} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-muted">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <div {...uiAttributes({ uid: "cart.cart-page-content.div.33-S8Rnyd", id: "cart.cart-page-content.div.33" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-c496012579", String(item.id)), createOpaqueUiInstanceId("iter-5966598851", String(item.id)))})} className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              {copy.noImage}
                            </div>
                          )}
                        </div>
                        <div {...uiAttributes({ uid: "cart.cart-page-content.div.34-0Sf8Ay", id: "cart.cart-page-content.div.34" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-20b51dca69", String(item.id)), createOpaqueUiInstanceId("iter-e45dd35e7d", String(item.id)))})} className="min-w-0 flex-1">
                          <div {...uiAttributes({ uid: "cart.cart-page-content.div.35-P7y6ds", id: "cart.cart-page-content.div.35" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-d29e31708e", String(item.id)), createOpaqueUiInstanceId("iter-e1a2cd4b38", String(item.id)))})} className="flex flex-wrap items-start justify-between gap-3">
                            <div {...uiAttributes({ uid: "cart.cart-page-content.div.36-6hwURf", id: "cart.cart-page-content.div.36" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-4f51fe2f0d", String(item.id)), createOpaqueUiInstanceId("iter-c9a71f24d4", String(item.id)))})} className="min-w-0">
                              <h2 {...uiAttributes({ uid: "cart.cart-page-content.h2.7-5VxQJK", id: "cart.cart-page-content.h2.7" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-838e0b6bd5", String(item.id)), createOpaqueUiInstanceId("iter-b2dd2543dd", String(item.id)))})} className="truncate font-bold text-on-surface">
                                {item.name}
                              </h2>
                              {item.requiresSpecialVehicle ? (
                                <span {...uiAttributes({ uid: "cart.cart-page-content.span.20-6wK5J3", id: "cart.cart-page-content.span.20" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-a59bef63cb", String(item.id)), createOpaqueUiInstanceId("iter-5ab4100c44", String(item.id)))})} className="mt-2 inline-flex rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                                  يحتاج سيارة خاصة
                                </span>
                              ) : null}
                            </div>
                            <button {...uiAttributes({ uid: "cart-remove-SlqB5g", id: "cart-remove", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "cart-remove" } , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-04f04cb4df", String(item.id)), createOpaqueUiInstanceId("iter-a140ec6595", String(item.id)))})}
                              type="button"
                              onClick={() => void removeCartItem(item.id)}
                              className="rounded-full p-2 text-muted-foreground transition"
                              aria-label="إزالة من السلة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div {...uiAttributes({ uid: "cart.cart-page-content.div.37-ETX8Fp", id: "cart.cart-page-content.div.37" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-491520b1e2", String(item.id)), createOpaqueUiInstanceId("iter-9789069e99", String(item.id)))})} className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div {...uiAttributes({ uid: "cart.cart-page-content.div.38-t2wW4j", id: "cart.cart-page-content.div.38" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-5851d404cd", String(item.id)), createOpaqueUiInstanceId("iter-01f8d2ed4f", String(item.id)))})} className="inline-flex items-center overflow-hidden rounded-lg border border-outline-variant">
                              <button {...uiAttributes({ uid: "cart-decrease-AyGe00", id: "cart-decrease", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "cart-decrease" } , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-0503ba1f70", String(item.id)), createOpaqueUiInstanceId("iter-c23b2bbe52", String(item.id)))})}
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
                              <span {...uiAttributes({ uid: "cart.cart-page-content.span.21-iL0sNo", id: "cart.cart-page-content.span.21" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-6410db3132", String(item.id)), createOpaqueUiInstanceId("iter-324dbdb0e3", String(item.id)))})} className="min-w-10 px-3 text-center text-sm font-bold">
                                {item.quantity}
                              </span>
                              <button {...uiAttributes({ uid: "cart-increase-EKf2uz", id: "cart-increase", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "cart-increase" } , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-e3848b468e", String(item.id)), createOpaqueUiInstanceId("iter-13f7dc749f", String(item.id)))})}
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
                            <div {...uiAttributes({ uid: "cart.cart-page-content.div.39-BN8nrP", id: "cart.cart-page-content.div.39" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-68a816cfa9", String(item.id)), createOpaqueUiInstanceId("iter-ebc6d76c7f", String(item.id)))})} className="text-end">
                              <p {...uiAttributes({ uid: "cart.cart-page-content.p.14-9X8WlW", id: "cart.cart-page-content.p.14" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-b3d58c7673", String(item.id)), createOpaqueUiInstanceId("iter-72463fe3b8", String(item.id)))})} className="text-xs text-muted-foreground">
                                {copy.unitPrice}
                              </p>
                              <p {...uiAttributes({ uid: "cart.cart-page-content.p.15-5fWmE7", id: "cart.cart-page-content.p.15" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-fe2e924720", String(item.id)), createOpaqueUiInstanceId("iter-2ff5511788", String(item.id)))})} className="font-bold">
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

                <details {...uiAttributes({ uid: "cart.cart-page-content.details-2lY116", id: "cart.cart-page-content.details" , instance: createOpaqueUiInstanceId("iter-16bb18e524", String(group.sellerId))})} className="mt-4 rounded-lg border border-outline-variant bg-muted/20 p-3">
                  <summary {...uiAttributes({ uid: "cart.cart-page-content.summary-x3AEdS", id: "cart.cart-page-content.summary" , instance: createOpaqueUiInstanceId("iter-8206c89198", String(group.sellerId))})} className="flex list-none items-center justify-between gap-3 text-sm font-bold">
                    سياسة الشحن والإرجاع الخاصة بالبائع
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </summary>
                  <div {...uiAttributes({ uid: "cart.cart-page-content.div.40-ASH060", id: "cart.cart-page-content.div.40" , instance: createOpaqueUiInstanceId("iter-7b82b65019", String(group.sellerId))})} className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {group.settings.shippingPricing.notes ? (
                      <p {...uiAttributes({ uid: "cart.cart-page-content.p.16-tUA8JW", id: "cart.cart-page-content.p.16" , instance: createOpaqueUiInstanceId("iter-774712ca08", String(group.sellerId))})} className="whitespace-pre-wrap rounded-lg bg-background p-3">
                        ملاحظات الشحن: {group.settings.shippingPricing.notes}
                      </p>
                    ) : null}
                    <p {...uiAttributes({ uid: "cart.cart-page-content.p.17-tTJw65", id: "cart.cart-page-content.p.17" , instance: createOpaqueUiInstanceId("iter-2deda9621e", String(group.sellerId))})}>
                      الحالة:{""}
                      <span {...uiAttributes({ uid: "cart.cart-page-content.span.22-sM1I4r", id: "cart.cart-page-content.span.22" , instance: createOpaqueUiInstanceId("iter-ff72822c86", String(group.sellerId))})} className="font-semibold text-on-surface">
                        {group.settings.returns.enabled
                          ? "الإرجاع متاح"
                          : "الإرجاع غير متاح"}
                      </span>
                    </p>
                    {group.settings.returns.enabled ? (
                      <>
                        <p {...uiAttributes({ uid: "cart.cart-page-content.p.18-0Ffu0F", id: "cart.cart-page-content.p.18" , instance: createOpaqueUiInstanceId("iter-e3a1ec5082", String(group.sellerId))})}>
                          عدد أيام الإرجاع:{""}
                          <span {...uiAttributes({ uid: "cart.cart-page-content.span.23-8PTDKC", id: "cart.cart-page-content.span.23" , instance: createOpaqueUiInstanceId("iter-fa191c7b93", String(group.sellerId))})} className="font-semibold text-on-surface">
                            {group.settings.returns.returnWindowDays}
                          </span>
                        </p>
                        <p {...uiAttributes({ uid: "cart.cart-page-content.p.19-1S4ZFU", id: "cart.cart-page-content.p.19" , instance: createOpaqueUiInstanceId("iter-8b163f4d3d", String(group.sellerId))})}>
                          تكلفة شحن الإرجاع:{""}
                          <span {...uiAttributes({ uid: "cart.cart-page-content.span.24-VD31Nc", id: "cart.cart-page-content.span.24" , instance: createOpaqueUiInstanceId("iter-1b8a900c31", String(group.sellerId))})} className="font-semibold text-on-surface">
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
                      <p {...uiAttributes({ uid: "cart.cart-page-content.p.20-DWy1M3", id: "cart.cart-page-content.p.20" , instance: createOpaqueUiInstanceId("iter-70a2d66d28", String(group.sellerId))})} className="whitespace-pre-wrap rounded-lg bg-background p-3">
                        {group.settings.returns.policyText}
                      </p>
                    ) : (
                      <p {...uiAttributes({ uid: "cart.cart-page-content.p.21-V6xrDW", id: "cart.cart-page-content.p.21" , instance: createOpaqueUiInstanceId("iter-af614fdcc0", String(group.sellerId))})}>لا يوجد نص سياسة مضاف من البائع.</p>
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
