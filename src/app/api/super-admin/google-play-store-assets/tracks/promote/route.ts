import { runSuperAdminJsonRoute } from "@/features/super-admin/server";
import { googlePlayStoreAssetsService } from "@/features/google-play-console/server";
import type { GooglePlayPromoteInput } from "@asol/google-play-store-assets-core";

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<GooglePlayPromoteInput, unknown>(
    "POST /api/super-admin/google-play-store-assets/tracks/promote",
    request,
    ({ body }) => googlePlayStoreAssetsService.promoteRelease(body),
  );
}
