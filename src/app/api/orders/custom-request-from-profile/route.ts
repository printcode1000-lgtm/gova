import { apiSuccess } from "@/core/api/api-response";
import { StorageProfiles } from "@asol/storage-core";
import { authService } from "@/features/auth/services/auth-service.bootstrap.server";
import { notificationsServer } from "@/features/notifications/server";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { getMarketplaceOrderService } from "@asol/data-core/marketplace-orders";
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { actorFromInput } from "@asol/orders-core";
import { mapOrderError } from "../order-api-helpers";
import { fulfillmentSettingsToSnapshot } from "@asol/orders-core";
import { grantBuyerOrderCreated, grantSellerOrderCreated } from "@/features/orders/application/order-action-grants.server";

interface CustomRequestImageInput {
  imageKey: string;
  url: string;
}

interface CustomRequestFromProfileInput {
  uid: string;
  phone?: string;
  sellerUid: string;
  title: string;
  description: string;
  images?: CustomRequestImageInput[];
}

function firstCarrier(settings: Awaited<ReturnType<typeof profileService.getFulfillmentSettings>>) {
  return settings.carrierUids.find(Boolean) ?? "";
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/orders/custom-request-from-profile", async () => {
    try {
      const body = (await request.json()) as CustomRequestFromProfileInput;
      const actor = actorFromInput({ uid: body.uid, phone: body.phone }, "buyer");
      const notificationGrants = notificationsServer.createGrantIssuer(body.uid);
      const sellerUid = body.sellerUid?.trim();
      const description = body.description?.trim();
      const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
      if (!sellerUid) throw new Error("sellerUid is required");
      if (!description && images.length === 0) {
        throw new Error("Description or image is required");
      }

      const [buyerContacts, authPhone] = await Promise.all([
        profileService.getContacts(body.uid),
        authService.getUserPhone(body.uid),
      ]);
      const buyerPhone =
        buyerContacts.phones[0]?.number?.trim() ||
        body.phone?.trim() ||
        authPhone ||
        "";
      const buyerLocation = buyerContacts.locations[0] ?? null;
      if (!buyerPhone) {
        throw new Error("Buyer phone is required");
      }

      const sellerFulfillment = await profileService.getFulfillmentSettings(sellerUid);
      const carrierUid = firstCarrier(sellerFulfillment);

      const service = getMarketplaceOrderService();
      const order = await service.createCustomRequestOrder(
        {
          buyerId: body.uid,
          currency: "EGP",
          deliveryAddress: {
            buyerUid: body.uid,
            phone: buyerPhone,
            address: buyerLocation?.address ?? "",
            latitude: buyerLocation?.latitude ?? null,
            longitude: buyerLocation?.longitude ?? null,
            paymentMethod: "cash_on_delivery",
          },
          notes: "profile_custom_request",
          source: "profile_custom_request",
        },
        actor,
      );

      const item = await service.addCustomRequestItem(
        String(order.id),
        {
          sellerId: sellerUid,
          ...(carrierUid ? { serviceProviderId: carrierUid } : {}),
          title: body.title?.trim() || "طلب خاص",
          buyerDescription: description || "طلب خاص مرفق بصورة",
          requestType: "custom_purchase",
          requestedQuantity: 1,
          ...(carrierUid ? { shippingNotes: `carrier:${carrierUid}` } : {}),
        },
        actor,
      );

      for (const [index, image] of images.entries()) {
        if (!image.imageKey?.trim() || !image.url?.trim()) continue;
        await service.addCustomRequestImage(
          String(item.id),
          {
            storageProfileId: StorageProfiles.SpicialOrder,
            imageKey: image.imageKey,
            imageUrl: image.url,
            fileName: image.imageKey,
            fileSize: 1,
            mimeType: "image/webp",
            imageDescription: `custom-request-image-${index + 1}`,
            sortOrder: index,
          },
          actor,
        );
      }

      const sellerOrderId = String(item.seller_order_id ?? "");
      if (sellerOrderId) {
        await service.stampSellerOrderFulfillmentSnapshot(
          sellerOrderId,
          fulfillmentSettingsToSnapshot(sellerFulfillment),
          actor,
        );
      }

      grantSellerOrderCreated(notificationGrants, {
        sellerUids: [sellerUid],
        orderId: String(order.id),
        source: "profile_custom_request",
        routeName: "POST /api/orders/custom-request-from-profile",
      });
      grantBuyerOrderCreated(notificationGrants, {
        buyerUid: body.uid,
        orderId: String(order.id),
        routeName: "POST /api/orders/custom-request-from-profile",
      });

      return apiSuccess(
        notificationsServer.attachGrants(
          { orderId: String(order.id), itemId: String(item.id) },
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
