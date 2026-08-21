import { runSuperAdminJsonRoute, runSuperAdminRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import type { GooglePlayStoreAssetsUpdateInput } from "@asol/google-play-store-assets-core";

export async function GET(request: Request) {
  return runSuperAdminRoute(
    "GET /api/super-admin/google-play-store-assets",
    request,
    () => googlePlayStoreAssetsService.snapshot(),
  );
}

export async function PUT(request: Request) {
  return runSuperAdminJsonRoute<GooglePlayStoreAssetsUpdateInput, unknown>(
    "PUT /api/super-admin/google-play-store-assets",
    request,
    ({ body }) => googlePlayStoreAssetsService.updateText(body),
  );
}
