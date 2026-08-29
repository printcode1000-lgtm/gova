import type { UiDescriptor } from "../domain/ui-descriptor";
import { ELEMENT_KINDS } from "../domain/ui-element-kind";
import { uiInstanceIdRejectionReason } from "../domain/ui-instance";
import { UI_INTERACTION_TYPES, type UiInteraction, type UiInteractionType } from "../domain/ui-interaction";
import { SIMULATION_TARGET_KINDS } from "../domain/ui-simulation-target";
import { UI_STATES } from "../domain/ui-state";
import { isUiValueContractName } from "../simulation/value-contracts";
import { isUiToken } from "../domain/ui-token";
import { isUiUid } from "../domain/ui-uid";
import { UI_PAGE_REGISTRY } from "../registry/ui-page-registry";
import { resolveUiPage } from "../registry/resolve-ui-page";
import type {
  UiRegistryPendingRequestInput,
  UiRegistrySourceLocator,
} from "./pending-request";

export type UiRegistryPendingValidation =
  | { readonly ok: true; readonly request: UiRegistryPendingRequestInput }
  | { readonly ok: false; readonly reason: string };

const MAX_ROUTE_LENGTH = 200;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * A route is safe only when it is a template the page registry itself declares.
 *
 * Shape alone cannot settle this: `/orders/8f21-private` and `/orders/details`
 * are the same shape, and the first is a resolved order id. Membership can — a
 * registered template is value-free by construction, because that is the whole
 * point of the registry.
 */
function isSafeRoute(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_ROUTE_LENGTH) return false;
  if (value === resolveUiPage(null).route) return true;
  return UI_PAGE_REGISTRY.some((page) => page.route === value) ||
    value === "/not-found";
}

function validateLocator(value: unknown): UiRegistrySourceLocator | null {
  const source = record(value);
  if (!source) return null;
  if (!isUiToken(source.component)) return null;
  if (!isSafeRoute(source.route)) return null;
  const anchor = source.anchor;
  if (anchor !== null && anchor !== undefined && !isUiToken(anchor)) return null;
  return {
    component: source.component,
    route: source.route,
    anchor: typeof anchor === "string" ? anchor : null,
  };
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
  if (!source) return null;
  if (!UI_INTERACTION_TYPES.includes(source.type as never)) return null;
  if (source.valueContract !== undefined && !isUiValueContractName(source.valueContract)) return null;
  return {
    type: source.type as UiInteractionType,
    ...(source.valueContract === undefined ? {} : { valueContract: source.valueContract as string }),
  };
}

/**
 * A pending registration mints a *static* literal for source; `instance` is
 * inherently a per-render runtime value, so it is safe to accept here only
 * when it already passes the same content checks `createUiInstanceId` runs
 * for any other caller — never trusted merely for shape.
 */
function validateInstance(value: unknown): UiDescriptor["instance"] | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  if (uiInstanceIdRejectionReason(value) !== null) return null;
  return value as UiDescriptor["instance"];
}

function validateSimulation(value: unknown): UiDescriptor["simulation"] | null | undefined {
  if (value === undefined) return undefined;
  const source = record(value);
  if (!source) return null;
  if (!SIMULATION_TARGET_KINDS.includes(source.kind as never)) return null;
  if (!isUiToken(source.id)) return null;
  return { kind: source.kind as never, id: source.id };
}

/**
 * Rebuilds a pending request from untrusted input, field by field.
 *
 * This is redaction by construction rather than by filtering: only the fields
 * below can survive, and each one must already be safe UiRegistry metadata. A
 * label, a form value, a token, a phone number, a full URL, or a chunk of DOM
 * has no field to arrive in and no shape that would pass, so none of it can be
 * stored even if a caller sends it.
 */
export function validateUiRegistryPendingRequest(value: unknown): UiRegistryPendingValidation {
  const body = record(value);
  if (!body) return { ok: false, reason: "request must be an object" };

  const descriptorSource = record(body.descriptor);
  if (!descriptorSource) return { ok: false, reason: "descriptor must be an object" };

  const uid = body.uid;
  if (!isUiUid(uid)) return { ok: false, reason: "uid must be a generated UiRegistry uid" };
  if (descriptorSource.uid !== uid) return { ok: false, reason: "descriptor uid must match the request uid" };
  if (!isUiToken(descriptorSource.id)) return { ok: false, reason: "descriptor id must be a safe token" };

  const kind = descriptorSource.kind;
  if (kind !== undefined && !ELEMENT_KINDS.includes(kind as never)) {
    return { ok: false, reason: "descriptor kind is not a UiRegistry element kind" };
  }
  for (const field of ["action", "part"] as const) {
    const entry = descriptorSource[field];
    if (entry !== undefined && !isUiToken(entry)) {
      return { ok: false, reason: `descriptor ${field} must be a safe token` };
    }
  }

  const state = validateStates(descriptorSource.state);
  if (state === null) return { ok: false, reason: "descriptor state is not a UiRegistry state" };
  const simulation = validateSimulation(descriptorSource.simulation);
  if (simulation === null) return { ok: false, reason: "descriptor simulation is not a typed target" };
  const interaction = validateInteraction(descriptorSource.interaction);
  if (interaction === null) return { ok: false, reason: "descriptor interaction is not a typed UiRegistry interaction" };
  const instance = validateInstance(descriptorSource.instance);
  if (instance === null) return { ok: false, reason: "descriptor instance failed content validation" };

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
    ...(instance === undefined ? {} : { instance }),
  };

  return { ok: true, request: { uid, descriptor, locator } };
}
