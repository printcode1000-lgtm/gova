/**
 * The notification surface's deployed-origin probes, and how to judge them.
 *
 * Pure data and pure verdicts, so the judging is unit-tested and the runner
 * (`check-notifications-smoke.ts`) only does I/O. Every probe is
 * unauthenticated and side-effect free: a session-bound route must refuse it
 * with a JSON business error. What must never come back is a `404` from a
 * missing route file, a `5xx`, or a preflight without the session header —
 * the three shapes the notification outages took.
 */

import { inspectCorsPreflightResponse, type CorsPreflightProbeInput } from "@asol/cors";

/** A browser at this origin sends the signed session header on every call. */
export function preflightProbe(method: string): CorsPreflightProbeInput {
  return {
    origin: "https://localhost",
    method,
    requestedHeaders: ["content-type", "x-asol-session-token"],
  };
}

export interface NotificationsSmokeProbe {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
  /** Status codes that prove the route exists and refused correctly. */
  accept: readonly number[];
}

/** Every route a client calls, probed without a session. */
export const NOTIFICATIONS_SMOKE_PROBES: readonly NotificationsSmokeProbe[] = [
  { method: "POST", path: "/api/notifications/send", body: {}, accept: [400] },
  { method: "POST", path: "/api/notifications/device-token", body: {}, accept: [400, 401, 403] },
  { method: "DELETE", path: "/api/notifications/device-token", accept: [400, 401, 403] },
  { method: "GET", path: "/api/notifications/devices", accept: [400, 401, 403] },
  { method: "DELETE", path: "/api/notifications/devices?deviceId=smoke", accept: [400, 401, 403] },
  { method: "GET", path: "/api/notifications/preferences", accept: [400, 401, 403] },
  { method: "POST", path: "/api/notifications/preferences", body: {}, accept: [400, 401, 403] },
  { method: "POST", path: "/api/notifications/test/self", body: {}, accept: [400, 401, 403] },
  { method: "POST", path: "/api/notifications/test/send", body: {}, accept: [400, 401, 403] },
  { method: "GET", path: "/api/notifications/broadcast/recipients", accept: [400, 401, 403] },
  { method: "POST", path: "/api/notifications/broadcast/send", body: {}, accept: [400, 401, 403] },
  { method: "POST", path: "/api/notifications/recipient-tokens", body: { grants: [] }, accept: [400, 401, 403] },
  { method: "POST", path: "/api/notifications/mobile-push/unlock", body: { credentialBlob: "" }, accept: [400, 401, 403] },
];

/** Health keys whose absence breaks a route for everyone. */
export const REQUIRED_HEALTH_CREDENTIALS = [
  "notificationsDatabase",
  "grantSecret",
  "webPush",
  "usersDatabase",
  "sessionSecret",
] as const;

/** Health keys whose absence degrades one channel; reported, not fatal. */
export const OPTIONAL_HEALTH_CREDENTIALS = ["firebase", "apns", "mobilePushUnlock"] as const;

export interface ObservedResponse {
  status: number;
  contentType: string;
  body: string;
}

/** `null` when the probe passed, otherwise the reason it did not. */
export function judgeProbe(probe: NotificationsSmokeProbe, observed: ObservedResponse): string | null {
  if (observed.status >= 500) return `answered ${observed.status} — a server fault`;
  if (observed.status < 400) {
    return `answered ${observed.status} to an unauthenticated probe — the route stopped refusing`;
  }
  if (!observed.contentType.includes("application/json")) {
    return observed.status === 404
      ? "answered 404 without a JSON error — the route file is missing on this origin"
      : `answered ${observed.status} with ${observed.contentType || "no content type"}, not JSON`;
  }
  let error: unknown;
  try {
    error = (JSON.parse(observed.body) as { error?: unknown }).error;
  } catch {
    return "answered a body that is not valid JSON";
  }
  if (typeof error !== "string" || !error) return `answered ${observed.status} with no error code`;
  if (error === "internalServerError") return "answered internalServerError";
  if (!probe.accept.includes(observed.status)) {
    return `answered ${observed.status} ${error}; expected one of ${probe.accept.join(", ")}`;
  }
  return null;
}

/**
 * A preflight passes only when the browser would send the real request: the
 * origin, the method, and the session header all allowed — never the status alone.
 */
export function judgePreflight(status: number, headers: Headers, method: string): string | null {
  if (status < 200 || status >= 300) return `preflight answered ${status}`;
  const problems = inspectCorsPreflightResponse(headers, preflightProbe(method));
  return problems.length === 0
    ? null
    : `preflight refuses ${problems.join(", ")} — the browser reports a network outage`;
}

/** The compatibility boundary must redirect to the notifications origin. */
export function judgeBoundaryRedirect(
  status: number,
  location: string | null,
  notificationsOrigin: string,
): string | null {
  if (status !== 307 && status !== 308) return `boundary answered ${status}, not a redirect`;
  if (!location?.startsWith(notificationsOrigin)) {
    return `boundary redirects to ${location ?? "nowhere"}, not ${notificationsOrigin}`;
  }
  return null;
}

export interface HealthVerdict {
  failures: string[];
  warnings: string[];
}

export function judgeHealth(body: string): HealthVerdict {
  let configured: Record<string, boolean> | undefined;
  try {
    configured = (JSON.parse(body) as { configured?: Record<string, boolean> }).configured;
  } catch {
    return { failures: ["health did not answer JSON"], warnings: [] };
  }
  if (!configured) return { failures: ["health reported no credentials"], warnings: [] };
  return {
    failures: REQUIRED_HEALTH_CREDENTIALS.filter((key) => configured![key] !== true).map(
      (key) => `required credential missing: ${key}`,
    ),
    warnings: OPTIONAL_HEALTH_CREDENTIALS.filter((key) => configured![key] !== true).map(
      (key) => `optional channel not configured: ${key}`,
    ),
  };
}
