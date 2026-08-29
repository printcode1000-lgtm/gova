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

/**
 * A runtime instance identifier, scoped to one source `ui.uid`.
 *
 * Branded, not a plain `string`: a token shape alone (see the old regex this
 * type replaces) cannot prove a value is PII-free — `"5551234567"` is a
 * syntactically fine token *and* a phone number. The brand means the only
 * way to produce a `UiInstanceId` is {@link createUiInstanceId}, which runs
 * the actual content checks below; a caller can never smuggle a raw string
 * into `UiDescriptor.instance` by casting past the type checker in normal
 * code, and every reviewer sees the same one call site shape.
 */
export type UiInstanceId = string & { readonly __uiInstanceId: unique symbol };

export interface CreateUiInstanceIdOptions {
  /**
   * Explicit, reviewed acknowledgement that this value is a UUID or database
   * id the product already treats as public UI-safe (shown in a URL, an
   * order-confirmation screen, etc). Without it, a bare UUID/ULID shape is
   * rejected — most database ids are not meant to be public tokens, and the
   * caller must make that call visibly rather than by accident.
   */
  readonly allowUuid?: boolean;
}

const TOKEN_SHAPE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$/;
const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
/** E.164-ish: optional leading "+", 7–15 digits, nothing else — a phone number shape. */
const PHONE_LIKE = /^\+?[0-9]{7,15}$/;
const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;
/** Common secret/token prefixes and the three-segment JWT shape. */
const SECRET_LIKE = /^(?:sk_|pk_|ghp_|gho_|Bearer\s|eyJ)/;
const JWT_LIKE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export type UiInstanceIdRejectionReason =
  | "empty"
  | "too-long"
  | "invalid-shape"
  | "email"
  | "phone-number"
  | "url"
  | "secret-or-token"
  | "uuid";

/** Structural check only — proves a shape, not safety. Prefer {@link createUiInstanceId}. */
export function isUiInstanceId(value: unknown): value is UiInstanceId {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

/** Returns why `value` would be rejected, or `null` if it is safe. */
export function uiInstanceIdRejectionReason(
  value: string,
  options: CreateUiInstanceIdOptions = {},
): UiInstanceIdRejectionReason | null {
  if (value.length === 0) return "empty";
  if (value.length > 64) return "too-long";
  if (value.includes("@")) return "email";
  if (URL_LIKE.test(value)) return "url";
  if (SECRET_LIKE.test(value) || JWT_LIKE.test(value)) return "secret-or-token";
  if (!options.allowUuid && UUID_SHAPE.test(value)) return "uuid";
  if (PHONE_LIKE.test(value)) return "phone-number";
  if (!TOKEN_SHAPE.test(value)) return "invalid-shape";
  return null;
}

/**
 * The single creation API for a runtime instance identifier.
 *
 * Callers pass a stable, already-public domain value (an order-list row id,
 * a SKU, a return-policy key) or a value they have already derived into a
 * safe opaque form. This rejects the shapes that are never safe to carry
 * through an instance id outright — an email, a phone number, a resolved
 * URL, a token/secret shape, or (unless explicitly acknowledged) a bare
 * UUID — rather than merely checking that the value is short and
 * alphanumeric, which a real phone number also is.
 */
export function createUiInstanceId(value: string, options: CreateUiInstanceIdOptions = {}): UiInstanceId {
  const reason = uiInstanceIdRejectionReason(value, options);
  if (reason !== null) {
    throw new Error(uiInstanceIdRejectionMessage(reason));
  }
  return value as UiInstanceId;
}

function uiInstanceIdRejectionMessage(reason: UiInstanceIdRejectionReason): string {
  switch (reason) {
    case "empty":
      return "UI instance id must not be empty.";
    case "too-long":
      return "UI instance id must be at most 64 characters — a whole free-text value does not belong here.";
    case "invalid-shape":
      return 'UI instance id must be a short token: letters, digits, ".", "-", "_" only.';
    case "email":
      return "UI instance id must not be an email address.";
    case "phone-number":
      return "UI instance id must not be a phone number.";
    case "url":
      return "UI instance id must not be a resolved URL.";
    case "secret-or-token":
      return "UI instance id must not be a token or secret.";
    case "uuid":
      return (
        "UI instance id looks like a raw UUID/database id. If this value is genuinely " +
        "public UI-safe, pass { allowUuid: true } to createUiInstanceId to acknowledge that " +
        "explicitly; otherwise derive a safe representation instead of the raw id."
      );
  }
}

/** @deprecated Use {@link createUiInstanceId}, which actually validates content, not just shape. */
export function assertUiInstanceId(value: string, label = "UI instance id"): UiInstanceId {
  try {
    return createUiInstanceId(value);
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
