"use client";

import type { PersistentSystemLogInput } from "./entities/persistent-system-log.entity";
import { persistentSystemLogApiService } from "./services/persistent-system-log-api-service";

const sentRecently = new Map<string, number>();
const DEDUPE_WINDOW_MS = 15_000;

function fingerprint(input: PersistentSystemLogInput) {
  return [
    input.level,
    input.source,
    input.consoleMethod,
    input.message,
    input.page,
    input.platform,
    input.errorName ?? "",
    input.feature ?? "",
    input.operation ?? "",
    input.sourceFile ?? "",
    input.sourceLine ?? "",
  ].join("\u001f");
}

export function submitPersistentClientLog(input: PersistentSystemLogInput) {
  if (typeof window === "undefined") return;
  if (input.level === "normal") return;
  const key = fingerprint(input);
  const now = Date.now();
  const last = sentRecently.get(key) ?? 0;
  if (now - last < DEDUPE_WINDOW_MS) return;
  sentRecently.set(key, now);
  void persistentSystemLogApiService.ingest(input).catch(() => undefined);
}
