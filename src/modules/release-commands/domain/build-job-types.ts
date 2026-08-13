import type { BuildCommandCatalogEntry } from "./build-command-catalog";

export type BuildJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "interrupted";
export type BuildJobStage =
  | "queued"
  | "starting"
  | "checking-compatibility"
  | "building-web"
  | "preparing-artifacts"
  | "syncing-native"
  | "building-android"
  | "optimizing"
  | "signing"
  | "testing"
  | "detecting-device"
  | "wiping-device"
  | "installing-device"
  | "testing-on-device"
  | "uploading"
  | "publishing-manifest"
  | "mirroring"
  | "verifying"
  | "finalizing-results"
  | "completed";

export interface BuildArtifactDescriptor {
  name: string;
  path: string;
  size: number;
  mtime: string;
  sha256: string;
}

export interface BuildJobRecord {
  id: string;
  commandId: string;
  command: Pick<BuildCommandCatalogEntry, "id" | "script" | "argv" | "category" | "danger">;
  status: BuildJobStatus;
  stage?: BuildJobStage;
  /**
   * The specific work running inside `stage` — which check, which test, which
   * package. Free text reported by the script itself; absent for commands that
   * do not announce their steps.
   */
  activity?: string;
  queuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  pid?: number;
  exitCode?: number | null;
  logPath: string;
  error?: string;
  artifacts?: BuildArtifactDescriptor[];
  artifactSnapshot?: Record<string, { size: number; mtimeMs: number }>;
}

export interface StartBuildJobInput {
  commandId: string;
  confirmationPhrase?: string;
  parameters?: Record<string, unknown>;
}

export interface BuildCommandReadiness {
  commandId: string;
  ready: boolean;
  missingEnv: string[];
  reason?: string;
}

export interface ReleaseVersionSnapshot {
  androidCurrent?: string;
  contentCurrent?: string;
  otaCurrent?: string;
}

export interface PaginatedBuildJobs {
  jobs: BuildJobRecord[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

const BUILD_JOB_TRANSITIONS: Record<BuildJobStatus, readonly BuildJobStatus[]> = {
  queued: ["running", "failed", "cancelled", "interrupted"],
  running: ["succeeded", "failed", "cancelled", "interrupted"],
  succeeded: [], failed: [], cancelled: [], interrupted: [],
};

export function assertBuildJobTransition(current: BuildJobStatus, next: BuildJobStatus): void {
  if (!BUILD_JOB_TRANSITIONS[current].includes(next)) throw new Error(`releaseJobTransitionInvalid:${current}:${next}`);
}
