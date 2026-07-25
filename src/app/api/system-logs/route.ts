import { apiError, apiSuccess, mapServiceError } from "@/core/api/api-response";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { runTracedBusinessRoute } from "../auth/traced-route";

function assertSuperAdmin(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid") ?? "";
  const phone = searchParams.get("phone") ?? "";
  if (!isSuperAdminIdentity(uid, phone)) throw new Error("forbidden");
  return searchParams;
}

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/system-logs", async () => {
    try {
      const searchParams = assertSuperAdmin(request);
      const limit = Number(searchParams.get("limit") ?? 300);
      return apiSuccess(await persistentSystemLogService.list(limit));
    } catch (error) {
      if ((error as Error).message === "forbidden") return apiError("forbidden", 403);
      return mapServiceError(error);
    }
  });
}

export async function DELETE(request: Request) {
  return runTracedBusinessRoute("DELETE /api/system-logs", async () => {
    try {
      assertSuperAdmin(request);
      const { searchParams } = new URL(request.url);
      const level = searchParams.get("level") ?? undefined;
      await persistentSystemLogService.clear(level);
      return apiSuccess({ ok: true });
    } catch (error) {
      if ((error as Error).message === "forbidden") return apiError("forbidden", 403);
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
