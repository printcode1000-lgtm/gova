import { apiSuccess } from "@/core/api/api-response";
import { homeHeroSliderService } from "@/features/advertisements/services/home-hero-slider-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET() {
  return runTracedBusinessRoute(
    "GET /api/advertisements/home-hero-slider/version",
    async () => apiSuccess(await homeHeroSliderService.getVersion()),
  );
}
