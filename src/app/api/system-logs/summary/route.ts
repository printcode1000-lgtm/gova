import { apiError, apiSuccess, mapServiceError } from "@/core/api/api-response";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

function mapSystemLogAccessError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "forbidden") return apiError("forbidden", 403);
  if (message === "sessionTokenInvalid" || message === "sessionTokenExpired") {
    return apiError(message, 401);
  }
  return mapServiceError(error);
}

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/system-logs/summary", async () => {
    try {
      assertSuperAdminRequest(request);
      return apiSuccess(await persistentSystemLogService.summary());
    } catch (error) {
      return mapSystemLogAccessError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
