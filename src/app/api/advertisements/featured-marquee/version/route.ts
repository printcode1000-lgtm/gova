import { apiSuccess } from "@/core/api/api-response";
import { featuredMarqueeService } from "@/features/advertisements/services/featured-marquee-service.server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";

export async function GET() {
  return runTracedBusinessRoute(
    "GET /api/advertisements/featured-marquee/version",
    async () => apiSuccess(await featuredMarqueeService.getVersion()),
  );
}
