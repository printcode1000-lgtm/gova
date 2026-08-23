import { runSuperAdminRoute } from "@/features/super-admin/server";
import { googlePlayStoreAssetsService } from "@/features/google-play-console/server";

export async function GET(request: Request) {
  return runSuperAdminRoute(
    "GET /api/super-admin/google-play-store-assets/backups",
    request,
    () => googlePlayStoreAssetsService.listBackups(),
  );
}
