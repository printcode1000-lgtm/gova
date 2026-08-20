import { apiSuccess } from "@/core/api/api-response";
import { featuredTrendingRibbonService } from "@/features/advertisements/services/trending-ribbon-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET() {
  return runTracedBusinessRoute(
    "GET /api/advertisements/trending-ribbon/version",
    async () => apiSuccess(await featuredTrendingRibbonService.getVersion()),
  );
}
