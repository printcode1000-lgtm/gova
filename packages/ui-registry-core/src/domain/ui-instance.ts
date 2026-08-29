/** The DOM attribute that distinguishes one runtime copy of a source UID. */
export const UI_INSTANCE_ATTRIBUTE = "data-ui-instance";

declare const UI_INSTANCE_ID_BRAND: unique symbol;
export type UiInstanceId = string & { readonly [UI_INSTANCE_ID_BRAND]: true };

export interface CreateUiInstanceIdOptions {
  /**
   * A reviewed UUID/database identifier may be used as source material, but
   * the raw value is never emitted. It is deterministically reduced to an
   * opaque UI token before branding.
   */
  readonly allowUuid?: boolean;
}

const TOKEN_SHAPE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$/;
const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const PHONE_LIKE = /^\+?[0-9]{7,15}$/;
const URL_LIKE = /^[a-z][a-z0-9+.-]*:\/\//i;
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

export function uiInstanceIdRejectionReason(
  value: string,
  options: CreateUiInstanceIdOptions = {},
): UiInstanceIdRejectionReason | null {
  if (value.length === 0) return "empty";
  if (value.length > 64) return "too-long";
  if (value.includes("@")) return "email";
  if (URL_LIKE.test(value)) return "url";
  if (SECRET_LIKE.test(value) || JWT_LIKE.test(value)) return "secret-or-token";
  if (UUID_SHAPE.test(value)) return options.allowUuid ? null : "uuid";
  if (PHONE_LIKE.test(value)) return "phone-number";
  if (!TOKEN_SHAPE.test(value)) return "invalid-shape";
  return null;
}

/** Small deterministic FNV-1a reducer; this is identity obfuscation, not security. */
function opaqueUuidToken(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `uuid-${hash.toString(36)}`;
}

/**
 * The only public constructor for a branded runtime instance id.
 * Unsafe content is rejected. An explicitly reviewed UUID is converted to an
 * opaque stable token so the raw database identifier never reaches the DOM.
 */
export function createUiInstanceId(
  value: string,
  options: CreateUiInstanceIdOptions = {},
): UiInstanceId {
  const reason = uiInstanceIdRejectionReason(value, options);
  if (reason !== null) throw new Error(uiInstanceIdRejectionMessage(reason));
  const safeValue = UUID_SHAPE.test(value) && options.allowUuid ? opaqueUuidToken(value) : value;
  const safeReason = uiInstanceIdRejectionReason(safeValue);
  if (safeReason !== null) throw new Error(uiInstanceIdRejectionMessage(safeReason));
  return safeValue as UiInstanceId;
}

/**
 * Full default-policy guard. This never brands a value that the public
 * constructor would reject; it is intentionally not a mere token-shape test.
 */
export function isUiInstanceId(value: unknown): value is UiInstanceId {
  return typeof value === "string" && uiInstanceIdRejectionReason(value) === null;
}

function uiInstanceIdRejectionMessage(reason: UiInstanceIdRejectionReason): string {
  switch (reason) {
    case "empty": return "UI instance id must not be empty.";
    case "too-long": return "UI instance id must be at most 64 characters.";
    case "invalid-shape": return 'UI instance id must be a short token: letters, digits, ".", "-", "_" only.';
    case "email": return "UI instance id must not be an email address.";
    case "phone-number": return "UI instance id must not be a phone number.";
    case "url": return "UI instance id must not be a resolved URL.";
    case "secret-or-token": return "UI instance id must not be a token or secret.";
    case "uuid": return "UI instance id must not expose a raw UUID/database id; pass { allowUuid: true } to derive a safe opaque token.";
  }
}

/** @deprecated Use createUiInstanceId. */
export function assertUiInstanceId(value: string, label = "UI instance id"): UiInstanceId {
  try {
    return createUiInstanceId(value);
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
