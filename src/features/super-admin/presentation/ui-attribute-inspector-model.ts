/**
 * What the DOM inspector reports about the element under the pointer.
 *
 * The element's identity is the plain HTML `id` written in the source, read
 * straight off the node. There is no registry, catalog, or manifest behind it:
 * the attribute in the DOM is the whole truth, so nothing here can go stale or
 * need regenerating.
 */

const MISSING_SELECTED_ID = "مفقود";

/** Any non-empty HTML id is inspectable; the DOM attribute is authoritative. */
export function isInspectableId(value: string): boolean {
  return value.length > 0;
}

/** The selected element's id, or null when it carries none worth reporting. */
export function selectedElementId(
  attributes: Readonly<Record<string, string>> | undefined,
): string | null {
  const id = attributes?.id;
  return typeof id === "string" && isInspectableId(id) ? id : null;
}

/** Inspector panel and selection clipboard: the selected element's id. */
export function formatInspectorOutput(
  selected: Readonly<Record<string, string>> | undefined,
): string {
  return selectedElementId(selected) ?? MISSING_SELECTED_ID;
}
