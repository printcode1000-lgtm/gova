import {
  apiError,
  apiSuccess,
  InvalidJsonBodyError,
  mapServiceError,
} from "@/core/api/api-response";
import type {
  PersistentSystemLogInput,
  PersistentSystemLogLevel,
  PersistentSystemLogOrigin,
} from "@/features/system-logs";
import { persistentSystemLogService } from "@/features/system-logs/server";
import {
  isIngestRateLimited,
  readBoundedJsonBody,
  normalizeIngestPayload,
  validateIngestBatchSize,
} from "@asol/system-logs-core/server";
import { runTracedBusinessRoute } from '@/core/api/traced-route';

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/system-logs/ingest", async () => {
    if (isIngestRateLimited(request)) return apiError("systemLogRateLimited", 429);
    try {
      const body = await readBoundedJsonBody<
        Partial<PersistentSystemLogInput> | Partial<PersistentSystemLogInput>[]
      >(request);
      const values = Array.isArray(body) ? body : [body];
      const batchError = validateIngestBatchSize(values);
      if (batchError) return apiError(batchError, 413);
      const inputs = values
        .map(normalizeIngestPayload)
        .filter((entry) => entry.level !== "normal");
      await persistentSystemLogService.addBatch(inputs, "untrusted-client");
      return apiSuccess({ ok: true });
    } catch (error) {
      if (error instanceof InvalidJsonBodyError) {
        return apiError("invalidJsonBody", 400);
      }
      if ((error as Error).message === "systemLogPayloadTooLarge") {
        return apiError("systemLogPayloadTooLarge", 413);
      }
      if ((error as Error).message === "invalidJsonBody") {
        return apiError("invalidJsonBody", 400);
      }
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
