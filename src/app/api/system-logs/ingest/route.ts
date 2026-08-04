import {
  apiError,
  apiSuccess,
  InvalidJsonBodyError,
  mapServiceError,
} from "@/core/api/api-response";
import type { PersistentSystemLogInput } from "@/features/system-logs/entities/persistent-system-log.entity";
import { persistentSystemLogService } from "@/features/system-logs/services/persistent-system-log-service.server";
import { runTracedBusinessRoute } from "../../auth/traced-route";

const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_CLIENT = 120;
const MAX_REQUESTS_PER_INSTANCE = 1_000;
const MAX_BODY_BYTES = 256 * 1024;
const clientAttempts = new Map<string, number[]>();
let instanceAttempts: number[] = [];

function requestClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    forwarded?.trim() ??
    "unknown"
  );
}

function isRateLimited(request: Request) {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  const now = Date.now();
  instanceAttempts = instanceAttempts.filter((time) => time >= cutoff);
  if (instanceAttempts.length >= MAX_REQUESTS_PER_INSTANCE) return true;

  const key = requestClientKey(request);
  const recent = (clientAttempts.get(key) ?? []).filter(
    (time) => time >= cutoff,
  );
  if (recent.length >= MAX_REQUESTS_PER_CLIENT) return true;

  instanceAttempts.push(now);
  clientAttempts.set(key, [...recent, now]);
  if (clientAttempts.size > 5_000) {
    for (const [storedKey, attempts] of clientAttempts) {
      if (!attempts.some((time) => time >= cutoff))
        clientAttempts.delete(storedKey);
    }
  }
  return false;
}

async function readBoundedJsonBody<T>(request: Request): Promise<T> {
  if (!request.body) throw new InvalidJsonBodyError();
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("systemLogPayloadTooLarge");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

function textValue(value: unknown, fallback: string, max: number) {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? String(value).slice(0, max)
    : fallback;
}

function optionalText(value: unknown, max: number) {
  const text = textValue(value, "", max).trim();
  return text || undefined;
}

function optionalNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}

function normalize(
  input: Partial<PersistentSystemLogInput>,
): PersistentSystemLogInput {
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
    consoleMethod: textValue(input.consoleMethod, "client.error", 100),
    message: textValue(input.message, "Unknown client issue", 20_000),
    page: textValue(input.page, "", 2_000),
    platform:
      input.platform === "web" ||
      input.platform === "android" ||
      input.platform === "ios" ||
      input.platform === "server"
        ? input.platform
        : "web",
    errorName: optionalText(input.errorName, 300),
    sourceFile: optionalText(input.sourceFile, 2_000),
    sourceLine: optionalNumber(input.sourceLine),
    sourceColumn: optionalNumber(input.sourceColumn),
    userAgent: optionalText(input.userAgent, 2_000),
    feature: optionalText(input.feature, 300),
    operation: optionalText(input.operation, 500),
    stack: optionalText(input.stack, 24_000),
    routeName: optionalText(input.routeName, 1_000),
    statusCode: optionalNumber(input.statusCode),
    requestMethod: optionalText(input.requestMethod, 20),
    appVersion: optionalText(input.appVersion, 100),
    nativeVersion: optionalText(input.nativeVersion, 100),
    uid: optionalText(input.uid, 200),
  };
}

export async function POST(request: Request) {
  return runTracedBusinessRoute("POST /api/system-logs/ingest", async () => {
    // This endpoint intentionally accepts pre-login client failures. Keep abuse
    // rejection outside mapServiceError so rejected requests cannot create more logs.
    if (isRateLimited(request)) return apiError("systemLogRateLimited", 429);
    try {
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (contentLength > MAX_BODY_BYTES)
        return apiError("systemLogPayloadTooLarge", 413);
      const body = await readBoundedJsonBody<
        Partial<PersistentSystemLogInput> | Partial<PersistentSystemLogInput>[]
      >(request);
      const values = Array.isArray(body) ? body : [body];
      if (values.length > 25) return apiError("systemLogBatchTooLarge", 413);
      if (
        values.some(
          (value) =>
            !value || typeof value !== "object" || Array.isArray(value),
        )
      ) {
        return apiError("invalidSystemLogPayload", 400);
      }
      const inputs = values
        .map(normalize)
        .filter((entry) => entry.level !== "normal");
      await persistentSystemLogService.addBatch(inputs, "untrusted-client");
      return apiSuccess({ ok: true });
    } catch (error) {
      if ((error as Error).message === "systemLogPayloadTooLarge") {
        return apiError("systemLogPayloadTooLarge", 413);
      }
      return mapServiceError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
