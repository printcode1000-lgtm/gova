import { asolApi, ASOL_API_ROUTES } from "@/core/api";
import type {
  PersistentSystemLogEntry,
  PersistentSystemLogInput,
  PersistentSystemLogListOptions,
} from "../entities/persistent-system-log.entity";
import type { SystemLogListPage, SystemLogSummary } from "@asol/system-logs-core";

function notifySystemLogsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("asol:system-logs-changed"));
}

function buildQuery(
  sessionToken: string,
  options: PersistentSystemLogListOptions = {},
) {
  const q = new URLSearchParams({ limit: String(options.limit ?? 300) });
  if (options.origin) q.set("origin", options.origin);
  if (options.level) q.set("level", options.level);
  if (options.cursor) q.set("cursor", options.cursor);
  if (options.platform) q.set("platform", options.platform);
  if (options.feature) q.set("feature", options.feature);
  if (options.query) q.set("query", options.query);
  if (options.appVersion) q.set("appVersion", options.appVersion);
  if (options.nativeVersion) q.set("nativeVersion", options.nativeVersion);
  if (options.since) q.set("since", options.since);
  if (options.until) q.set("until", options.until);
  return { q, sessionToken };
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

  async listPage(
    sessionToken: string,
    options: PersistentSystemLogListOptions = {},
  ) {
    const { q } = buildQuery(sessionToken, options);
    return asolApi.get<SystemLogListPage>(
      `${ASOL_API_ROUTES.systemLogs.root}?${q}`,
      {
        cache: "no-store",
        suppressErrorLog: true,
        headers: { "x-asol-session-token": sessionToken },
      },
    );
  }

  async list(
    sessionToken: string,
    options: PersistentSystemLogListOptions = {},
  ) {
    const page = await this.listPage(sessionToken, options);
    return page.items;
  }

  async summary(sessionToken: string) {
    return asolApi.get<SystemLogSummary>(ASOL_API_ROUTES.systemLogs.summary, {
      cache: "no-store",
      suppressErrorLog: true,
      headers: { "x-asol-session-token": sessionToken },
    });
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

  openStream(sessionToken: string, sinceIso: string) {
    const q = new URLSearchParams({
      since: sinceIso,
      sessionToken,
    });
    return new EventSource(`${ASOL_API_ROUTES.systemLogs.stream}?${q}`);
  }
}

export const persistentSystemLogApiService =
  new PersistentSystemLogApiService();

export type { PersistentSystemLogEntry };
