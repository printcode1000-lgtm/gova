import { ordersIdentity } from "../ports";
import type { Actor } from "./types";
import type { ActorRole } from "./enums";

/**
 * Builds the acting identity from request parameters.
 *
 * It lives in the orders domain rather than beside the API routes because two
 * deployments need it: the main app for every order route, and the orders
 * service for the list. Keeping it in `src/app/api` would have meant mirroring
 * app-router files into a service that has no such routes.
 *
 * A client-supplied `admin` or `system` role is downgraded to the caller's
 * fallback. Real admin status comes only from `isSuperAdminIdentity`, which
 * checks the uid and phone together — a role string in a query parameter is not
 * evidence of anything.
 */
export interface ClientActorInput {
  uid?: string;
  phone?: string;
  role?: ActorRole;
}

export function actorFromInput(
  input: ClientActorInput,
  fallbackRole: ActorRole,
): Actor {
  const uid = input.uid?.trim();
  if (!uid) throw new Error("userNotFound");
  if (ordersIdentity().isSuperAdminIdentity(uid, input.phone ?? "")) {
    return { id: uid, role: "admin", source: "asol-web" };
  }
  const role =
    input.role === "admin" || input.role === "system"
      ? fallbackRole
      : (input.role ?? fallbackRole);
  return {
    id: uid,
    role,
    source: "asol-web",
  };
}
