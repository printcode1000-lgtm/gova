import { apiSuccess, mapServiceError, readJsonBody } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { dataHealthService } from "@/features/data-health/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/history/audit/clear",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        const body = (await readJsonBody<unknown>(request).catch(() => ({}))) as {
          confirm?: unknown;
        };
        return apiSuccess(
          await dataHealthService.clearCleanupAudit({
            adminUid: admin.uid,
            confirm: typeof body.confirm === "string" ? body.confirm : "",
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}
