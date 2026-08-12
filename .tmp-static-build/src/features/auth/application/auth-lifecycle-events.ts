"use client";

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
