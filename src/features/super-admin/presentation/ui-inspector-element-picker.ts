/** Every element the picker may return, including SVG and unregistered nodes. */
export type InspectedElement = HTMLElement | SVGElement;

/** `Node.ELEMENT_NODE`, spelled out so this module needs no DOM global. */
const ELEMENT_NODE = 1;

interface PickableNode {
  readonly nodeType?: unknown;
  readonly parentElement?: unknown;
}

/**
 * Browser-devtools-style picking: the inspector selects the **exact** node the
 * pointer landed on — button, link, input, div, span, image, SVG, section,
 * dialog, registered or not — instead of climbing to the nearest semantic
 * ancestor. A text node has no attributes of its own, so it resolves to its
 * parent element.
 */
export function pickInspectedElement(target: unknown): InspectedElement | null {
  const node = target as PickableNode | null;
  if (!node || typeof node.nodeType !== "number") return null;
  if (node.nodeType === ELEMENT_NODE) return node as unknown as InspectedElement;
  return (node.parentElement as InspectedElement | undefined) ?? null;
}

/**
 * Resolve the closest real DOM identity for a touched node.
 *
 * Third-party controls often paint an internal SVG/path below the repository
 * element that owns the stable id. Walking only through DOM parents keeps the
 * picked identity precise while still making those internal nodes inspectable.
 */
export function pickIdentifiedElement(target: unknown): InspectedElement | null {
  let current = pickInspectedElement(target);
  while (current) {
    if ((current.getAttribute("id") ?? "").length > 0) return current;
    current = current.parentElement as InspectedElement | null;
  }
  return null;
}
