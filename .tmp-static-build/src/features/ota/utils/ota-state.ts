/** Single responsibility: migrate persisted OTA state and enforce daily-check timing. */
import type { OtaStoredState } from "../types/ota.types";
import type {
  BackgroundDownloadStatus,
  BackgroundDownloadTask,
} from "@/native-platform";

export const OTA_DAILY_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const OTA_FREE_SPACE_MARGIN = 1.2;
export type OtaCheckMode = "automatic" | "manual";
export type NativeDownloadPollAction =
  | "wait"
  | "complete"
  | "reschedule"
  | "fail";

export function nativeDownloadPollAction(
  status: BackgroundDownloadStatus,
  alreadyRescheduledMissing: boolean,
): NativeDownloadPollAction {
  switch (status) {
    case "pending":
    case "downloading":
    case "verifying":
      return "wait";
    case "completed":
      return "complete";
    case "failed":
      return "fail";
    case "missing":
      return alreadyRescheduledMissing ? "fail" : "reschedule";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function shouldPersistNativeDownloadProgress(
  previousPercent: number,
  nextPercent: number,
  previousPersistedAt: number,
  now: number,
  minimumIntervalMs = 5_000,
): boolean {
  return (
    nextPercent !== previousPercent &&
    now - previousPersistedAt >= minimumIntervalMs
  );
}

export function compareOtaVersions(left: string, right: string): number {
  const parse = (value: string) =>
    value.split("-")[0]!.split(".").map((part) => Number(part) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length, 3); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

export function shouldSupersedePending(
  pendingVersion: string,
  remoteVersion: string,
): boolean {
  return compareOtaVersions(remoteVersion, pendingVersion) > 0;
}

export function isDailyOtaCheckDue(
  lastSuccessfulCheckAt: number | undefined,
  now = Date.now(),
): boolean {
  return (
    !lastSuccessfulCheckAt ||
    lastSuccessfulCheckAt > now ||
    now - lastSuccessfulCheckAt >= OTA_DAILY_CHECK_INTERVAL_MS
  );
}

export function clampFutureOtaCheckTimestamp(
  lastSuccessfulCheckAt: number | undefined,
  now = Date.now(),
): number | undefined {
  return lastSuccessfulCheckAt !== undefined && lastSuccessfulCheckAt > now
    ? now
    : lastSuccessfulCheckAt;
}

export function requiredOtaFreeBytes(
  manifestBytes: number,
  transportBytes: number,
): number {
  // Atomic activation adds one full candidate, up to one full staged payload,
  // and the transport object. Twenty percent covers filesystem metadata/temp I/O.
  return Math.ceil((manifestBytes * 2 + transportBytes) * OTA_FREE_SPACE_MARGIN);
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
