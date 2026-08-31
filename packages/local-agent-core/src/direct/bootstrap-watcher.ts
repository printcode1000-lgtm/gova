import type { HostIdentityKeyInfo } from "./crypto";
import { createSignedBootstrapGrant, storeBootstrapGrant, type DirectBootstrapGrant } from "./bootstrap";
import {
  validateAndGrantBootstrapSession,
  type DirectAuthValidationContext,
} from "./authorization";

export interface BootstrapProcessResult {
  valid: boolean;
  errors: string[];
  grant?: DirectBootstrapGrant;
}

export function processBootstrapDocument(
  document: unknown,
  context: DirectAuthValidationContext & { hostIdentity: HostIdentityKeyInfo },
): BootstrapProcessResult {
  const validation = validateAndGrantBootstrapSession(document, context);
  if (!validation.valid || !validation.session) {
    return { valid: false, errors: validation.errors };
  }
  const grant = createSignedBootstrapGrant(validation.session, context.hostId, context.hostIdentity);
  storeBootstrapGrant(grant);
  return { valid: true, errors: [], grant };
}
