import { runSuperAdminJsonRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";
import type { GooglePlayTrackMutationInput } from "@asol/google-play-store-assets-core";

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<GooglePlayTrackMutationInput, unknown>(
    "POST /api/super-admin/google-play-store-assets/tracks",
    request,
    ({ body }) => googlePlayStoreAssetsService.updateTrack(body),
  );
}
