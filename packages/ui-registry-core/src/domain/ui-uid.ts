/**
 * The single DOM attribute that carries a registered UiRegistry identity.
 *
 * A `uid` is the canonical address of a registered element: it is what search,
 * inspection, diagnostics, and developer conversation refer to. `data-ui-id`
 * stays descriptive semantic metadata and is never the primary identity.
 *
 * A uid is chosen once, during development, and then never changes. It must
 * survive translation, styling, DOM nesting, route parameter changes, and
 * unrelated refactors, so it may never be produced at application runtime or
 * derived from DOM position, route values, labels, user data, database
 * identifiers, tokens, timestamps, or any other personal value.
 */
export const UI_UID_ATTRIBUTE = "data-ui-uid";

/** A registered UiRegistry address: `<semantic prefix>-<Base62 suffix>`. */
export type UiUid = string;

/** Semantic prefix: lowercase dot/dash-separated metadata. */
const UI_UID_PREFIX = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
/** Whole uid: semantic prefix, a dash, then the immutable random suffix. */
const UI_UID = /^([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)-([0-9A-Za-z]{6})$/;

/** Number of Base62 characters in the immutable random suffix. */
export const UI_UID_SUFFIX_LENGTH = 6;

/** True when the value is a valid semantic uid prefix. */
export function isUiUidPrefix(value: unknown): value is string {
  return typeof value === "string" && UI_UID_PREFIX.test(value);
}

/**
 * True when the value is a random-suffix form: exactly
 * {@link UI_UID_SUFFIX_LENGTH} Base62 characters carrying at least one
 * uppercase letter and at least one digit. That mix is what separates a
 * generated suffix from a deterministic copy of the element id.
 */
export function isUiUidSuffix(value: unknown): value is string {
  return (
    typeof value === "string" &&
    new RegExp(`^[0-9A-Za-z]{${UI_UID_SUFFIX_LENGTH}}$`).test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

/** Splits a uid into its semantic prefix and its immutable random suffix. */
export function parseUiUid(value: unknown): { prefix: string; suffix: string } | null {
  if (typeof value !== "string") return null;
  const match = UI_UID.exec(value);
  if (!match || !isUiUidSuffix(match[2])) return null;
  return { prefix: match[1]!, suffix: match[2]! };
}

/** True when the value is a syntactically valid UiRegistry uid. */
export function isUiUid(value: unknown): value is UiUid {
  return parseUiUid(value) !== null;
}

/** Rejects any uid that is not a stable prefix plus a generated suffix. */
export function assertUiUid(value: string, label = "UI uid"): UiUid {
  if (!isUiUid(value)) {
    throw new Error(
      `${label} must be a lowercase dot/dash-separated prefix followed by a generated ` +
        `${UI_UID_SUFFIX_LENGTH}-character Base62 suffix, for example "product-data-a8K3xP".`,
    );
  }
  return value;
}
