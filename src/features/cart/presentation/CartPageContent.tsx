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
    <main id='features-cart-presentation-cartpagecontent-main-1-13frco' className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div id='features-cart-presentation-cartpagecontent-div-2-vvynjg' className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div id='features-cart-presentation-cartpagecontent-div-3-ez1ckc'>
          <h1 id='features-cart-presentation-cartpagecontent-heading-4-rokwzs' className="text-2xl font-bold text-on-surface">{copy.title}</h1>
          <p id='features-cart-presentation-cartpagecontent-text-5-suyhzx' className="mt-1 text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        {items.length > 0 ? (
          <button id='features-cart-presentation-cartpagecontent-button-6-po7t3o'
            type="button"
            onClick={() => void clearCart()}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition"
          >
            <Trash2 id='features-cart-presentation-cartpagecontent-trash2-7-mmngbm' className="h-4 w-4" />
            {copy.clear}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <section id='features-cart-presentation-cartpagecontent-section-8-fkqvtx' className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
          <div id='features-cart-presentation-cartpagecontent-div-9-9dwoym' className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShoppingCart id='features-cart-presentation-cartpagecontent-shoppingcart-10-rtevqe' className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 id='features-cart-presentation-cartpagecontent-heading-11-atp1hq' className="mt-4 text-lg font-bold">{copy.emptyTitle}</h2>
          <p id='features-cart-presentation-cartpagecontent-text-12-tyvvjq' className="mt-2 text-sm text-muted-foreground">
            {copy.emptyText}
          </p>
          <Link id='features-cart-presentation-cartpagecontent-link-13-xnwsy5'
            href="/home"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary"
          >
            {copy.browse}
          </Link>
        </section>
      ) : (
        <div id='features-cart-presentation-cartpagecontent-div-14-9oyhsz' className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section id='features-cart-presentation-cartpagecontent-section-15-vf3uej' className="space-y-4">
            {unifiedDeliveryAvailable ? (
              <div id='features-cart-presentation-cartpagecontent-div-16-okx0be' className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div id='features-cart-presentation-cartpagecontent-div-17-sfkpo5' className="flex items-start gap-3">
                  <Truck id='features-cart-presentation-cartpagecontent-truck-18-9wqsw3' className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div id='features-cart-presentation-cartpagecontent-div-19-gxltgq'>
                    <h2 id='features-cart-presentation-cartpagecontent-heading-20-i60vpa' className="font-bold text-primary">
                      توصيل موحّد لعدة بائعين
                    </h2>
                    <p id='features-cart-presentation-cartpagecontent-text-21-kopyi7' className="mt-1 text-sm leading-6 text-muted-foreground">
                      سيطلب النظام عرضًا واحدًا لجمع المنتجات من{""}
                      {sellerGroups.length} بائعين وتسليمها إليك في شحنة واحدة،
                      ولن تُحسب رسوم كل بائع بصورة منفصلة.
                    </p>
                    <p id='features-cart-presentation-cartpagecontent-text-22-nilfhl' className="mt-2 text-xs font-semibold text-on-surface">
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
                key={group.sellerId}
                className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant pb-3">
                  <div>
                    <h2 className="text-sm font-bold">{copy.seller}</h2>
                    <p className="text-xs text-muted-foreground">
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
                    <span className="rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                      يتضمن منتجًا يحتاج سيارة نقل
                    </span>
                  ) : null}
                </div>

                {discountQuote?.sellers
                  .find((seller) => seller.sellerUid === group.sellerId)
                  ?.applied.length ? (
                  <div className="mb-3 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm">
                    <p className="font-bold text-primary">خصومات مطبقة</p>
                    <div className="mt-2 space-y-1 text-xs text-on-surface">
                      {discountQuote.sellers
                        .find((seller) => seller.sellerUid === group.sellerId)!
                        .applied.map((discount) => (
                          <div
                            key={discount.discountId}
                            className="flex justify-between gap-3"
                          >
                            <span>{discount.title}</span>
                            <span className="font-semibold text-primary">
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
                              {copy.noImage}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate font-bold text-on-surface">
                                {item.name}
                              </h2>
                              {item.requiresSpecialVehicle ? (
                                <span className="mt-2 inline-flex rounded-full bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">
                                  يحتاج سيارة خاصة
                                </span>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => void removeCartItem(item.id)}
                              className="rounded-full p-2 text-muted-foreground transition"
                              aria-label="إزالة من السلة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="inline-flex items-center overflow-hidden rounded-lg border border-outline-variant">
                              <button
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
                              <span className="min-w-10 px-3 text-center text-sm font-bold">
                                {item.quantity}
                              </span>
                              <button
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
                            <div className="text-end">
                              <p className="text-xs text-muted-foreground">
                                {copy.unitPrice}
                              </p>
                              <p className="font-bold">
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

                <details className="mt-4 rounded-lg border border-outline-variant bg-muted/20 p-3">
                  <summary className="flex list-none items-center justify-between gap-3 text-sm font-bold">
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
                      الحالة:{""}
                      <span className="font-semibold text-on-surface">
                        {group.settings.returns.enabled
                          ? "الإرجاع متاح"
                          : "الإرجاع غير متاح"}
                      </span>
                    </p>
                    {group.settings.returns.enabled ? (
                      <>
                        <p>
                          عدد أيام الإرجاع:{""}
                          <span className="font-semibold text-on-surface">
                            {group.settings.returns.returnWindowDays}
                          </span>
                        </p>
                        <p>
                          تكلفة شحن الإرجاع:{""}
                          <span className="font-semibold text-on-surface">
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

          <aside id='features-cart-presentation-cartpagecontent-aside-23-4r03s6' className="h-fit rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
            <h2 id='features-cart-presentation-cartpagecontent-heading-24-mrjytu' className="font-bold">{copy.summary}</h2>
            <div id='features-cart-presentation-cartpagecontent-div-25-ovi1bq' className="mt-4 space-y-3 text-sm">
              <label id='features-cart-presentation-cartpagecontent-label-26-plxomv' className="block space-y-1.5">
                <span id='features-cart-presentation-cartpagecontent-text-27-dbjv8k' className="text-xs font-semibold text-muted-foreground">
                  {copy.coupon}
                </span>
                <input id='features-cart-presentation-cartpagecontent-input-28-m7fa0d'
                  value={couponText}
                  onChange={(event) => setCouponText(event.target.value)}
                  placeholder="WELCOME10"
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
                />
                <span id='features-cart-presentation-cartpagecontent-text-29-xbm5jf' className="block text-[11px] text-muted-foreground">
                  {copy.couponHint}
                </span>
              </label>
              <div id='features-cart-presentation-cartpagecontent-div-30-0vqpb3' className="flex justify-between">
                <span id='features-cart-presentation-cartpagecontent-text-31-bmii6w' className="text-muted-foreground">{copy.itemCount}</span>
                <span id='features-cart-presentation-cartpagecontent-text-32-vr6qvr' className="font-semibold">{totalQuantity}</span>
              </div>
              <div id='features-cart-presentation-cartpagecontent-div-33-g5xz5z' className="flex justify-between">
                <span id='features-cart-presentation-cartpagecontent-text-34-lsn1rl' className="text-muted-foreground">{copy.productsTotal}</span>
                <span id='features-cart-presentation-cartpagecontent-text-35-empm0c' className="font-semibold">
                  {formatMoney(productsTotalMinor, locale)}
                </span>
              </div>
              {isLoadingDiscountQuote ? (
                <div id='features-cart-presentation-cartpagecontent-div-36-16tald' className="flex justify-between text-primary">
                  <span id='features-cart-presentation-cartpagecontent-text-37-w1y4z0'>{copy.loadingDiscounts}</span>
                  <span id='features-cart-presentation-cartpagecontent-text-38-vcgbkl'>...</span>
                </div>
              ) : null}
              {productsDiscountMinor > 0 ? (
                <div id='features-cart-presentation-cartpagecontent-div-39-1wgesh' className="flex justify-between text-primary">
                  <span id='features-cart-presentation-cartpagecontent-text-40-up7xk9'>خصومات المنتجات والطلبات</span>
                  <span id='features-cart-presentation-cartpagecontent-text-41-xq1aii' className="font-semibold">
                    -{formatMoney(productsDiscountMinor)}
                  </span>
                </div>
              ) : null}
              <div id='features-cart-presentation-cartpagecontent-div-42-ayifjj' className="flex justify-between">
                <span id='features-cart-presentation-cartpagecontent-text-43-86etka' className="text-muted-foreground">
                  {unifiedDeliveryAvailable
                    ? "التوصيل الموحد"
                    : hasPendingShippingQuote
                      ? "رسوم الشحن المؤكدة حاليًا"
                      : "إجمالي الشحن"}
                </span>
                <span id='features-cart-presentation-cartpagecontent-text-44-ktjhf1' className="font-semibold">
                  {unifiedDeliveryAvailable
                    ? "بانتظار العروض"
                    : formatMoney(shippingTotalMinor)}
                </span>
              </div>
              {shippingDiscountMinor > 0 && !unifiedDeliveryAvailable ? (
                <div id='features-cart-presentation-cartpagecontent-div-45-cl3xui' className="flex justify-between text-primary">
                  <span id='features-cart-presentation-cartpagecontent-text-46-u28lyf'>خصم الشحن</span>
                  <span id='features-cart-presentation-cartpagecontent-text-47-7mt9qe' className="font-semibold">
                    -{formatMoney(shippingDiscountMinor)}
                  </span>
                </div>
              ) : null}
              <div id='features-cart-presentation-cartpagecontent-div-48-fqsurl' className="border-t border-outline-variant pt-3">
                <div id='features-cart-presentation-cartpagecontent-div-49-e8iuci' className="flex justify-between text-base font-bold">
                  <span id='features-cart-presentation-cartpagecontent-text-50-8uqa0a'>{copy.total}</span>
                  <span id='features-cart-presentation-cartpagecontent-text-51-xwxzad'>{formatMoney(totalMinor, locale)}</span>
                </div>
              </div>
            </div>
            {hasPendingShippingQuote ? (
              <p id='features-cart-presentation-cartpagecontent-text-52-ihymvt' className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm leading-6 text-on-surface">
                {unifiedDeliveryAvailable
                  ? "الإجمالي مبدئي ولا يشمل التوصيل الموحد. ستظهر عروض مقدمي التوصيل في صفحة الطلب، ولن تُضاف أي قيمة إلا بعد اختيارك وموافقتك."
                  : "الإجمالي مبدئي ولا يشمل عروض الشحن حسب المكان. ستُضاف قيمة كل عرض فقط بعد موافقتك عليه من صفحة تفاصيل الطلب."}
              </p>
            ) : null}
            {submitError ? (
              <p id='features-cart-presentation-cartpagecontent-text-53-ujehbi' className="mt-4 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
                {submitError}
              </p>
            ) : null}
            <button id="features-cart-presentation-cartpagecontent-button-54-oeqmtd"
              type="button"
              disabled={isSubmitting || isSessionLoading}
              onClick={submitOrder}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-on-primary transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 id='features-cart-presentation-cartpagecontent-loader2-55-ms5wre' className="h-4 w-4 animate-spin" />
              ) : null}
              {copy.submit}
            </button>
            <p id='features-cart-presentation-cartpagecontent-text-56-m7h4z3' className="mt-3 text-xs leading-5 text-muted-foreground">
              {copy.submitHint}
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
