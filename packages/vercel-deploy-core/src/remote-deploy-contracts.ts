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

/** One stage of the run, closed when the next stage begins. */
export interface RemoteDeployAllStageSpan {
  stage: RemoteDeployAllStage;
  startedAt: string;
  finishedAt?: string;
}

export interface RemoteDeployAllSnapshot {
  version: 1;
  requestId: string | null;
  status: RemoteDeployAllStatus;
  stage: RemoteDeployAllStage;
  sandboxName: string;
  sandboxSessionId?: string;
  initiatedByUid?: string;
  command?: "deploy:all" | "deploy:push";
  target?: "all" | "main" | "notifications" | "products" | "orders" | "profiles" | "submain" | "sub2main";
  startedAt?: string;
  updatedAt: string;
  finishedAt?: string;
  exitCode?: number;
  error?: string;
  emailStatus?: RemoteDeployAllEmailStatus;
  emailError?: string;
  /** True once the super-admin console has issued the in-app notification grant. */
  inAppNotified?: boolean;
  /**
   * How long each stage took, in the order they ran.
   *
   * Written by the sandbox runner as it reads `deploy:all`'s phase banners.
   * The console needs it to answer the only question a release console is
   * really asked — "what is it doing, and how long has it been doing it" —
   * without keeping timing state of its own that a reopened page would lose.
   */
  stageHistory?: RemoteDeployAllStageSpan[];
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
  command?: "deploy:all" | "deploy:push";
  target?: "all" | "main" | "notifications" | "products" | "orders" | "profiles" | "submain" | "sub2main";
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
