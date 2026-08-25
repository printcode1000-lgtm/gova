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

/**
 * Instrumentation family a simulation action addresses.
 *
 * - `event`, `field` and `file` must resolve to exactly one element; a missing
 *   or duplicated marker is an explicit failure.
 * - `list-item` marks a repeated row of a real list, so it resolves to the
 *   first marked element in document order by contract.
 */
export type SimulationTargetKind = "event" | "field" | "list-item" | "file";

export interface SimulationTarget {
  kind: SimulationTargetKind;
  id: string;
}

export type SimulationDriverAction =
  | { type: "set-value"; target: SimulationTarget; value: string }
  | { type: "select-first-option"; target: SimulationTarget }
  | { type: "press-key"; target: SimulationTarget; key: string }
  | { type: "click"; target: SimulationTarget; accessibleLabel?: string }
  | { type: "set-internal-image"; target: SimulationTarget }
  | { type: "submit"; target: SimulationTarget }
  | { type: "wait-for-target"; target: SimulationTarget; timeoutMs?: number }
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
  setValue(target: SimulationTarget, value: string): Promise<void>;
  selectFirstOption(target: SimulationTarget): Promise<void>;
  pressKey(target: SimulationTarget, key: string): Promise<void>;
  click(target: SimulationTarget, accessibleLabel?: string): Promise<void>;
  setInternalImage(target: SimulationTarget, sourcePath: string): Promise<void>;
  submit(target: SimulationTarget): Promise<void>;
  waitForTarget(target: SimulationTarget, timeoutMs?: number): Promise<void>;
  wait(milliseconds: number): Promise<void>;
  dispose(): void;
}

export interface SimulationRuntimeInput {
  deployment: "local-development" | "web-production" | "static-export";
  platform: "web" | "android" | "ios";
}
