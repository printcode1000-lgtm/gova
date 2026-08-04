import "server-only";

import type {
  PersistentSystemLogInput,
  PersistentSystemLogListOptions,
} from "../entities/persistent-system-log.entity";
import { persistentSystemLogRepository } from "@/modules/data-access/domains/system-logs/index.server";
import { sanitizePersistentSystemLog } from "../system-log-sanitizer";

export class PersistentSystemLogService {
  async add(
    input: PersistentSystemLogInput,
    provenance: "trusted-server" | "untrusted-client" = "trusted-server",
  ) {
    const sanitized = sanitizePersistentSystemLog(input, provenance);
    const terminalDetails = {
      source: sanitized.source,
      platform: sanitized.platform,
      feature: sanitized.feature,
      operation: sanitized.operation,
      errorName: sanitized.errorName,
      statusCode: sanitized.statusCode,
      page: sanitized.page,
      message: sanitized.message,
    };
    if (sanitized.level === "warning") {
      console.warn(
        "[Asol][SystemLog] Operation did not complete",
        terminalDetails,
      );
    } else if (sanitized.level === "error") {
      console.error("[Asol][SystemLog] Operation failed", terminalDetails);
    }
    return persistentSystemLogRepository.add(sanitized);
  }

  async addBatch(
    inputs: PersistentSystemLogInput[],
    provenance: "trusted-server" | "untrusted-client" = "trusted-server",
  ) {
    for (const input of inputs) await this.add(input, provenance);
  }

  async list(options?: PersistentSystemLogListOptions) {
    return persistentSystemLogRepository.list(options);
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
