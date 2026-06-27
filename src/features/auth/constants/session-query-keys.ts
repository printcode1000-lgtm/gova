/** Shared session query key — safe to import from providers and hooks. */
export const CURRENT_SESSION_QUERY_KEY = ['current_session'] as const;

/** @deprecated Use CURRENT_SESSION_QUERY_KEY */
export const AUTH_STATUS_QUERY_KEY = CURRENT_SESSION_QUERY_KEY;
