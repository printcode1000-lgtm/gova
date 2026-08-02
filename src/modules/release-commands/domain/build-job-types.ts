import type { BuildCommandCatalogEntry } from "./build-command-catalog";

export type BuildJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

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
  exitCode?: number | null;
  logPath: string;
  error?: string;
  artifacts?: BuildArtifactDescriptor[];
}

export interface StartBuildJobInput {
  commandId: string;
  confirmationPhrase?: string;
  extraArgs?: string[];
}
