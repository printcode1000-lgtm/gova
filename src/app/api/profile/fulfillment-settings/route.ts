import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import type { SaveProfileFulfillmentSettingsInput } from "@/features/profile/entities/profile-fulfillment-settings.entity";
import { runTracedBusinessRoute } from "../../auth/traced-route";

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
        return apiSuccess(await profileService.saveFulfillmentSettings(body));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
