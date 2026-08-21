import { runSuperAdminJsonRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import type { GooglePlayPromoteInput } from "@asol/google-play-store-assets-core";

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<GooglePlayPromoteInput, unknown>(
    "POST /api/super-admin/google-play-store-assets/tracks/promote",
    request,
    ({ body }) => googlePlayStoreAssetsService.promoteRelease(body),
  );
}
