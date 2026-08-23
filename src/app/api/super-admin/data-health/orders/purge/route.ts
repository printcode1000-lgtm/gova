import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { orderPurgeService } from "@/features/data-health/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/orders/purge",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        const body = (await request.json()) as {
          planId?: unknown;
          confirmationText?: unknown;
        };
        return apiSuccess(
          await orderPurgeService.execute({
            adminUid: admin.uid,
            planId: typeof body.planId === "string" ? body.planId.trim() : "",
            confirmationText:
              typeof body.confirmationText === "string"
                ? body.confirmationText
                : "",
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
