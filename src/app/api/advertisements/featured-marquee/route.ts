import { apiError, apiSuccess } from "@/core/api/api-response";
import type { FeaturedMarqueeConfig } from "@/features/advertisements/entities/featured-marquee.entity";
import { featuredMarqueeService } from "@/features/advertisements/services/featured-marquee-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/advertisements/featured-marquee",
    async () => {
      const url = new URL(request.url);
      if (url.searchParams.get("admin") !== "1") {
        return apiSuccess(await featuredMarqueeService.getCurrent());
      }
      try {
        return apiSuccess(
          await featuredMarqueeService.getAdmin({
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
    "PUT /api/advertisements/featured-marquee",
    async () => {
      try {
        const body = (await request.json()) as {
          identity: { uid: string; phone: string };
          config: FeaturedMarqueeConfig;
          checkIntervalMinutes: number;
        };
        return apiSuccess(
          await featuredMarqueeService.save(
            body.identity,
            body.config,
            body.checkIntervalMinutes,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "invalidFeaturedMarqueeConfig";
        return apiError(message, message === "forbidden" ? 403 : 400);
      }
    },
  );
}
