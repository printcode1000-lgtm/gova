/** The DOM attribute that distinguishes one runtime copy of a source UID. */
export const UI_INSTANCE_ATTRIBUTE = "data-ui-instance";

declare const UI_INSTANCE_ID_BRAND: unique symbol;
export type UiInstanceId = string & { readonly [UI_INSTANCE_ID_BRAND]: true };

export interface CreateUiInstanceIdOptions {
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

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function opaqueUuidToken(value: string): string {
  return `uuid-${stableHash(value)}`;
}

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

/** Full default-policy guard; never a shape-only branding escape hatch. */
export function isUiInstanceId(value: unknown): value is UiInstanceId {
  return typeof value === "string" && uiInstanceIdRejectionReason(value) === null;
}

/**
 * Compose a parent runtime copy and a safe local copy. Different source UIDs
 * can share the same instance token; this helper is for nested repeated DOM
 * where the child source UID itself repeats within a repeated parent.
 */
export function composeUiInstanceId(
  parent: UiInstanceId | undefined,
  local: UiInstanceId,
): UiInstanceId {
  if (!parent) return local;
  const combined = `${parent}.${local}`;
  return createUiInstanceId(combined.length <= 64 ? combined : `scope-${stableHash(combined)}`);
}

/**
 * Explicit positional identity for domains where the slot number itself is
 * stable semantics (OTP digit 1..N, pagination slot, fixed visual lane). This
 * is intentionally different from using a reorderable collection index.
 */
export function createUiPositionInstanceId(scope: string, zeroBasedPosition: number): UiInstanceId {
  if (!Number.isInteger(zeroBasedPosition) || zeroBasedPosition < 0) {
    throw new Error("UI positional instance requires a non-negative integer position.");
  }
  const safeScope = createUiInstanceId(scope);
  return createUiInstanceId(`${safeScope}-${zeroBasedPosition + 1}`);
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
