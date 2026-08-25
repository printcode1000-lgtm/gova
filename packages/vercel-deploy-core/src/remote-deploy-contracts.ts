export const REMOTE_DEPLOY_ALL_CONFIRMATION = "DEPLOY_ALL";

export const REMOTE_DEPLOY_ALL_STATUSES = [
  "idle",
  "preparing",
  "running",
  "succeeded",
  "failed",
] as const;

export type RemoteDeployAllStatus = (typeof REMOTE_DEPLOY_ALL_STATUSES)[number];

export const REMOTE_DEPLOY_ALL_STAGES = [
  "idle",
  "sandbox",
  "dependencies",
  "preflight",
  "publish",
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
  "main",
  "complete",
] as const;

export type RemoteDeployAllStage = (typeof REMOTE_DEPLOY_ALL_STAGES)[number];
export type RemoteDeployAllEmailStatus = "pending" | "sent" | "failed";

export interface RemoteDeployAllSnapshot {
  version: 1;
  requestId: string | null;
  status: RemoteDeployAllStatus;
  stage: RemoteDeployAllStage;
  sandboxName: string;
  sandboxSessionId?: string;
  initiatedByUid?: string;
  startedAt?: string;
  updatedAt: string;
  finishedAt?: string;
  exitCode?: number;
  error?: string;
  emailStatus?: RemoteDeployAllEmailStatus;
  emailError?: string;
  /** True once the super-admin console has issued the in-app notification grant. */
  inAppNotified?: boolean;
}

export interface RemoteDeployAllReadiness {
  ready: boolean;
  missingConfiguration: string[];
}

export interface RemoteDeployAllResult {
  snapshot: RemoteDeployAllSnapshot;
  logTail: string;
  readiness: RemoteDeployAllReadiness;
}

export interface StartRemoteDeployAllInput {
  confirmation: string;
}

export interface RemoteDeployAllCallbackInput {
  snapshot: RemoteDeployAllSnapshot;
  logTail: string;
}

export function isRemoteDeployAllTerminal(status: RemoteDeployAllStatus): boolean {
  return status === "succeeded" || status === "failed";
}

export function idleRemoteDeployAllSnapshot(sandboxName: string): RemoteDeployAllSnapshot {
  return {
    version: 1,
    requestId: null,
    status: "idle",
    stage: "idle",
    sandboxName,
    updatedAt: new Date().toISOString(),
  };
}
