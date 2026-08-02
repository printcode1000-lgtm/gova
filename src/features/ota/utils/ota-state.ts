/** Single responsibility: migrate persisted OTA state and enforce daily-check timing. */
import type { OtaStoredState } from "../types/ota.types";
import type { BackgroundDownloadTask } from "@/native-platform";

export const OTA_DAILY_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export type OtaCheckMode = "automatic" | "manual";

export function isDailyOtaCheckDue(
  lastSuccessfulCheckAt: number | undefined,
  now = Date.now(),
): boolean {
  return (
    !lastSuccessfulCheckAt ||
    now - lastSuccessfulCheckAt >= OTA_DAILY_CHECK_INTERVAL_MS
  );
}

export function shouldRunOtaCheck(
  mode: OtaCheckMode,
  lastSuccessfulCheckAt: number | undefined,
  now = Date.now(),
): boolean {
  return mode === "manual" || isDailyOtaCheckDue(lastSuccessfulCheckAt, now);
}

export function isReadyForOtaActivation(
  pending: OtaStoredState["pending"],
): boolean {
  return pending?.ready === true;
}

export function migrateOtaState(value: unknown): OtaStoredState {
  if (!value || typeof value !== "object") return {};
  const source = value as OtaStoredState;
  const state: OtaStoredState = { ...source };
  if (source.pending) {
    state.pending = {
      ...source.pending,
      totalBytes: source.pending.totalBytes ?? source.pending.size,
      ready: true,
    };
  }
  if (
    state.lastSuccessfulCheckAt !== undefined &&
    (!Number.isFinite(state.lastSuccessfulCheckAt) ||
      state.lastSuccessfulCheckAt < 0)
  ) {
    delete state.lastSuccessfulCheckAt;
  }
  return state;
}

export function reconcileNativeDownloadTask(
  current: NonNullable<OtaStoredState["download"]>,
  task: BackgroundDownloadTask,
): NonNullable<OtaStoredState["download"]> {
  if (current.releaseId !== task.releaseId) {
    throw new Error("Native OTA task belongs to another release");
  }
  return {
    ...current,
    nativeTaskId: task.id || current.nativeTaskId,
    downloadedBytes: Math.max(current.downloadedBytes, task.bytesDownloaded),
    totalBytes: current.totalBytes || task.totalBytes,
  };
}
