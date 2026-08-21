"use client";

import { asolDbSetPendingAuthLoginCompleted, asolDbTakePendingAuthLoginCompleted } from "@asol/data-core/browser";

export const AUTH_LOGIN_COMPLETED_EVENT = "asol:auth-login-completed";

export interface AuthLoginCompletedDetail {
  uid: string;
  phone: string;
}

/** Announce a fresh interactive login, distinct from session hydration. */
export function announceAuthLoginCompleted(
  detail: AuthLoginCompletedDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AuthLoginCompletedDetail>(AUTH_LOGIN_COMPLETED_EVENT, {
      detail,
    }),
  );
}

/**
 * Persist a login-completed signal across a hard navigation (`window.location.assign`).
 * Consumed once by `AuthLoginBootstrapController` after the next session hydrate.
 */
export async function markPendingAuthLoginCompleted(
  detail: AuthLoginCompletedDetail,
): Promise<void> {
  await asolDbSetPendingAuthLoginCompleted({
    uid: detail.uid.trim(),
    phone: detail.phone.trim(),
  });
}

/** Read and clear the pending login-completed marker, if any. */
export async function consumePendingAuthLoginCompleted(): Promise<AuthLoginCompletedDetail | null> {
  const pending =
    await asolDbTakePendingAuthLoginCompleted<AuthLoginCompletedDetail>();
  const uid = pending?.uid?.trim() ?? "";
  const phone = pending?.phone?.trim() ?? "";
  if (!uid || !phone) return null;
  return { uid, phone };
}
