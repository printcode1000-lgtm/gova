import { apiError, apiSuccess } from "@/core/api/api-response";
import type { TrendingRibbonConfig } from "@asol/trending-ribbon-core";
import { featuredTrendingRibbonService } from "@/features/advertisements/services/trending-ribbon-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/advertisements/trending-ribbon",
    async () => {
      const url = new URL(request.url);
      if (url.searchParams.get("admin") !== "1") {
        return apiSuccess(await featuredTrendingRibbonService.getCurrent());
      }
      try {
        return apiSuccess(
          await featuredTrendingRibbonService.getAdmin({
            uid: url.searchParams.get("uid") ?? "",
            phone: url.searchParams.get("phone") ?? "",
          }),
        );
      } catch (error) {
        return apiError(
          error instanceof Error ? error.message : "forbidden",
          403,
        );
      }
    },
  );
}

export async function PUT(request: Request) {
  return runTracedBusinessRoute(
    "PUT /api/advertisements/trending-ribbon",
    async () => {
      try {
        const body = (await request.json()) as {
          identity: { uid: string; phone: string };
          config: TrendingRibbonConfig;
          checkIntervalMinutes: number;
        };
        return apiSuccess(
          await featuredTrendingRibbonService.save(
            body.identity,
            body.config,
            body.checkIntervalMinutes,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "invalidTrendingRibbonConfig";
        return apiError(message, message === "forbidden" ? 403 : 400);
      }
    },
  );
}
