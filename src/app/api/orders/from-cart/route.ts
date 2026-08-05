import { apiSuccess } from "@/core/api/api-response";
import { resolveCartPrices } from "@/features/cart/services/cart-catalogue-pricing.server";
import { createMultiSellerDeliveryDraft } from "@/features/cart/multi-seller-delivery-planner";
import { calculateSellerShipping } from "@/features/cart/shipping-pricing";
import { withNotificationGrants } from "@/features/notifications/domain/notification-grant-envelope";
import { NotificationGrantCollector } from "@/features/notifications/services/notification-grant-collector.server";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { sellerDiscountService } from "@/features/seller-discounts/services/seller-discount-service.server";
import { logServerSystemIssue } from "@/features/system-logs/services/persistent-system-log-service.server";
import { getMarketplaceOrderService } from "@/modules/data-access/domains/marketplace-orders/index.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";
import {
  actorFromInput,
  mapOrderError,
  moneyMinor,
} from "../order-api-helpers";

interface CartOrderItemInput {
  productId: string;
  sellerId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  quantity: number;
  unitPriceMinor: number;
  priceLabel?: string;
  requiresSpecialVehicle?: boolean;
  mainCategoryId?: string;
}

interface FromCartInput {
  uid: string;
  phone?: string;
  couponCodes?: string[];
  items: CartOrderItemInput[];
}

function firstCarrier(
  settings: Awaited<ReturnType<typeof profileService.getFulfillmentSettings>>,
) {
  return settings.carrierUids.find(Boolean) ?? "";
}

