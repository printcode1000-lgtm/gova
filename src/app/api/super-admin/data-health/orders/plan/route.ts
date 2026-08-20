import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { orderPurgeService } from "@/modules/data-health/services/order-purge-service.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/orders/plan",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        return apiSuccess(await orderPurgeService.createPlan(admin.uid));
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
