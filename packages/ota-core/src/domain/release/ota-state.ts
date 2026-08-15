/** Single responsibility: migrate persisted OTA state and enforce daily-check timing. */
import type { OtaStoredState } from "./manifest-types";
import type {
  BackgroundDownloadStatus,
  BackgroundDownloadTask,
} from "@asol/native-core";

import {
  isOtaVersion,
  compareOtaVersions,
  shouldSupersedePending,
  OTA_VERSION_PATTERN,
} from "../versioning/version-ordering";

export {
  isOtaVersion,
  compareOtaVersions,
  shouldSupersedePending,
  OTA_VERSION_PATTERN,
};

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
    case "cancelled":
    case "paused":
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
