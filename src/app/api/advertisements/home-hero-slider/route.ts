import { apiError, apiSuccess } from "@/core/api/api-response";
import type { HomeHeroConfig } from "@/features/advertisements/entities/home-hero-slider.entity";
import { homeHeroSliderService } from "@/features/advertisements/services/home-hero-slider-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

export async function GET(request: Request) {
  return runTracedBusinessRoute(
    "GET /api/advertisements/home-hero-slider",
    async () => {
      const url = new URL(request.url);
      if (url.searchParams.get("history") === "1") {
        try {
          return apiSuccess(
            await homeHeroSliderService.listPublications({
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
      }
      if (url.searchParams.get("admin") !== "1") {
        return apiSuccess(await homeHeroSliderService.getPublished());
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
          action: "save-draft" | "publish" | "restore";
          identity: { uid: string; phone: string };
          config: HomeHeroConfig;
          checkIntervalMinutes: number;
          expectedRevision: number;
          publicationId?: number;
        };
        const result =
          body.action === "restore"
            ? await homeHeroSliderService.restore(
                body.identity,
                body.publicationId ?? 0,
                body.checkIntervalMinutes,
                body.expectedRevision,
              )
            : body.action === "publish"
              ? await homeHeroSliderService.publish(
                  body.identity,
                  body.config,
                  body.checkIntervalMinutes,
                  body.expectedRevision,
                )
              : await homeHeroSliderService.saveDraft(
                  body.identity,
                  body.config,
                  body.checkIntervalMinutes,
                  body.expectedRevision,
                );
        return apiSuccess(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "invalidHeroSliderConfig";
        const status =
          message === "forbidden"
            ? 403
            : message === "heroSliderRevisionConflict"
              ? 409
              : message === "heroSliderPublicationNotFound"
                ? 404
                : 400;
        return apiError(message, status);
      }
    },
  );
}
