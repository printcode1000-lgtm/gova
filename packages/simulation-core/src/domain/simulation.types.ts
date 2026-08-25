export type SimulationRuntime =
  | "static-out"
  | "android"
  | "ios"
  | "development"
  | "production";

export type SimulationUserRole = "buyer" | "seller" | "delivery";

export interface SimulationUser {
  id: string;
  role: SimulationUserRole;
  ordinal: 1 | 2 | 3;
  storeName: string;
  phone: string;
  password: string;
}

export type SimulationDriverAction =
  | { type: "set-value"; selector: string; value: string }
  | { type: "select-first-option"; selector: string }
  | { type: "click"; selector: string; accessibleLabel?: string }
  | { type: "set-internal-image"; selector: string }
  | { type: "submit"; selector: string }
  | { type: "wait-for-target"; selector: string; timeoutMs?: number }
  | { type: "wait"; milliseconds: number };

export interface PageInteractionDefinition {
  id: string;
  label: string;
  description: string;
  actor: "guest" | SimulationUserRole | "any";
  actions: readonly SimulationDriverAction[];
}

export interface UserPageDefinition {
  id: string;
  route: string;
  samplePath: string;
  label: string;
  description: string;
  interactions: readonly PageInteractionDefinition[];
}

export type SimulationProgressStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed";

export interface SimulationProgressStep {
  id: string;
  label: string;
  status: SimulationProgressStatus;
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SimulationRunResult {
  succeeded: boolean;
  runtime: SimulationRuntime;
  pageId: string;
  interactionId: string;
  steps: readonly SimulationProgressStep[];
  error?: string;
}

export interface SimulationExecutionPort {
  loadPage(path: string): Promise<void>;
  setValue(selector: string, value: string): Promise<void>;
  selectFirstOption(selector: string): Promise<void>;
  click(selector: string, accessibleLabel?: string): Promise<void>;
  setInternalImage(selector: string, sourcePath: string): Promise<void>;
  submit(selector: string): Promise<void>;
  waitForTarget(selector: string, timeoutMs?: number): Promise<void>;
  wait(milliseconds: number): Promise<void>;
  dispose(): void;
}

export interface SimulationRuntimeInput {
  deployment: "local-development" | "web-production" | "static-export";
  platform: "web" | "android" | "ios";
}
