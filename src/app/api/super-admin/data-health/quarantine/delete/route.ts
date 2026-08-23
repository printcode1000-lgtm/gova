import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import { assertSuperAdminRequest } from "@/features/super-admin/server";
import { dataHealthService } from "@/features/data-health/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute(
    "POST /api/super-admin/data-health/quarantine/delete",
    async () => {
      try {
        const admin = assertSuperAdminRequest(request);
        const body = (await request.json()) as {
          quarantineId?: unknown;
          confirm?: unknown;
        };
        if (body.confirm !== "DELETE_QUARANTINED_IMAGE") {
          throw new Error("dataHealthCleanupConfirmationRequired");
        }
        return apiSuccess(
          await dataHealthService.deleteQuarantinedImage({
            adminUid: admin.uid,
            quarantineId:
              typeof body.quarantineId === "string"
                ? body.quarantineId.trim()
                : "",
          }),
        );
      } catch (error) {
        return mapServiceError(error);
      }
    },
  );
}

