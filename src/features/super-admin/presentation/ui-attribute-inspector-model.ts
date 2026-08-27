import { UI_UID_ATTRIBUTE, isUiUidPrefix, uiSimulationTarget } from "@asol/ui-registry-core";

const UI_ATTRIBUTE_PREFIX = "data-ui";
const SIMULATION_ATTRIBUTE_PREFIX = "data-simulation-";

/**
 * Registry metadata plus a literal HTML id when that id is a safe prefix.
 * Unsafe ids (resource values, labels) stay off the clipboard.
 */
function isSafeInspectorAttribute(name: string, value: string): boolean {
  if (name === "id") return isUiUidPrefix(value);
  return (
    name === UI_ATTRIBUTE_PREFIX ||
    name.startsWith(`${UI_ATTRIBUTE_PREFIX}-`) ||
    name.startsWith(SIMULATION_ATTRIBUTE_PREFIX)
  );
}

/** Formats only the approved diagnostic attributes for clipboard output. */
export function formatUiAttributes(attributes: Readonly<Record<string, string>>): string {
  return Object.entries(attributes)
    .filter(([name, value]) => isSafeInspectorAttribute(name, value))
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

const MISSING_SELECTED_ID = "مفقود";

/**
 * Inspector panel and selection clipboard: the selected element's safe HTML id,
 * or a missing marker. Ancestors, uid, simulation, and other attributes stay
 * off this surface.
 */
export function formatInspectorOutput(
  selected: Readonly<Record<string, string>> | undefined,
): string {
  const selectedId = selected?.id;
  if (typeof selectedId === "string" && isUiUidPrefix(selectedId)) {
    return selectedId;
  }
  return MISSING_SELECTED_ID;
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
