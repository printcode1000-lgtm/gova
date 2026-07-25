import "server-only";

import type { PersistentSystemLogInput } from "../entities/persistent-system-log.entity";
import { persistentSystemLogRepository } from "../repositories/persistent-system-log-repository";

function redact(value: string | undefined) {
  if (!value) return "";
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<email>")
    .replace(/\b01[0-9]{9}\b/g, "<phone>")
    .replace(/(token|secret|password|authorization)["':=\s]+[^,\s}"']+/gi, "$1:<redacted>");
}

export class PersistentSystemLogService {
  async add(input: PersistentSystemLogInput) {
    return persistentSystemLogRepository.add({
      ...input,
      message: redact(input.message),
      stack: redact(input.stack),
      userAgent: redact(input.userAgent),
    });
  }

  async list(limit?: number) {
    return persistentSystemLogRepository.list(limit);
  }

  async clear(level?: string) {
    return persistentSystemLogRepository.clear(level);
  }
}

export const persistentSystemLogService = new PersistentSystemLogService();

export async function logServerSystemIssue(input: {
  error: unknown;
  feature: string;
  operation: string;
  routeName?: string;
  statusCode?: number;
  requestMethod?: string;
}) {
  const error = input.error;
  await persistentSystemLogService.add({
    level: "error",
    source: "server",
    consoleMethod: "server.error",
    message: error instanceof Error ? error.message : String(error),
    page: input.routeName ?? "server",
    platform: "server",
    errorName: error instanceof Error ? error.name : "ServerError",
    feature: input.feature,
    operation: input.operation,
    stack: error instanceof Error ? error.stack : undefined,
    routeName: input.routeName,
    statusCode: input.statusCode,
    requestMethod: input.requestMethod,
  });
}
