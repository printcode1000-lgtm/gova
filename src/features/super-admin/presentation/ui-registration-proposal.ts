import { generateUiUid, isUiUidPrefix, type UiUidRandom } from "@asol/ui-registry-core";

const TODO = "TODO";
/** Prefix used when the element publishes no logical identity to name it after. */
const TODO_PREFIX = "todo";
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

function quoted(value: string): string {
  return JSON.stringify(value);
}

/**
 * Builds a copy-ready UiRegistry registration for an element the registry does
 * not know yet, ready to paste into `uiAttributes({ … })` or a `UiDescriptor`
 * map.
 *
 * The uid is minted here once, for the developer to paste into source — it is
 * never applied to the running page and never persisted. Every other value is
 * derived only from metadata the element already publishes; labels, text
 * content, form values, URLs, route values, tokens, and any other page data are
 * never read. A field that cannot be derived safely is emitted as `TODO` so the
 * developer fills it in deliberately instead of shipping an invented identity.
 */
export function buildRegistrationProposal(
  attributes: Readonly<Record<string, string>>,
  random: UiUidRandom,
): string {
  const id = safeToken(attributes["data-ui-id"]);
  const component = safeToken(attributes["data-ui-component"]);
  const kindAttribute = safeToken(attributes["data-ui"]);
  const kind = ELEMENT_KINDS.find((candidate) => candidate === kindAttribute) ?? null;
  const action = safeToken(attributes["data-ui-action"]);
  const part = safeToken(attributes["data-ui-part"]);
  const state = attributes["data-ui-state"];

  const lines = [
    `  uid: ${quoted(generateUiUid(id ?? component ?? TODO_PREFIX, random))},`,
    `  id: ${quoted(id ?? TODO)},`,
    `  kind: ${quoted(kind ?? TODO)},`,
  ];
  if (action || kind === "action") lines.push(`  action: ${quoted(action ?? TODO)},`);
  if (part) lines.push(`  part: ${quoted(part)},`);
  if (state) {
    const states = state.split(/\s+/).filter((value) => isUiUidPrefix(value));
    if (states.length === 1) lines.push(`  state: ${quoted(states[0]!)},`);
    else if (states.length > 1) lines.push(`  state: [${states.map(quoted).join(", ")}],`);
  }
  for (const [attribute, simulationKind] of Object.entries(SIMULATION_KIND_BY_ATTRIBUTE)) {
    const simulationId = safeToken(attributes[attribute]);
    if (simulationId) {
      lines.push(`  simulation: { kind: ${quoted(simulationKind)}, id: ${quoted(simulationId)} },`);
    }
  }
  if (!id && component) {
    lines.push(`  // Unregistered ${component} fallback: give it a logical id before registering.`);
  }

  return `uiAttributes({\n${lines.join("\n")}\n})`;
}
