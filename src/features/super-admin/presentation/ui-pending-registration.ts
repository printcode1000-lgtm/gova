import {
  generateUiUid,
  isUiUidPrefix,
  resolveUiPage,
  type UiDescriptor,
  type UiRegistryPendingRequestInput,
  type UiUidRandom,
} from "@asol/ui-registry-core";

const ELEMENT_KINDS = ["action", "component", "field", "item", "region"] as const;
const SIMULATION_KIND_BY_ATTRIBUTE: Readonly<Record<string, string>> = {
  "data-simulation-target": "event",
  "data-simulation-field": "field",
  "data-simulation-list-item": "list-item",
  "data-simulation-file": "file",
  "data-simulation-state": "state",
};

function safeToken(value: string | undefined): string | null {
  return isUiUidPrefix(value) ? value : null;
}

/**
 * Builds the pending registration request for one unregistered element.
 *
 * Everything here comes from metadata the element already publishes plus the
 * page's *registered* route template. Nothing is read from labels, text nodes,
 * form values, the resolved URL, or any attribute outside the UiRegistry and
 * simulation namespaces — so there is no path by which user content or a token
 * could reach the queue.
 *
 * The element's own DOM `id` becomes the source anchor only when it is a safe
 * author-written token. A templated id (`nav-item-${href}`) is not one, so the
 * request simply arrives without an anchor and the apply tool refuses to guess.
 */
export function buildPendingRegistrationRequest(
  attributes: Readonly<Record<string, string>>,
  pathname: string | null,
  domId: string | undefined,
  random: UiUidRandom,
): UiRegistryPendingRequestInput | null {
  const page = resolveUiPage(pathname);
  const component = safeToken(attributes["data-ui-component"]) ?? safeToken(attributes["data-ui"]);
  if (!component) return null;

  const publishedId = safeToken(attributes["data-ui-id"]);
  // With no published identity the request is named after where it was found:
  // the registered page id and the component marker, both safe tokens.
  const id = publishedId ?? `pending.${page.id}.${component}`;
  const kindAttribute = safeToken(attributes["data-ui"]);
  const kind = ELEMENT_KINDS.find((candidate) => candidate === kindAttribute);
  const action = safeToken(attributes["data-ui-action"]);
  const part = safeToken(attributes["data-ui-part"]);
  const states = (attributes["data-ui-state"] ?? "")
    .split(/\s+/)
    .filter((value) => isUiUidPrefix(value));

  let simulation: UiDescriptor["simulation"];
  for (const [attribute, simulationKind] of Object.entries(SIMULATION_KIND_BY_ATTRIBUTE)) {
    const simulationId = safeToken(attributes[attribute]);
    if (simulationId) {
      simulation = { kind: simulationKind as NonNullable<UiDescriptor["simulation"]>["kind"], id: simulationId };
      break;
    }
  }

  const uid = generateUiUid(id, random);
  const descriptor: UiDescriptor = {
    uid,
    id,
    ...(kind ? { kind } : {}),
    ...(action ? { action } : {}),
    ...(part ? { part } : {}),
    ...(states.length === 1 ? { state: states[0] as UiDescriptor["state"] } : {}),
    ...(states.length > 1 ? { state: states as UiDescriptor["state"] } : {}),
    ...(simulation ? { simulation } : {}),
  };

  return {
    uid,
    descriptor,
    locator: {
      component,
      route: page.route,
      anchor: safeToken(domId) ?? null,
    },
  };
}
