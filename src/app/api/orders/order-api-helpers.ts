import "server-only";

import { apiError } from "@/core/api/api-response";
import { isSuperAdminIdentity } from "@/features/auth/utils/super-admin";
import type { Actor, MinorUnits } from "@/modules/marketplace-orders/domain/types";
import type { ActorRole } from "@/modules/marketplace-orders/domain/enums";

export interface ClientActorInput {
  uid?: string;
  phone?: string;
  role?: ActorRole;
}

export function actorFromInput(input: ClientActorInput, fallbackRole: ActorRole): Actor {
  const uid = input.uid?.trim();
  if (!uid) throw new Error("userNotFound");
  if (isSuperAdminIdentity(uid, input.phone ?? "")) {
    return { id: uid, role: "admin", source: "asol-web" };
  }
  const role =
    input.role === "admin" || input.role === "system"
      ? fallbackRole
      : input.role ?? fallbackRole;
  return {
    id: uid,
    role,
    source: "asol-web",
  };
}

export function moneyMinor(value: unknown): MinorUnits {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("invalidMoney");
  }
  return amount;
}

export function mapOrderError(error: unknown) {
  const message = error instanceof Error ? error.message : "Internal Server Error";
  if (message === "userNotFound") return apiError(message, 401);
  if (message === "Forbidden" || message.includes("only")) return apiError(message, 403);
  if (message.includes("not found") || message.includes("notFound")) return apiError(message, 404);
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
