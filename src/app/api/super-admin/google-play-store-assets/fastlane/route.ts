import { runSuperAdminJsonRoute } from "@/features/super-admin/server";
import type { GooglePlayFastlaneAction } from "@asol/google-play-store-assets-core";
import { googlePlayStoreAssetsService } from "@/features/google-play-console/server";

interface GooglePlayFastlaneBody {
  action?: GooglePlayFastlaneAction;
  confirmation?: string;
}

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<GooglePlayFastlaneBody, unknown>(
    "POST /api/super-admin/google-play-store-assets/fastlane",
    request,
    ({ body }) => {
      if (!body.action) throw new Error("googlePlayFastlaneActionRequired");
      return googlePlayStoreAssetsService.runFastlaneAction(
        body.action,
        body.confirmation,
      );
    },
  );
}
