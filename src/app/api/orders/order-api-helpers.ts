import "server-only";

import { apiError } from "@/core/api/api-response";
import type { MinorUnits } from "@/modules/marketplace-orders/domain/types";

/**
 * `actorFromInput` used to live here. It moved to
 * `@/modules/marketplace-orders/domain/actor-from-input` because the orders
 * service needs it too, and mirroring app-router files into a deployment that
 * has no such routes made no sense.
 */

export function moneyMinor(value: unknown): MinorUnits {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("invalidMoney");
  }
  return amount;
}

export function mapOrderError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Internal Server Error";
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
  return apiError(message, 500);
}
