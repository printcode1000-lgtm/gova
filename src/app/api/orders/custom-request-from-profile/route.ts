import { apiSuccess } from "@/core/api/api-response";
import { StorageProfiles } from "@/core/storage/constants/storage-profiles";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { getMarketplaceOrderService } from "@/modules/marketplace-orders/api/server";
import { runTracedBusinessRoute } from "../../auth/traced-route";
import { actorFromInput, mapOrderError } from "../order-api-helpers";

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
      const sellerUid = body.sellerUid?.trim();
      const description = body.description?.trim();
      const images = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
      if (!sellerUid) throw new Error("sellerUid is required");
      if (!description && images.length === 0) {
        throw new Error("Description or image is required");
      }

      const buyerContacts = await profileService.getContacts(body.uid);
      const buyerPhone = buyerContacts.phones[0]?.number ?? body.phone ?? "";
      const buyerLocation = buyerContacts.locations[0] ?? null;
      if (!buyerPhone || !buyerLocation?.address) {
        throw new Error("Buyer profile phone and address are required");
      }

      const sellerFulfillment = await profileService.getFulfillmentSettings(sellerUid);
      const carrierUid = firstCarrier(sellerFulfillment);
      if (!carrierUid) throw new Error(`Delivery carrier required for seller ${sellerUid}`);

      const service = getMarketplaceOrderService();
      const order = await service.createCustomRequestOrder(
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
          notes: "profile_custom_request",
          source: "profile_custom_request",
        },
        actor,
      );

      const item = await service.addCustomRequestItem(
        String(order.id),
        {
          sellerId: sellerUid,
          serviceProviderId: carrierUid,
          title: body.title?.trim() || "طلب خاص",
          buyerDescription: description || "طلب خاص مرفق بصورة",
          requestType: "custom_purchase",
          requestedQuantity: 1,
          shippingNotes: `carrier:${carrierUid}`,
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

      return apiSuccess({ orderId: String(order.id), itemId: String(item.id) }, 201);
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
