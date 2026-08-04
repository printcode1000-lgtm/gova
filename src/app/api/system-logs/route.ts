import { apiError, apiSuccess, mapServiceError } from "@/core/api/api-response";
import type {
  PersistentSystemLogLevel,
  PersistentSystemLogOrigin,
} from "@/features/system-logs/entities/persistent-system-log.entity";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { runTracedBusinessRoute } from "../auth/traced-route";

function assertSuperAdmin(request: Request) {
  assertSuperAdminRequest(request);
  const { searchParams } = new URL(request.url);
  return searchParams;
}

function mapSystemLogAccessError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "forbidden") return apiError("forbidden", 403);
  if (message === "sessionTokenInvalid" || message === "sessionTokenExpired") {
    return apiError(message, 401);
  }
  return mapServiceError(error);
}

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/system-logs", async () => {
    try {
      const searchParams = assertSuperAdmin(request);
      const limit = Number(searchParams.get("limit") ?? 300);
      const origin = searchParams.get("origin");
      const level = searchParams.get("level");
      return apiSuccess(
        await persistentSystemLogService.list({
          limit,
          ...(origin === "client" || origin === "cloud"
            ? { origin: origin as PersistentSystemLogOrigin }
            : {}),
          ...(level === "normal" || level === "warning" || level === "error"
            ? { level: level as PersistentSystemLogLevel }
            : {}),
        }),
      );
    } catch (error) {
      return mapSystemLogAccessError(error);
    }
  });
}

export async function DELETE(request: Request) {
  return runTracedBusinessRoute("DELETE /api/system-logs", async () => {
    try {
      assertSuperAdmin(request);
      const { searchParams } = new URL(request.url);
      const requestedLevel = searchParams.get("level");
      if (
        requestedLevel &&
        requestedLevel !== "normal" &&
        requestedLevel !== "warning" &&
        requestedLevel !== "error"
      ) {
        return apiError("invalidSystemLogLevel", 400);
      }
      const level = requestedLevel ?? undefined;
      await persistentSystemLogService.clear(level);
      return apiSuccess({ ok: true });
    } catch (error) {
      return mapSystemLogAccessError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
