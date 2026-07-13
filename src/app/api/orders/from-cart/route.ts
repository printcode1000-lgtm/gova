import { apiSuccess } from "@/core/api/api-response";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { getMarketplaceOrderService } from "@/modules/marketplace-orders/api/server";
import { runTracedBusinessRoute } from "../../auth/traced-route";
import { actorFromInput, mapOrderError, moneyMinor } from "../order-api-helpers";

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

function firstCarrier(settings: Awaited<ReturnType<typeof profileService.getFulfillmentSettings>>) {
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
  const pricing = settings.shippingPricing;
  const threshold = Math.round(pricing.freeShippingThreshold * 100);
  const free = pricing.mode === "free" || (threshold > 0 && subtotal >= threshold);
  const base = free
    ? 0
    : pricing.mode === "flat"
      ? Math.round(pricing.flatRate * 100)
      : Math.round(pricing.locationBaseRate * 100);
  const vehicle = items.some((item) => item.requiresSpecialVehicle)
    ? Math.round(pricing.specialVehicleFee * 100)
    : 0;
  return base + vehicle;
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/orders/from-cart", async () => {
    try {
      const body = (await request.json()) as FromCartInput;
      const actor = actorFromInput({ uid: body.uid, phone: body.phone }, "buyer");
      if (!Array.isArray(body.items) || body.items.length === 0) {
        throw new Error("Cart items are required");
      }

      const buyerContacts = await profileService.getContacts(body.uid);
      const buyerPhone = buyerContacts.phones[0]?.number ?? "";
      const buyerLocation = buyerContacts.locations[0] ?? null;
      if (!buyerPhone || !buyerLocation?.address) {
        throw new Error("Buyer profile phone and address are required");
      }

      const sellerIds = Array.from(new Set(body.items.map((item) => item.sellerId))).filter(Boolean);
      const fulfillmentBySeller = new Map<string, Awaited<ReturnType<typeof profileService.getFulfillmentSettings>>>();
      const carrierBySeller = new Map<string, string>();
      for (const sellerId of sellerIds) {
        const settings = await profileService.getFulfillmentSettings(sellerId);
        const carrierUid = firstCarrier(settings);
        if (!carrierUid) throw new Error(`Delivery carrier required for seller ${sellerId}`);
        fulfillmentBySeller.set(sellerId, settings);
        carrierBySeller.set(sellerId, carrierUid);
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

      for (const sellerId of sellerIds) {
        const sellerItems = body.items.filter((item) => item.sellerId === sellerId);
        const sellerShipping = shippingForSeller(fulfillmentBySeller.get(sellerId)!, sellerItems);
        let shippingAssigned = false;
        for (const item of sellerItems) {
          await service.addOrderItem(
            String(order.id),
            {
              sellerId,
              serviceProviderId: carrierBySeller.get(sellerId),
              productId: item.productId,
              productName: item.name,
              productDescription:
                item.unitPriceMinor === 0 && item.priceLabel
                  ? `${item.description ?? ""}\n${item.priceLabel}`.trim()
                  : item.description ?? "",
              productImage: item.imageUrl ?? null,
              quantity: Math.max(1, Math.floor(Number(item.quantity))),
              unitPrice: moneyMinor(item.unitPriceMinor),
              shipping: shippingAssigned ? 0 : sellerShipping,
              shippingNotes: `carrier:${carrierBySeller.get(sellerId)}`,
              requiresSpecialVehicle: item.requiresSpecialVehicle === true,
            },
            actor,
          );
          shippingAssigned = true;
        }
      }

      return apiSuccess({ orderId: String(order.id) }, 201);
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
