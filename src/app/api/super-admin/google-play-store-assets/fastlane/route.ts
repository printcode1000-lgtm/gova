import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import type { GooglePlayFastlaneAction } from "@/modules/google-play-console/domain/store-assets-types";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/google-play-store-assets/fastlane",
    async () => {
      try {
        assertSuperAdminRequest(request);
        const body = (await request.json()) as {
          action?: GooglePlayFastlaneAction;
          confirmation?: string;
        };
        if (!body.action) throw new Error("googlePlayFastlaneActionRequired");
        return apiSuccess(
          googlePlayStoreAssetsService.runFastlaneAction(
            body.action,
            body.confirmation,
          ),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
