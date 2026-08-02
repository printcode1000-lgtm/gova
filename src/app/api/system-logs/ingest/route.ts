import { apiSuccess, mapServiceError } from "@/core/api/api-response";
import type { PersistentSystemLogInput } from "@/features/system-logs/entities/persistent-system-log.entity";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

function normalize(input: Partial<PersistentSystemLogInput>): PersistentSystemLogInput {
  return {
    level:
      input.level === "normal" ||
      input.level === "warning" ||
      input.level === "error"
        ? input.level
        : "error",
    source:
      input.source === "client" ||
      input.source === "server" ||
      input.source === "api" ||
      input.source === "react" ||
      input.source === "resource" ||
      input.source === "native"
        ? input.source
        : "client",
    consoleMethod: String(input.consoleMethod ?? "client.error"),
    message: String(input.message ?? "Unknown client issue"),
    page: String(input.page ?? ""),
    platform:
      input.platform === "web" ||
      input.platform === "android" ||
      input.platform === "ios" ||
      input.platform === "server"
        ? input.platform
        : "web",
    errorName: input.errorName,
    sourceFile: input.sourceFile,
    sourceLine: input.sourceLine,
    sourceColumn: input.sourceColumn,
    userAgent: input.userAgent,
    feature: input.feature,
    operation: input.operation,
    stack: input.stack,
    routeName: input.routeName,
    statusCode: input.statusCode,
    requestMethod: input.requestMethod,
    appVersion: input.appVersion,
    nativeVersion: input.nativeVersion,
    uid: input.uid,
  };
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/system-logs/ingest", async () => {
    try {
      const body = (await request.json()) as Partial<PersistentSystemLogInput> | Partial<PersistentSystemLogInput>[];
      const inputs = (Array.isArray(body) ? body : [body]).slice(0, 100).map(normalize);
      await persistentSystemLogService.addBatch(inputs);
      return apiSuccess({ ok: true });
    } catch (error) {
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
