import { apiSuccess } from "@/core/api/api-response";
import { createMultiSellerDeliveryDraft } from "@/features/cart/multi-seller-delivery-planner";
import { calculateSellerShipping } from "@/features/cart/shipping-pricing";
import {
  NotificationCategories,
  NotificationPriorities,
} from "@/features/notifications/domain/enums";
import { notificationSendService } from "@/features/notifications/services/notification-service.bootstrap.server";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { getMarketplaceOrderService } from "@/modules/marketplace-orders/api/server";
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
}

interface FromCartInput {
  uid: string;
  phone?: string;
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
      if (!Array.isArray(body.items) || body.items.length === 0) {
        throw new Error("Cart items are required");
      }

      const buyerContacts = await profileService.getContacts(body.uid);
      const buyerPhone = buyerContacts.phones[0]?.number ?? "";
      const buyerLocation = buyerContacts.locations[0] ?? null;
      if (!buyerPhone || !buyerLocation?.address) {
        throw new Error("Buyer profile phone and address are required");
      }

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
      for (const sellerId of sellerIds) {
        const sellerItems = body.items.filter(
          (item) => item.sellerId === sellerId,
        );
        const sellerShipping = sellerDelivery.get(sellerId)!;
        let shippingAssigned = false;
        let sellerOrderId = "";
        for (const item of sellerItems) {
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
              shipping: deliveryDraft.enabled
                ? 0
                : shippingAssigned
                  ? 0
                  : sellerShipping.confirmedShipping,
              shippingNotes: `carrier:${carrierBySeller.get(sellerId)}`,
              requiresSpecialVehicle: item.requiresSpecialVehicle === true,
            },
            actor,
          );
          sellerOrderId = String(createdItem.seller_order_id ?? sellerOrderId);
          shippingAssigned = true;
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
        await notificationSendService
          .sendToUsers({
            uids: deliveryDraft.candidates.map(
              (candidate) => candidate.providerId,
            ),
            title: "طلب عرض توصيل موحّد",
            body: `طلب متعدد البائعين يضم ${deliveryDraft.sellerCount} محطات استلام. يمكنك إرسال عرض واحد للتوصيل الكامل.`,
            locale: "ar",
            category: NotificationCategories.Offers,
            priority: NotificationPriorities.High,
            dedupeKey: `delivery-plan:${String(plan.id)}:invitation`,
            route: {
              href: `/orders/details?orderId=${encodeURIComponent(String(order.id))}&role=service_provider`,
              label: "عرض خطة التوصيل",
            },
            metadata: {
              orderId: String(order.id),
              deliveryPlanId: String(plan.id),
              sellerCount: deliveryDraft.sellerCount,
              specialVehicleRequired: deliveryDraft.specialVehicleRequired,
            },
          })
          .catch(() => undefined);
      }

      return apiSuccess(
        {
          orderId: String(order.id),
          unifiedDeliveryPlan: deliveryDraft.enabled,
        },
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
