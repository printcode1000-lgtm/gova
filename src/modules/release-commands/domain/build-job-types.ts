import type { BuildCommandCatalogEntry } from "./build-command-catalog";

export type BuildJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "interrupted";

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
