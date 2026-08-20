import { apiError, apiSuccess, mapServiceError } from "@/core/api/api-response";
import type {
  PersistentSystemLogLevel,
  PersistentSystemLogOrigin,
  PersistentSystemLogPlatform,
} from "@/features/system-logs/entities/persistent-system-log.entity";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { assertSuperAdminRequest } from "@/features/super-admin/services/super-admin-auth.server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

function assertSuperAdmin(request: Request) {
  assertSuperAdminRequest(request);
  return new URL(request.url).searchParams;
}

function mapSystemLogAccessError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "forbidden") return apiError("forbidden", 403);
  if (message === "sessionTokenInvalid" || message === "sessionTokenExpired") {
    return apiError(message, 401);
  }
  return mapServiceError(error);
}

function parseListOptions(searchParams: URLSearchParams) {
  const limit = Number(searchParams.get("limit") ?? 300);
  const origin = searchParams.get("origin");
  const level = searchParams.get("level");
  const platform = searchParams.get("platform");
  const feature = searchParams.get("feature");
  const query = searchParams.get("query") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const appVersion = searchParams.get("appVersion") ?? undefined;
  const nativeVersion = searchParams.get("nativeVersion") ?? undefined;
  const since = searchParams.get("since") ?? undefined;
  const until = searchParams.get("until") ?? undefined;

  return {
    limit,
    cursor,
    query,
    since,
    until,
    appVersion,
    nativeVersion,
    ...(origin === "client" || origin === "cloud"
      ? { origin: origin as PersistentSystemLogOrigin }
      : {}),
    ...(level === "normal" || level === "warning" || level === "error"
      ? { level: level as PersistentSystemLogLevel }
      : {}),
    ...(platform === "web" ||
    platform === "android" ||
    platform === "ios" ||
    platform === "server"
      ? { platform: platform as PersistentSystemLogPlatform }
      : {}),
    ...(feature ? { feature } : {}),
  };
}

export async function GET(request: Request) {
  return runTracedBusinessRoute("GET /api/system-logs", async () => {
    try {
      const searchParams = assertSuperAdmin(request);
      return apiSuccess(
        await persistentSystemLogService.list(parseListOptions(searchParams)),
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
      await persistentSystemLogService.clear(requestedLevel ?? undefined);
      return apiSuccess({ ok: true });
    } catch (error) {
      return mapSystemLogAccessError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
