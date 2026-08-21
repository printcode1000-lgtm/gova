import { runSuperAdminJsonRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";

interface DeleteGooglePlayListingBody {
  language?: string;
}

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<DeleteGooglePlayListingBody, unknown>(
    "POST /api/super-admin/google-play-store-assets/listings/delete",
    request,
    ({ body }) => googlePlayStoreAssetsService.deleteListing(String(body.language || "")),
  );
}
