import type { UiInteractionType } from "../domain/ui-interaction";
import type { UiInstanceId } from "../domain/ui-instance";
import { UI_SIMULATION_REGISTRY } from "./generated/ui-simulation-registry";
import type { UiSimulationTargetRecord } from "./simulation-registry.types";
import { checkUiValue } from "./value-contracts";

const BY_UID = new Map(UI_SIMULATION_REGISTRY.map((target) => [target.uid, target]));

const BY_SIMULATION_ID = new Map<string, UiSimulationTargetRecord[]>();
for (const target of UI_SIMULATION_REGISTRY) {
  if (!target.simulationId) continue;
  BY_SIMULATION_ID.set(target.simulationId, [
    ...(BY_SIMULATION_ID.get(target.simulationId) ?? []),
    target,
  ]);
}

/** Every registered simulation target, in generated order. */
export function uiSimulationTargets(): readonly UiSimulationTargetRecord[] {
  return UI_SIMULATION_REGISTRY;
}

/** The one target a uid addresses, or null. */
export function uiSimulationTarget(uid: string): UiSimulationTargetRecord | null {
  return BY_UID.get(uid) ?? null;
}

/** Targets a page can render, by registered route template. */
export function uiSimulationTargetsForRoute(route: string): readonly UiSimulationTargetRecord[] {
  return UI_SIMULATION_REGISTRY.filter((target) => target.routes.includes(route));
}

/**
 * The uid a scenario/event id refers to.
 *
 * An id that resolves to more than one uid is not a name, it is an ambiguity,
 * so it resolves to nothing and the guard reports it.
 */
export function uiSimulationUidForSimulationId(simulationId: string): string | null {
  const matches = BY_SIMULATION_ID.get(simulationId) ?? [];
  return matches.length === 1 ? matches[0]!.uid : null;
}

/** Simulation ids that resolve to more than one uid. */
export function ambiguousUiSimulationIds(): readonly string[] {
  return [...BY_SIMULATION_ID.entries()]
    .filter(([, targets]) => targets.length > 1)
    .map(([id]) => id)
    .sort();
}

export type UiSimulationStepCheck =
  | { readonly ok: true; readonly target: UiSimulationTargetRecord }
  | { readonly ok: false; readonly reason: string };

export interface UiSimulationStepRequest {
  readonly targetUid: string;
  readonly interaction: UiInteractionType;
  readonly value?: string;
  /** Registered route the step runs on, when the caller knows it. */
  readonly route?: string;
  /** One concrete runtime-rendered copy of a repeated source UID. */
  readonly instance?: UiInstanceId;
  /** Explicitly opt into the first rendered copy of a repeated source UID. */
  readonly selection?: "first";
}

/**
 * Decides whether a scenario step may run, before anything touches the DOM.
 * Repeated targets must be addressed by a concrete instance or by an explicit
 * `selection: "first"`; an omitted instance never silently means first match.
 */
export function checkUiSimulationStep(request: UiSimulationStepRequest): UiSimulationStepCheck {
  const target = uiSimulationTarget(request.targetUid);
  if (!target) {
    return { ok: false, reason: `unknown simulation target uid "${request.targetUid}"` };
  }
  if (request.route !== undefined && !target.routes.includes(request.route)) {
    return {
      ok: false,
      reason: `uid "${request.targetUid}" is not rendered by route ${request.route} (registered routes: ${target.routes.join(", ") || "none"})`,
    };
  }
  if (request.instance !== undefined && request.selection !== undefined) {
    return {
      ok: false,
      reason: `uid "${request.targetUid}" cannot request both a concrete instance and first-match selection`,
    };
  }
  if (request.instance !== undefined && !target.repeated) {
    return {
      ok: false,
      reason: `uid "${request.targetUid}" renders once; it never needs an instance to disambiguate it`,
    };
  }
  if (request.selection !== undefined && !target.repeated) {
    return {
      ok: false,
      reason: `uid "${request.targetUid}" renders once; first-match selection is only valid for repeated targets`,
    };
  }
  if (target.repeated && request.instance === undefined && request.selection !== "first") {
    return {
      ok: false,
      reason: `uid "${request.targetUid}" is repeated; provide a concrete instance or explicit selection "first"`,
    };
  }
  if (request.interaction !== target.interaction.type) {
    return {
      ok: false,
      reason: `uid "${request.targetUid}" is registered as "${target.interaction.type}", not "${request.interaction}"`,
    };
  }
  const value = checkUiValue(target.interaction.valueContract, request.value);
  if (!value.ok) {
    return { ok: false, reason: `uid "${request.targetUid}": ${value.reason}` };
  }
  return { ok: true, target };
}

/** Escapes a value for use inside a `"..."`-quoted CSS attribute selector. */
function cssAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Builds the only selector a simulation adapter may use. `instance` narrows a
 * canonical source UID to one runtime copy; explicit first-match selection is
 * intentionally not encoded in CSS and is enforced by the adapter contract.
 */
export function uiSimulationSelector(uid: string, instance?: string): string {
  const base = `[data-ui-uid="${cssAttributeValue(uid)}"]`;
  return instance === undefined ? base : `${base}[data-ui-instance="${cssAttributeValue(instance)}"]`;
}
