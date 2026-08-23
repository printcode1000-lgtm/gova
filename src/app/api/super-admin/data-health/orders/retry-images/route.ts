import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { orderPurgeService } from "@/features/data-health/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/orders/retry-images",
    async () => {
      try {
        assertSuperAdminRequest(request);
        return apiSuccess(await orderPurgeService.retryPendingImages());
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
