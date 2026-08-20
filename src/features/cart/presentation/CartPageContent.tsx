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

import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import {
  clearCart,
  getCartTotalMinor,
  removeCartItem,
  updateCartItemQuantity,
} from "@/features/cart/cart-store";
import { calculateSellerShipping } from "@/features/cart/shipping-pricing";
import { useCart } from "@/features/cart/use-cart";
import { useSession } from "@/features/auth/components/SessionProvider";
import { useTranslation } from "@/lib/i18n";
import { notifications } from "@/features/notifications";
import { useCartDiscountQuote } from "@/features/seller-discounts";
import {
  EMPTY_PROFILE_FULFILLMENT_SETTINGS,
  normalizeProfileFulfillmentSettings,
  type ProfileFulfillmentSettings,
} from "@/features/profile/entities/profile-fulfillment-settings.entity";
import { profileService } from "@/features/profile/services/profile-service";
import { formatCurrencyMinor } from "@asol/format-core";

function formatMoney(minor: number, locale = "ar") {
  return formatCurrencyMinor(minor, { locale });
}

function orderErrorMessage(message: string) {
  if (message.includes("Buyer phone is required")) {
    return "يجب توفر رقم هاتف في الحساب قبل إرسال الطلب.";
  }
  if (message.includes("Delivery carrier required")) {
    return "لا يمكن إرسال الطلب لأن أحد البائعين لم يربط مقدم خدمة توصيل في إعدادات الشحن والإرجاع.";
  }
  if (message.includes("userNotFound")) {
    return "يجب تسجيل الدخول قبل إرسال الطلب.";
  }
  return message || "تعذر إرسال الطلب. حاول مرة أخرى.";
}

