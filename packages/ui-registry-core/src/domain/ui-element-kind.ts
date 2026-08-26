/** Semantic role of an addressed UI element, rendered as `data-ui`. */
export const ELEMENT_KINDS = ["action", "component", "field", "item", "region"] as const;

export type UiElementKind = (typeof ELEMENT_KINDS)[number];
