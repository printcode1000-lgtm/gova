import { runSuperAdminJsonRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";

interface RestoreGooglePlayBackupBody {
  name?: string;
}

export async function POST(request: Request) {
  return runSuperAdminJsonRoute<RestoreGooglePlayBackupBody, unknown>(
    "POST /api/super-admin/google-play-store-assets/backups/restore",
    request,
    ({ body }) => googlePlayStoreAssetsService.restoreBackup(String(body.name || "")),
  );
}
