/**
 * The smoke's verdicts are judged here, so the manual probe cannot pass a
 * broken deployment because its own reading of a response was wrong.
 */

import assert from "node:assert/strict";

import { CORS_HEADER_NAMES } from "@asol/cors";

import {
  NOTIFICATIONS_SMOKE_PROBES,
  judgeBoundaryRedirect,
  judgeHealth,
  judgePreflight,
  judgeProbe,
} from "../notifications-smoke-probes";
import { shippedRoutes } from "../route-ownership-coverage";

const probe = NOTIFICATIONS_SMOKE_PROBES.find((p) => p.path.endsWith("/recipient-tokens"))!;
const json = (status: number, body: unknown) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

// The outage shape: a missing route file answers an HTML 404.
assert.match(
  judgeProbe(probe, { status: 404, contentType: "text/html", body: "<html>" }) ?? "",
  /route file is missing/,
);
// A server fault, however it is dressed.
assert.match(judgeProbe(probe, json(500, { error: "internalServerError" })) ?? "", /server fault/);
assert.match(judgeProbe(probe, json(400, { error: "internalServerError" })) ?? "", /internalServerError/);
// A refusal with no code tells the caller nothing.
assert.match(judgeProbe(probe, json(400, {})) ?? "", /no error code/);
// The expected refusal passes.
assert.equal(judgeProbe(probe, json(400, { error: "sessionTokenInvalid" })), null);
assert.equal(judgeProbe(probe, json(403, { error: "forbidden" })), null);
// Success without a session would mean the route stopped authorising.
assert.match(judgeProbe(probe, json(200, { grants: [] })) ?? "", /stopped refusing/);
// A refusal with the wrong status is still a failure.
assert.match(judgeProbe(probe, json(409, { error: "conflict" })) ?? "", /expected one of/);

// Preflights: the header, never the status alone.
const preflight = (allowHeaders: string) =>
  new Headers({
    [CORS_HEADER_NAMES.allowOrigin]: "https://localhost",
    [CORS_HEADER_NAMES.allowMethods]: "GET, POST, DELETE, OPTIONS",
    [CORS_HEADER_NAMES.allowHeaders]: allowHeaders,
  });
assert.match(judgePreflight(204, new Headers(), "POST") ?? "", /Allow-Origin/);
assert.match(judgePreflight(204, preflight("content-type"), "POST") ?? "", /x-asol-session-token/);
assert.match(judgePreflight(500, preflight("content-type, x-asol-session-token"), "POST") ?? "", /answered 500/);
assert.equal(judgePreflight(204, preflight("Content-Type, X-Asol-Session-Token"), "POST"), null);

// The boundary must send notification calls to the notifications origin.
const target = "https://asol-notifications.vercel.app";
assert.equal(judgeBoundaryRedirect(307, `${target}/api/notifications/devices`, target), null);
assert.match(judgeBoundaryRedirect(307, "https://asol-submain.vercel.app/x", target) ?? "", /not https/);
assert.match(judgeBoundaryRedirect(404, null, target) ?? "", /not a redirect/);

// Health: a missing required credential fails; an optional one only warns.
const verdict = judgeHealth(JSON.stringify({ configured: {
  notificationsDatabase: true, grantSecret: true, webPush: true,
  usersDatabase: false, sessionSecret: true, firebase: false, apns: false, mobilePushUnlock: true,
} }));
assert.deepEqual(verdict.failures, ["required credential missing: usersDatabase"]);
assert.deepEqual(verdict.warnings, ["optional channel not configured: firebase", "optional channel not configured: apns"]);

// The probe table covers every route the notifications service ships.
const shipped = shippedRoutes("services/notifications");
for (const [route, methods] of shipped) {
  if (!route.startsWith("/api/notifications/")) continue;
  for (const method of methods) {
    if (method === "OPTIONS") continue;
    assert.ok(
      NOTIFICATIONS_SMOKE_PROBES.some((p) => p.method === method && p.path.split("?")[0] === route),
      `smoke:notifications does not probe ${method} ${route}`,
    );
  }
}

console.log("Notifications smoke probe verdict tests passed.");
