import { runSuperAdminJsonRoute } from "@/features/super-admin/server";
import { googlePlayStoreAssetsService } from "@/features/google-play-console/server";

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
