import type { UiInteractionType } from "@asol/ui-registry-core";

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
 * - `state` marks a real rendered state rather than a control — the page's own
 *   empty state, for example. It is only ever probed for presence.
 */
export type SimulationTargetKind =
  | "event"
  | "field"
  | "list-item"
  | "file"
  | "state";

/**
 * What a scenario step points at.
 *
 * The identity is the registered `data-ui-uid` and nothing else. `kind` is
 * carried alongside only so the runner can keep each family's existing
 * behaviour — notably that a list row resolves to the first match — and it is
 * derived from the registry, never written by hand.
 */
export interface SimulationTarget {
  /** Registered UiRegistry uid. The only locator simulation may use. */
  targetUid: string;
  /** Registered interaction the step performs. */
  interaction: UiInteractionType;
  kind: SimulationTargetKind;
  /** Scenario/event id this target was declared with, for reports. */
  simulationId: string;
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
   * the user has walked a real prerequisite path — searching for a product
   * before a cart has anything in it, for example. The declared actions then
   * navigate the same frame through real controls until the target renders.
   * Omitted for an interaction whose target is present on the page itself.
   */
  entryPath?: string;
  /**
   * Real state the page renders when the data this interaction needs does not
   * exist — an empty orders list, a catalog with no sections. When an action
   * cannot find its target and this marker is present, the run is reported
   * unavailable rather than failed: the application is behaving correctly and
   * the environment simply has nothing to act on. A missing target with no such
   * marker stays an explicit failure.
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
