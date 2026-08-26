import { UI_UID_ATTRIBUTE, uiSimulationTarget } from "@asol/ui-registry-core";

const UI_ATTRIBUTE_PREFIX = "data-ui";
const SIMULATION_ATTRIBUTE_PREFIX = "data-simulation-";

/** Only registry-owned diagnostic metadata may ever reach the clipboard. */
function isSafeInspectorAttribute(name: string): boolean {
  return (
    name === UI_ATTRIBUTE_PREFIX ||
    name.startsWith(`${UI_ATTRIBUTE_PREFIX}-`) ||
    name.startsWith(SIMULATION_ATTRIBUTE_PREFIX)
  );
}

/** Formats only the approved diagnostic attributes for clipboard output. */
export function formatUiAttributes(attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes)
    .filter(([name]) => isSafeInspectorAttribute(name))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
    .join("\n");
}

export function formatUiAttributeTree(
  nodes: readonly Readonly<Record<string, string>>[],
): string {
  return nodes
    .map((attributes, depth) => {
      const text = formatUiAttributes(attributes);
      return text ? `${"  ".repeat(depth)}${text}` : "";
    })
    .filter(Boolean)
    .join("\n-- parent --\n");
}

/** The registered uid of the selected element, or null when it has none. */
export function selectedUiUid(
  attributes: Readonly<Record<string, string>> | undefined,
): string | null {
  const uid = attributes?.[UI_UID_ATTRIBUTE];
  return uid ? uid : null;
}

/**
 * Inspector output always leads with the uid line so a super admin can read the
 * registry address first, then the full safe attribute tree beneath it.
 *
 * The uid is read from the **selected element's own** attributes, never from
 * the tree: an ancestor's uid belongs to the ancestor, and reporting it here
 * would make an unregistered element look registered.
 */
export function formatInspectorOutput(
  selected: Readonly<Record<string, string>> | undefined,
  nodes: readonly Readonly<Record<string, string>>[],
): string {
  const uid = selectedUiUid(selected);
  const header = uid ? `${UI_UID_ATTRIBUTE}=${JSON.stringify(uid)}` : `${UI_UID_ATTRIBUTE}=(missing)`;
  const simulation = selectedSimulationSummary(selected);
  const tree = formatUiAttributeTree(nodes);
  return [header, simulation, tree].filter(Boolean).join("\n");
}

/**
 * What simulation knows about the selected element.
 *
 * The DOM carries the uid; everything else — how the element is exercised, what
 * a scenario may type into it, which event id refers to it — lives in the
 * generated registry. Reading it here means the inspector reports the
 * registered truth rather than whatever attributes happen to sit on the node.
 */
export function selectedSimulationSummary(
  attributes: Readonly<Record<string, string>> | undefined,
): string | null {
  const uid = selectedUiUid(attributes);
  if (!uid) return null;
  const target = uiSimulationTarget(uid);
  if (!target) return null;
  const lines = [`interaction=${JSON.stringify(target.interaction?.type ?? "presence")}`];
  if (target.interaction?.valueContract) {
    lines.push(`valueContract=${JSON.stringify(target.interaction.valueContract)}`);
  }
  if (target.simulationId) lines.push(`simulationId=${JSON.stringify(target.simulationId)}`);
  if (target.repeated) lines.push("repeated=true");
  return lines.join("\n");
}
