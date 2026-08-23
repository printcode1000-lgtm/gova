import { runSuperAdminJsonRoute, runSuperAdminRoute } from "@/features/super-admin/server";
import { googlePlayStoreAssetsService } from "@/features/google-play-console/server";
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
