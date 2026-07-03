import { apiError, apiSuccess } from "@/core/api/api-response";
import type { HomeHeroConfig } from "@/features/advertisements/entities/home-hero-slider.entity";
import { homeHeroSliderService } from "@/features/advertisements/services/home-hero-slider-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/advertisements/home-hero-slider",
    async () => {
      const url = new URL(request.url);
      if (url.searchParams.get("admin") !== "1") {
        return apiSuccess(await homeHeroSliderService.getCurrent());
      }
      try {
        return apiSuccess(
          await homeHeroSliderService.getAdmin({
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
    "PUT /api/advertisements/home-hero-slider",
    async () => {
      try {
        const body = (await request.json()) as {
          identity: { uid: string; phone: string };
          config: HomeHeroConfig;
          checkIntervalMinutes: number;
        };
        return apiSuccess(
          await homeHeroSliderService.save(
            body.identity,
            body.config,
            body.checkIntervalMinutes,
          ),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "invalidHeroSliderConfig";
        return apiError(message, message === "forbidden" ? 403 : 400);
      }
    },
  );
}
