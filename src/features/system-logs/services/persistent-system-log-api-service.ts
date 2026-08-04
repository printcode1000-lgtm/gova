import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  PersistentSystemLogEntry,
  PersistentSystemLogInput,
  PersistentSystemLogListOptions,
} from "../entities/persistent-system-log.entity";

function notifySystemLogsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("asol:system-logs-changed"));
}

export class PersistentSystemLogApiService {
  async ingest(input: PersistentSystemLogInput) {
    const result = await asolApi.post<{ ok: true }>(
      ASOL_API_ROUTES.systemLogs.ingest,
      input,
      { suppressErrorLog: true },
    );
    notifySystemLogsChanged();
    return result;
  }

  async ingestBatch(inputs: PersistentSystemLogInput[]) {
    const result = await asolApi.post<{ ok: true }>(
      ASOL_API_ROUTES.systemLogs.ingest,
      inputs,
      { suppressErrorLog: true },
    );
    notifySystemLogsChanged();
    return result;
  }

  async list(
    sessionToken: string,
    options: PersistentSystemLogListOptions = {},
  ) {
    const q = new URLSearchParams({ limit: String(options.limit ?? 300) });
    if (options.origin) q.set("origin", options.origin);
    if (options.level) q.set("level", options.level);
    return asolApi.get<PersistentSystemLogEntry[]>(
      `${ASOL_API_ROUTES.systemLogs.root}?${q}`,
      {
        cache: "no-store",
        suppressErrorLog: true,
        headers: { "x-asol-session-token": sessionToken },
      },
    );
  }

  async clear(sessionToken: string, level?: string) {
    const q = new URLSearchParams();
    if (level) q.set("level", level);
    const result = await asolApi.delete<{ ok: true }>(
      `${ASOL_API_ROUTES.systemLogs.root}?${q}`,
      {
        suppressErrorLog: true,
        headers: { "x-asol-session-token": sessionToken },
      },
    );
    notifySystemLogsChanged();
    return result;
  }
}

export const persistentSystemLogApiService =
  new PersistentSystemLogApiService();