export function CartPageContent() {
  const router = useRouter();
  const { locale } = useTranslation();
  const copy = locale === "ar" ? {
    title: "السلة", description: "راجع المنتجات والخدمات قبل إرسالها كطلب رسمي بنظام الدفع عند الاستلام.", clear: "تفريغ السلة",
    emptyTitle: "السلة فارغة", emptyText: "عند إضافة منتج أو خدمة ستظهر هنا، وستظهر النقطة الحمراء في الهيدر.", browse: "تصفح المنتجات",
    seller: "البائع", viewSeller: "عرض بروفايل البائع", noImage: "بدون صورة", unitPrice: "سعر الوحدة", summary: "ملخص السلة",
    coupon: "كود الخصم", couponHint: "يمكن إدخال أكثر من كود بفاصلة.", itemCount: "عدد العناصر", productsTotal: "إجمالي المنتجات",
    loadingDiscounts: "جاري حساب الخصومات", total: "الإجمالي", submit: "إرسال الطلب", submitHint: "سيتم إنشاء الطلب الرسمي من قاعدة البيانات، والدفع عند الاستلام فقط.",
  } : {
    title: "Cart", description: "Review products and services before submitting an official cash-on-delivery order.", clear: "Clear cart",
    emptyTitle: "Your cart is empty", emptyText: "Products and services you add will appear here.", browse: "Browse products",
    seller: "Seller", viewSeller: "View seller profile", noImage: "No image", unitPrice: "Unit price", summary: "Cart summary",
    coupon: "Discount code", couponHint: "Separate multiple codes with commas.", itemCount: "Items", productsTotal: "Products total",
    loadingDiscounts: "Calculating discounts", total: "Total", submit: "Submit order", submitHint: "The official order will be created in the database. Payment is cash on delivery only.",
  };
  const { session, isLoading: isSessionLoading } = useSession();
  const { items, totalQuantity } = useCart();
  const [sellerSettings, setSellerSettings] = React.useState<
    Record<string, ProfileFulfillmentSettings>
  >({});
  const [qualifiedDeliveryAvailable, setQualifiedDeliveryAvailable] =
    React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [couponText, setCouponText] = React.useState("");
  const productsTotalMinor = getCartTotalMinor(items);
  const sellerIds = React.useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.sellerId))).filter(Boolean),
    [items],
  );

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        sellerIds.map(async (sellerId) => {
          try {
            const settings =
              await profileService.getFulfillmentSettings(sellerId);
            return [
              sellerId,
              normalizeProfileFulfillmentSettings(settings),
            ] as const;
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

  React.useEffect(() => {
    let cancelled = false;
    if (sellerIds.length < 2) {
      setQualifiedDeliveryAvailable(false);
      return;
    }
    void profileService
      .getUsersBySpecialty(46, 132, 0, 1)
      .then((users) => {
        if (!cancelled) setQualifiedDeliveryAvailable(users.length > 0);
      })
      .catch(() => {
        if (!cancelled) setQualifiedDeliveryAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sellerIds.length]);

  const sellerGroups = React.useMemo(
    () =>
      sellerIds.map((sellerId) => {
        const sellerItems = items.filter((item) => item.sellerId === sellerId);
        const subtotalMinor = getCartTotalMinor(sellerItems);
        const settings =
          sellerSettings[sellerId] ?? EMPTY_PROFILE_FULFILLMENT_SETTINGS;
        const hasSpecialVehicle = sellerItems.some(
          (item) => item.requiresSpecialVehicle,
        );
        const shipping = calculateSellerShipping(
          settings.shippingPricing,
          subtotalMinor,
          hasSpecialVehicle,
        );

        return {
          sellerId,
          items: sellerItems,
          settings,
          subtotalMinor,
          shippingMinor: shipping.confirmedShippingMinor,
          specialVehicleFeeMinor: shipping.specialVehicleFeeMinor,
          quoteRequired: shipping.quoteRequired,
          eligibleForFree: shipping.freeThresholdApplied,
          hasSpecialVehicle,
        };
      }),
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
      const result = await asolApi.post<{ orderId: string }>(
        ASOL_API_ROUTES.orders.fromCart,
        {
          uid: session.uid,
          phone: session.phone,
          couponCodes,
          items: items.map((item) => ({
            productId: item.productId,
            sellerId: item.sellerId,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            unitPriceMinor: item.unitPriceMinor,
            priceLabel: item.priceLabel,
            requiresSpecialVehicle: item.requiresSpecialVehicle,
            mainCategoryId: item.mainCategoryId,
          })),
        },
        { suppressErrorLog: true },
      );
      await notifications.publishEvent({
        event: {
          name: "orders.created",
          uid: session.uid,
          dedupeKey: `orders.created:${result.orderId}:buyer:${session.uid}`,
          variables: {
            orderId: result.orderId,
            orderNumber: result.orderId,
          },
        },
        locale: "ar",
      });
      await clearCart();
      router.push(
        `/orders/details?orderId=${encodeURIComponent(result.orderId)}`,
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
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => void clearCart()}
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition"
          >
            <Trash2 className="h-4 w-4" />
            {copy.clear}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <section className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-bold">{copy.emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.emptyText}
          </p>
          <Link
            href="/home"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary"
          >
            {copy.browse}
          </Link>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            {unifiedDeliveryAvailable ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <h2 className="font-bold text-primary">
                      توصيل موحّد لعدة بائعين
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      سيطلب النظام عرضًا واحدًا لجمع المنتجات من{""}
                      {sellerGroups.length} بائعين وتسليمها إليك في شحنة واحدة،
                      ولن تُحسب رسوم كل بائع بصورة منفصلة.
                    </p>
                    <p className="mt-2 text-xs font-semibold text-on-surface">
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

          <aside className="h-fit rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
            <h2 className="font-bold">{copy.summary}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-muted-foreground">
                  {copy.coupon}
                </span>
                <input
                  value={couponText}
                  onChange={(event) => setCouponText(event.target.value)}
                  placeholder="WELCOME10"
                  className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
                />
                <span className="block text-[11px] text-muted-foreground">
                  {copy.couponHint}
                </span>
              </label>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{copy.itemCount}</span>
                <span className="font-semibold">{totalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{copy.productsTotal}</span>
                <span className="font-semibold">
                  {formatMoney(productsTotalMinor, locale)}
                </span>
              </div>
              {isLoadingDiscountQuote ? (
                <div className="flex justify-between text-primary">
                  <span>{copy.loadingDiscounts}</span>
                  <span>...</span>
                </div>
              ) : null}
              {productsDiscountMinor > 0 ? (
                <div className="flex justify-between text-primary">
                  <span>خصومات المنتجات والطلبات</span>
                  <span className="font-semibold">
                    -{formatMoney(productsDiscountMinor)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {unifiedDeliveryAvailable
                    ? "التوصيل الموحد"
                    : hasPendingShippingQuote
                      ? "رسوم الشحن المؤكدة حاليًا"
                      : "إجمالي الشحن"}
                </span>
                <span className="font-semibold">
                  {unifiedDeliveryAvailable
                    ? "بانتظار العروض"
                    : formatMoney(shippingTotalMinor)}
                </span>
              </div>
              {shippingDiscountMinor > 0 && !unifiedDeliveryAvailable ? (
                <div className="flex justify-between text-primary">
                  <span>خصم الشحن</span>
                  <span className="font-semibold">
                    -{formatMoney(shippingDiscountMinor)}
                  </span>
                </div>
              ) : null}
              <div className="border-t border-outline-variant pt-3">
                <div className="flex justify-between text-base font-bold">
                  <span>{copy.total}</span>
                  <span>{formatMoney(totalMinor, locale)}</span>
                </div>
              </div>
            </div>
            {hasPendingShippingQuote ? (
              <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm leading-6 text-on-surface">
                {unifiedDeliveryAvailable
                  ? "الإجمالي مبدئي ولا يشمل التوصيل الموحد. ستظهر عروض مقدمي التوصيل في صفحة الطلب، ولن تُضاف أي قيمة إلا بعد اختيارك وموافقتك."
                  : "الإجمالي مبدئي ولا يشمل عروض الشحن حسب المكان. ستُضاف قيمة كل عرض فقط بعد موافقتك عليه من صفحة تفاصيل الطلب."}
              </p>
            ) : null}
            {submitError ? (
              <p className="mt-4 rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
                {submitError}
              </p>
            ) : null}
            <button
              type="button"
              disabled={isSubmitting || isSessionLoading}
              onClick={submitOrder}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-on-primary transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {copy.submit}
            </button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {copy.submitHint}
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
