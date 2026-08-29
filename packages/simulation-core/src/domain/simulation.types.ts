import type { UiInstanceId, UiInteractionType } from "@asol/ui-registry-core";

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
 * - `event`, `field` and `file` normally resolve to one element.
 * - `list-item` marks a repeated row; selecting its first rendered copy must be
 *   requested explicitly by the target rather than being an adapter fallback.
 * - `state` marks a real rendered state rather than a control.
 */
export type SimulationTargetKind =
  | "event"
  | "field"
  | "list-item"
  | "file"
  | "state";

/** What a scenario step points at. */
export interface SimulationTarget {
  /** Canonical registered source-site uid. */
  targetUid: string;
  /** Registered interaction the step performs. */
  interaction: UiInteractionType;
  kind: SimulationTargetKind;
  /** Scenario/event id this target was declared with, for reports. */
  simulationId: string;
  /** One concrete runtime-rendered copy of a repeated source UID. */
  instance?: UiInstanceId;
  /** Explicit collection choice; never inferred merely because a uid repeats. */
  selection?: "first";
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
  /**
   * Real path this interaction starts from, when its target only exists after
   * the user has walked a real prerequisite path.
   */
  entryPath?: string;
  /**
   * Real state the page renders when the data this interaction needs does not
   * exist. Missing data is then reported unavailable rather than as a defect.
   */
  unavailableWhen?: { target: SimulationTarget; reason: string };
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
  | "failed"
  | "unavailable";

/**
 * `unavailable` is not a pass and not a defect: the declared real target could
 * not be reached because the page itself reports it has no such data yet.
 */
export type SimulationRunOutcome = "passed" | "failed" | "unavailable";

export interface SimulationProgressStep {
  id: string;
  label: string;
  status: SimulationProgressStatus;
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface SimulationRunResult {
  outcome: SimulationRunOutcome;
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
  hasTarget(target: SimulationTarget): Promise<boolean>;
  /**
   * Lets real work the last action started finish before the frame is torn
   * down. Dropping the frame mid-request leaves the server reading a truncated
   * body, which surfaces as a server fault for what was a complete user action.
   */
  settle(): Promise<void>;
  wait(milliseconds: number): Promise<void>;
  dispose(): void;
}

export interface SimulationRuntimeInput {
  deployment: "local-development" | "web-production" | "static-export";
  platform: "web" | "android" | "ios";
}
