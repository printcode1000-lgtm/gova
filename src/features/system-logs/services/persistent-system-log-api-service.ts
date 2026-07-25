import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  PersistentSystemLogEntry,
  PersistentSystemLogInput,
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

  async list(uid: string, phone: string, limit = 300) {
    const q = new URLSearchParams({ uid, phone, limit: String(limit) });
    return asolApi.get<PersistentSystemLogEntry[]>(
      `${ASOL_API_ROUTES.systemLogs.root}?${q}`,
      { cache: "no-store", suppressErrorLog: true },
    );
  }

  async clear(uid: string, phone: string, level?: string) {
    const q = new URLSearchParams({ uid, phone });
    if (level) q.set("level", level);
    const result = await asolApi.delete<{ ok: true }>(
      `${ASOL_API_ROUTES.systemLogs.root}?${q}`,
      { suppressErrorLog: true },
    );
    notifySystemLogsChanged();
    return result;
  }
}

export const persistentSystemLogApiService =
  new PersistentSystemLogApiService();
