import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { notificationsServer } from "@/features/notifications/server";
import { profileService } from "@/features/profile/server";
import { getMarketplaceOrderService } from "@asol/data-core/marketplace-orders";
import type { SaveProfileFulfillmentSettingsInput } from "@/features/profile";
import { runTracedBusinessRoute } from '@/core/api/traced-route';
import { syncSellerFulfillmentToOpenOrders } from "@/features/orders/server";

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/profile/fulfillment-settings",
    async () => {
      try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get("uid") ?? "";
        return apiSuccess(await profileService.getFulfillmentSettings(uid));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute(
    "PUT /api/profile/fulfillment-settings",
    async () => {
      try {
        const body =
          (await request.json()) as SaveProfileFulfillmentSettingsInput;
        const saved = await profileService.saveFulfillmentSettings(body);
        const notificationGrants = notificationsServer.createGrantIssuer(
          body.uid,
        );
        await syncSellerFulfillmentToOpenOrders(
          body.uid,
          getMarketplaceOrderService(),
          notificationGrants,
        );
        return apiSuccess(
          notificationsServer.attachGrants(
            saved,
            notificationGrants.toArray(),
          ),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
