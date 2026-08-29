import type { UiDescriptor } from "../domain/ui-descriptor";
import { ELEMENT_KINDS } from "../domain/ui-element-kind";
import { UI_INTERACTION_TYPES, type UiInteraction, type UiInteractionType } from "../domain/ui-interaction";
import { SIMULATION_TARGET_KINDS } from "../domain/ui-simulation-target";
import { UI_STATES } from "../domain/ui-state";
import { isUiValueContractName } from "../simulation/value-contracts";
import { isUiToken } from "../domain/ui-token";
import { isUiUid } from "../domain/ui-uid";
import { UI_PAGE_REGISTRY } from "../registry/ui-page-registry";
import { resolveUiPage } from "../registry/resolve-ui-page";
import type { UiRegistryPendingRequestInput, UiRegistrySourceLocator } from "./pending-request";

export type UiRegistryPendingValidation =
  | { readonly ok: true; readonly request: UiRegistryPendingRequestInput }
  | { readonly ok: false; readonly reason: string };

const MAX_ROUTE_LENGTH = 200;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function isSafeRoute(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_ROUTE_LENGTH) return false;
  if (value === resolveUiPage(null).route) return true;
  return UI_PAGE_REGISTRY.some((page) => page.route === value) || value === "/not-found";
}

function validateLocator(value: unknown): UiRegistrySourceLocator | null {
  const source = record(value);
  if (!source || !isUiToken(source.component) || !isSafeRoute(source.route)) return null;
  const anchor = source.anchor;
  if (anchor !== null && anchor !== undefined && !isUiToken(anchor)) return null;
  return { component: source.component, route: source.route, anchor: typeof anchor === "string" ? anchor : null };
}

function validateStates(value: unknown): UiDescriptor["state"] | null | undefined {
  if (value === undefined) return undefined;
  const values = Array.isArray(value) ? value : [value];
  if (!values.every((entry) => UI_STATES.includes(entry as never))) return null;
  return (Array.isArray(value) ? values : values[0]) as UiDescriptor["state"];
}

function validateInteraction(value: unknown): UiInteraction | null | undefined {
  if (value === undefined) return undefined;
  const source = record(value);
  if (!source || !UI_INTERACTION_TYPES.includes(source.type as never)) return null;
  if (source.valueContract !== undefined && !isUiValueContractName(source.valueContract)) return null;
  return {
    type: source.type as UiInteractionType,
    ...(source.valueContract === undefined ? {} : { valueContract: source.valueContract as string }),
  };
}

function validateSimulation(value: unknown): UiDescriptor["simulation"] | null | undefined {
  if (value === undefined) return undefined;
  const source = record(value);
  if (!source || !SIMULATION_TARGET_KINDS.includes(source.kind as never) || !isUiToken(source.id)) return null;
  return { kind: source.kind as never, id: source.id };
}

/**
 * Pending registration stores only source-static metadata. Runtime
 * `data-ui-instance` identifies the particular rendered copy the inspector saw;
 * it must never be frozen into the descriptor that gets written to source.
 */
export function validateUiRegistryPendingRequest(value: unknown): UiRegistryPendingValidation {
  const body = record(value);
  if (!body) return { ok: false, reason: "request must be an object" };
  const descriptorSource = record(body.descriptor);
  if (!descriptorSource) return { ok: false, reason: "descriptor must be an object" };

  if (descriptorSource.instance !== undefined) {
    return {
      ok: false,
      reason: "descriptor instance is runtime-only metadata and must not be persisted by the pending source-registration queue",
    };
  }

  const uid = body.uid;
  if (!isUiUid(uid)) return { ok: false, reason: "uid must be a generated UiRegistry uid" };
  if (descriptorSource.uid !== uid) return { ok: false, reason: "descriptor uid must match the request uid" };
  if (!isUiToken(descriptorSource.id)) return { ok: false, reason: "descriptor id must be a safe token" };

  const kind = descriptorSource.kind;
  if (kind !== undefined && !ELEMENT_KINDS.includes(kind as never)) return { ok: false, reason: "descriptor kind is not a UiRegistry element kind" };
  for (const field of ["action", "part"] as const) {
    const entry = descriptorSource[field];
    if (entry !== undefined && !isUiToken(entry)) return { ok: false, reason: `descriptor ${field} must be a safe token` };
  }

  const state = validateStates(descriptorSource.state);
  if (state === null) return { ok: false, reason: "descriptor state is not a UiRegistry state" };
  const simulation = validateSimulation(descriptorSource.simulation);
  if (simulation === null) return { ok: false, reason: "descriptor simulation is not a typed target" };
  const interaction = validateInteraction(descriptorSource.interaction);
  if (interaction === null) return { ok: false, reason: "descriptor interaction is not a typed UiRegistry interaction" };
  const locator = validateLocator(body.locator);
  if (!locator) return { ok: false, reason: "locator must carry a safe component, route, and anchor" };

  const descriptor: UiDescriptor = {
    uid,
    id: descriptorSource.id as string,
    ...(kind === undefined ? {} : { kind: kind as UiDescriptor["kind"] }),
    ...(descriptorSource.action === undefined ? {} : { action: descriptorSource.action as string }),
    ...(descriptorSource.part === undefined ? {} : { part: descriptorSource.part as string }),
    ...(state === undefined ? {} : { state }),
    ...(simulation === undefined ? {} : { simulation }),
    ...(interaction === undefined ? {} : { interaction }),
  };

  return { ok: true, request: { uid, descriptor, locator } };
}