function shippingForSeller(
  settings: Awaited<ReturnType<typeof profileService.getFulfillmentSettings>>,
  items: CartOrderItemInput[],
) {
  const subtotal = items.reduce(
    (total, item) => total + moneyMinor(item.unitPriceMinor) * item.quantity,
    0,
  );
  const result = calculateSellerShipping(
    settings.shippingPricing,
    subtotal,
    items.some((item) => item.requiresSpecialVehicle),
  );
  return {
    confirmedShipping: result.confirmedShippingMinor,
    quoteRequired: result.quoteRequired,
    specialVehicleFee: result.specialVehicleFeeMinor,
  };
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/orders/from-cart", async () => {
    try {
      const body = (await request.json()) as FromCartInput;
      const actor = actorFromInput(
        { uid: body.uid, phone: body.phone },
        "buyer",
      );
      const notificationGrants = new NotificationGrantCollector(body.uid);
      if (!Array.isArray(body.items) || body.items.length === 0) {
        throw new Error("Cart items are required");
      }

      const buyerContacts = await profileService.getContacts(body.uid);
      const buyerPhone = buyerContacts.phones[0]?.number ?? "";
      const buyerLocation = buyerContacts.locations[0] ?? null;
      if (!buyerPhone || !buyerLocation?.address) {
        throw new Error("Buyer profile phone and address are required");
      }

      // The catalogue decides the price, the seller, and the name — not the
      // request. Without this a modified client could order any product at any
      // price, since the only other check is that the number is a non-negative
      // integer. A stale cart is corrected silently rather than rejected.
      const catalogue = await resolveCartPrices(
        body.items.map((item) => item.productId),
      );
      body.items = body.items.map((item) => {
        const authoritative = catalogue.get(item.productId.trim());
        if (!authoritative) throw new Error("productUnavailable");
        return {
          ...item,
          unitPriceMinor: authoritative.unitPriceMinor,
          priceLabel: authoritative.priceLabel || item.priceLabel,
          sellerId: authoritative.sellerId,
          name: authoritative.name,
          requiresSpecialVehicle: authoritative.requiresSpecialVehicle,
        };
      });

      const sellerIds = Array.from(
        new Set(body.items.map((item) => item.sellerId)),
      ).filter(Boolean);
      const fulfillmentBySeller = new Map<
        string,
        Awaited<ReturnType<typeof profileService.getFulfillmentSettings>>
      >();
      const carrierBySeller = new Map<string, string>();
      const pickupBySeller = new Map<string, Record<string, unknown>>();
      for (const sellerId of sellerIds) {
        const [settings, contacts] = await Promise.all([
          profileService.getFulfillmentSettings(sellerId),
          profileService.getContacts(sellerId),
        ]);
        const carrierUid = firstCarrier(settings);
        fulfillmentBySeller.set(sellerId, settings);
        carrierBySeller.set(sellerId, carrierUid);
        const pickup = contacts.locations[0];
        pickupBySeller.set(sellerId, {
          sellerId,
          address: pickup?.address ?? "",
          latitude: pickup?.latitude ?? null,
          longitude: pickup?.longitude ?? null,
          phone: contacts.phones[0]?.number ?? "",
        });
      }

      const qualifiedProviders =
        sellerIds.length > 1
          ? await profileService
              .getUsersBySpecialty(46, 132, 0, 500)
              .catch(() => [])
          : [];
      const sellerDelivery = new Map<
        string,
        ReturnType<typeof shippingForSeller>
      >();
      for (const sellerId of sellerIds) {
        sellerDelivery.set(
          sellerId,
          shippingForSeller(
            fulfillmentBySeller.get(sellerId)!,
            body.items.filter((item) => item.sellerId === sellerId),
          ),
        );
      }
      const discountQuote = await sellerDiscountService.quoteCart({
        items: body.items.map((item) => ({
          id: `${item.productId}:${item.sellerId}`,
          productId: item.productId,
          sellerId: item.sellerId,
          name: item.name,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          mainCategoryId: item.mainCategoryId ?? "",
        })),
        context: {
          buyerUid: body.uid,
          couponCodes: Array.isArray(body.couponCodes) ? body.couponCodes : [],
          isApp: true,
          isFirstOrder: false,
          isFollower: false,
        },
      });
      const deliveryDraft = createMultiSellerDeliveryDraft(
        sellerIds.map((sellerId) => {
          const shipping = sellerDelivery.get(sellerId)!;
          const items = body.items.filter((item) => item.sellerId === sellerId);
          return {
            sellerId,
            carrierUids: fulfillmentBySeller.get(sellerId)?.carrierUids ?? [],
            fallbackShippingMinor: shipping.confirmedShipping,
            fallbackSpecialVehicleFeeMinor: shipping.specialVehicleFee,
            requiresLocationQuote: shipping.quoteRequired,
            requiresSpecialVehicle: items.some(
              (item) => item.requiresSpecialVehicle === true,
            ),
          };
        }),
        qualifiedProviders.map((provider) => String(provider.uid)),
      );
      if (!deliveryDraft.enabled) {
        const sellerWithoutCarrier = sellerIds.find(
          (sellerId) => !carrierBySeller.get(sellerId),
        );
        if (sellerWithoutCarrier) {
          throw new Error(
            `Delivery carrier required for seller ${sellerWithoutCarrier}`,
          );
        }
      }

      const service = getMarketplaceOrderService();
      const order = await service.createProductOrder(
        {
          buyerId: body.uid,
          currency: "EGP",
          deliveryAddress: {
            buyerUid: body.uid,
            phone: buyerPhone,
            address: buyerLocation.address,
            latitude: buyerLocation.latitude,
            longitude: buyerLocation.longitude,
            paymentMethod: "cash_on_delivery",
          },
          notes: "cash_on_delivery",
          source: "cart",
        },
        actor,
      );

      const planStops: Array<Record<string, unknown>> = [];
      const appliedDiscountUsages: Array<{
        discountId: string;
        sellerUid: string;
        discountMinor: number;
        shippingDiscountMinor: number;
      }> = [];
      for (const sellerId of sellerIds) {
        const sellerItems = body.items.filter(
          (item) => item.sellerId === sellerId,
        );
        const sellerShipping = sellerDelivery.get(sellerId)!;
        const sellerQuote = discountQuote.sellers.find(
          (quote) => quote.sellerUid === sellerId,
        );
        const remainingItemDiscountByProductId = new Map<string, number>();
        let remainingSellerDiscount = sellerQuote?.discountMinor ?? 0;
        for (const item of sellerItems) {
          if (remainingSellerDiscount <= 0) break;
          const itemId = `${item.productId}:${item.sellerId}`;
          const itemAffected =
            sellerQuote?.applied.some(
              (discount) =>
                discount.affectedItemIds.length === 0 ||
                discount.affectedItemIds.includes(itemId),
            ) ?? false;
          if (!itemAffected) continue;
          const itemSubtotal = moneyMinor(item.unitPriceMinor) * item.quantity;
          const assigned = Math.min(itemSubtotal, remainingSellerDiscount);
          remainingItemDiscountByProductId.set(item.productId, assigned);
          remainingSellerDiscount -= assigned;
        }
        const hasFreeShippingDiscount =
          sellerQuote?.applied.some(
            (discount) =>
              discount.shippingDiscountMinor === Number.MAX_SAFE_INTEGER,
          ) ?? false;
        if (sellerQuote) {
          appliedDiscountUsages.push(
            ...sellerQuote.applied.map((discount) => ({
              discountId: discount.discountId,
              sellerUid: discount.sellerUid,
              discountMinor: discount.discountMinor,
              shippingDiscountMinor: discount.shippingDiscountMinor,
            })),
          );
        }
        let shippingAssigned = false;
        let sellerOrderId = "";
        for (const item of sellerItems) {
          const assignShipping = !deliveryDraft.enabled && !shippingAssigned;
          const createdItem = await service.addOrderItem(
            String(order.id),
            {
              sellerId,
              serviceProviderId: carrierBySeller.get(sellerId),
              productId: item.productId,
              productName: item.name,
              productDescription:
                item.unitPriceMinor === 0 && item.priceLabel
                  ? `${item.description ?? ""}\n${item.priceLabel}`.trim()
                  : (item.description ?? ""),
              productImage: item.imageUrl ?? null,
              quantity: Math.max(1, Math.floor(Number(item.quantity))),
              unitPrice: moneyMinor(item.unitPriceMinor),
              itemDiscount:
                remainingItemDiscountByProductId.get(item.productId) ?? 0,
              shipping: deliveryDraft.enabled
                ? 0
                : shippingAssigned
                  ? 0
                  : sellerShipping.confirmedShipping,
              shippingDiscount:
                assignShipping && hasFreeShippingDiscount
                  ? sellerShipping.confirmedShipping
                  : 0,
              shippingNotes: `carrier:${carrierBySeller.get(sellerId)}`,
              requiresSpecialVehicle: item.requiresSpecialVehicle === true,
            },
            actor,
          );
          sellerOrderId = String(createdItem.seller_order_id ?? sellerOrderId);
          shippingAssigned = true;
        }
        const giftProductIds = Array.from(
          new Set(
            sellerQuote?.applied
              .map((discount) => discount.giftProductId)
              .filter(Boolean) ?? [],
          ),
        );
        for (const giftProductId of giftProductIds) {
          await service.addOrderItem(
            String(order.id),
            {
              sellerId,
              serviceProviderId: carrierBySeller.get(sellerId),
              productId: giftProductId,
              productName: "هدية مجانية",
              productDescription: "تمت إضافتها تلقائيًا من عرض المتجر.",
              productImage: null,
              quantity: 1,
              unitPrice: 0,
              shipping: 0,
              shippingNotes: `discount-gift:${giftProductId}`,
              requiresSpecialVehicle: false,
            },
            actor,
          );
        }
        if (deliveryDraft.enabled && sellerOrderId) {
          planStops.push({
            sellerOrderId,
            sellerId,
            originalCarrierId: carrierBySeller.get(sellerId) || null,
            pickupAddress: pickupBySeller.get(sellerId),
            requiresLocationQuote: sellerShipping.quoteRequired,
            fallbackShippingPrice: sellerShipping.confirmedShipping,
            fallbackSpecialVehicleFee: sellerShipping.specialVehicleFee,
            requiresSpecialVehicle: sellerItems.some(
              (item) => item.requiresSpecialVehicle === true,
            ),
          });
        } else if (sellerShipping.quoteRequired && sellerOrderId) {
          await service.requestShippingQuote(
            String(order.id),
            sellerOrderId,
            sellerShipping.specialVehicleFee,
            actor,
          );
        }
      }

      if (deliveryDraft.enabled) {
        const plan = await service.createUnifiedDeliveryPlan(
          String(order.id),
          {
            stops: planStops,
            candidates: deliveryDraft.candidates,
          },
          actor,
        );
        const issued = notificationGrants.issue({
          uids: deliveryDraft.candidates.map(
            (candidate) => candidate.providerId,
          ),
          templateId: "delivery.planInvitation",
          dedupeKey: `delivery-plan:${String(plan.id)}:invitation`,
          variables: {
            orderId: String(order.id),
            sellerCount: deliveryDraft.sellerCount,
          },
          metadata: {
            orderId: String(order.id),
            deliveryPlanId: String(plan.id),
            sellerCount: deliveryDraft.sellerCount,
            specialVehicleRequired: deliveryDraft.specialVehicleRequired,
          },
        });
        if (!issued) {
          void logServerSystemIssue({
            error: new Error("notificationGrantNotIssued"),
            feature: "Orders",
            operation: "notify-unified-delivery-plan",
            routeName: "POST /api/orders/from-cart",
          }).catch(() => undefined);
        }
      }

      await sellerDiscountService.recordAppliedUsages({
        buyerUid: body.uid,
        orderId: String(order.id),
        applied: appliedDiscountUsages,
      });

      return apiSuccess(
        withNotificationGrants(
          {
            orderId: String(order.id),
            unifiedDeliveryPlan: deliveryDraft.enabled,
          },
          notificationGrants.toArray(),
        ),
        201,
      );
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
