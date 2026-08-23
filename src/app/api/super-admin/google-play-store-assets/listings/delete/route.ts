import { runSuperAdminJsonRoute } from "@/features/super-admin/server";
import { googlePlayStoreAssetsService } from "@/features/google-play-console/server";

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
