import { apiSuccess } from "@/core/api/api-response";
import { featuredMarqueeService } from "@/features/advertisements/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function GET() {
  return runTracedBusinessRoute(
    "GET /api/advertisements/featured-marquee/version",
    async () => apiSuccess(await featuredMarqueeService.getVersion()),
  );
}
