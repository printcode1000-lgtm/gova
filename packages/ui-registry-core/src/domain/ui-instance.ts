/**
 * The DOM attribute that distinguishes one runtime-rendered instance of a
 * source usage site from another.
 *
 * A `ui.uid` addresses *where in source* an element is registered. When one
 * usage site renders more than once at runtime — a `.map()` row, a repeated
 * card — every instance intentionally shares that same source uid. A
 * `data-ui-instance` value answers the other question, "which rendered copy
 * is this one", without ever becoming a second identity: it is optional,
 * carried alongside `data-ui-uid`, and never changes what the uid means.
 */
export const UI_INSTANCE_ATTRIBUTE = "data-ui-instance";

/** A runtime instance identifier, scoped to one source `ui.uid`. */
export type UiInstanceId = string;

/**
 * Safe instance-id token: alphanumeric plus `.`, `-`, `_`, capped so a whole
 * sensitive value (an email, a phone number, a free-text label) cannot be
 * carried through it. It is deliberately looser than {@link isUiToken} — an
 * instance id is often a stable domain identifier (an order number, a SKU),
 * not authored UI metadata — but it still stays a short, PII-free token.
 */
const UI_INSTANCE_ID = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$/;

/** True when the value is a safe, non-empty runtime instance token. */
export function isUiInstanceId(value: unknown): value is UiInstanceId {
  return typeof value === "string" && UI_INSTANCE_ID.test(value);
}

/** Rejects any value that is not a safe runtime instance token. */
export function assertUiInstanceId(value: string, label = "UI instance id"): UiInstanceId {
  if (!isUiInstanceId(value)) {
    throw new Error(
      `${label} must be a short alphanumeric token (letters, digits, ".", "-", "_", ` +
        `max 64 characters) — never an email, phone number, token, or free-text label.`,
    );
  }
  return value;
}
