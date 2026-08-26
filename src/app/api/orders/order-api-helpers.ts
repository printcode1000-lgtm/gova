import "server-only";

import { apiError } from "@/core/api/api-response";
import { registerOrdersCorePorts } from "@/features/orders";

/**
 * `actorFromInput` used to live here. It moved to
 * `@asol/orders-core` because the orders
 * service needs it too, and mirroring app-router files into a deployment that
 * has no such routes made no sense.
 */

/**
 * Registering here as well as in `instrumentation.ts` is deliberate, not a duplicate.
 *
 * The identity port fails closed, so a code path that reaches an order route without having run
 * the startup hook would treat the real super admin as an ordinary buyer — a silent, correct-looking
 * result rather than an error. Every order route in the main app imports this module, so this is the
 * one place that cannot be bypassed. `configureOrdersCore` merges, so registering twice is free.
 */
registerOrdersCorePorts();

export function mapOrderError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal Server Error";
  // `readJsonBody` raises this for a malformed or truncated payload — a client
  // that disconnected mid-request, for example. It is the client's problem, not
  // a server fault, so it must not reach the 500 branch and be persisted.
  if (message === "invalidJsonBody") return apiError(message, 400);
  if (message === "userNotFound") return apiError(message, 401);
  if (message === "Forbidden" || message.includes("only"))
    return apiError(message, 403);
  if (message.includes("not found") || message.includes("notFound"))
    return apiError(message, 404);
  if (
    message.includes("already") ||
    message.includes("awaiting") ||
    message.includes("expired") ||
    message.includes("cannot be replaced") ||
    message.includes("cannot switch") ||
    message.includes("not accepting") ||
    message.includes("Use the unified")
  ) {
    return apiError(message, 409);
  }
  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("must") ||
    message.includes("does not") ||
    message.includes("Delivery carrier required")
  ) {
    return apiError(message, 400);
  }
  // Passing the original error keeps the real stack: `apiError` would otherwise
  // log a fresh Error created at the logging site, which points nowhere useful.
  return apiError(message, 500, { cause: error });
}
