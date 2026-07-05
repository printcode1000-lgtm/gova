import { apiError, apiSuccess } from "@/core/api/api-response";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import type { TrendingRibbonConfig } from "@/features/advertisements/entities/trending-ribbon.entity";
import { featuredTrendingRibbonService } from "@/features/advertisements/services/trending-ribbon-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/advertisements/trending-ribbon",
    async () => {
      const url = new URL(request.url);
      if (url.searchParams.get("admin") !== "1") {
        return apiSuccess(await featuredTrendingRibbonService.getCurrent());
      }
      const uid = url.searchParams.get("uid") ?? "";
      const phone = url.searchParams.get("phone") ?? "";
      if (!isSuperAdminIdentity(uid, phone)) {
        return apiError("forbidden", 403);
      }
      return apiSuccess(await featuredTrendingRibbonService.getCurrent());
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
        if (!isSuperAdminIdentity(body.identity.uid, body.identity.phone)) {
          return apiError("forbidden", 403);
        }
        return apiSuccess(
          await featuredTrendingRibbonService.save(
            body.config,
            body.checkIntervalMinutes,
            body.identity.uid,
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
