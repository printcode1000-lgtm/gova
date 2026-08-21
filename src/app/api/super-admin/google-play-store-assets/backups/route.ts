import { runSuperAdminRoute } from "@/features/super-admin/services/super-admin-route.server";
import { googlePlayStoreAssetsService } from "@/modules/google-play-console/services/google-play-store-assets-service.server";

export async function GET(request: Request) {
  return runSuperAdminRoute(
    "GET /api/super-admin/google-play-store-assets/backups",
    request,
    () => googlePlayStoreAssetsService.listBackups(),
  );
}
