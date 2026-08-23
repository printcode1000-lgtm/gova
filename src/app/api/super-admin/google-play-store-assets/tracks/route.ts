import { runSuperAdminJsonRoute } from "@/features/super-admin/server";
import { googlePlayStoreAssetsService } from "@/features/google-play-console/server";
import type { GooglePlayTrackMutationInput } from "@asol/google-play-store-assets-core";

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<GooglePlayTrackMutationInput, unknown>(
    "POST /api/super-admin/google-play-store-assets/tracks",
    request,
    ({ body }) => googlePlayStoreAssetsService.updateTrack(body),
  );
}
