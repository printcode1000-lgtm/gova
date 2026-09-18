/**
 * Ask the deployed notifications origin about every route a client calls.
 *
 * `smoke:deployed` probes one route per account and `probe-notifications-service`
 * only `/send`. Neither could see the notification outage this project had:
 * `recipient-tokens` and `mobile-push/unlock` answered `404` on the account that
 * owned them, so native push never started while health stayed 200.
 *
 * Manual and outward-facing by design — it is not part of `npm test`. Every
 * request is unauthenticated and side-effect free; nothing is sent to a person.
 *
 *   npm run smoke:notifications
 *   npm run smoke:notifications -- --origin https://asol-notifications.vercel.app --api-base https://gova-swart.vercel.app
 */

import { API_BASE_URL, NOTIFICATIONS_BASE_URL } from "@asol/native-core";

import { createCorsPreflightProbeHeaders } from "@asol/cors";

import {
  NOTIFICATIONS_SMOKE_PROBES,
  preflightProbe,
  judgeBoundaryRedirect,
  judgeHealth,
  judgePreflight,
  judgeProbe,
} from "./notifications-smoke-probes";

const TIMEOUT_MS = 20_000;

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const origin = (
  argument("--origin") ??
  process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL ??
  NOTIFICATIONS_BASE_URL
).replace(/\/$/, "");
const apiBase = (
  argument("--api-base") ??
  process.env.NEXT_PUBLIC_ASOL_API_BASE_URL ??
  API_BASE_URL
).replace(/\/$/, "");

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
}

const failures: string[] = [];
const warnings: string[] = [];
const record = (label: string, reason: string | null) => {
  console.log(`${reason ? "✖" : "✔"} ${label}${reason ? ` — ${reason}` : ""}`);
  if (reason) failures.push(`${label}: ${reason}`);
};

async function main(): Promise<void> {
  console.log(`notifications origin: ${origin}\ncompatibility boundary: ${apiBase}\n`);

  const health = await call(`${origin}/api/health`);
  const verdict = health.ok
    ? judgeHealth(await health.text())
    : { failures: [`health answered ${health.status}`], warnings: [] };
  record("GET /api/health", verdict.failures.join("; ") || null);
  warnings.push(...verdict.warnings);

  for (const probe of NOTIFICATIONS_SMOKE_PROBES) {
    const url = `${origin}${probe.path}`;
    const preflight = await call(url, {
      method: "OPTIONS",
      headers: createCorsPreflightProbeHeaders(preflightProbe(probe.method)),
    });
    record(
      `OPTIONS ${probe.path}`,
      judgePreflight(preflight.status, preflight.headers, probe.method),
    );

    const response = await call(url, {
      method: probe.method,
      headers: { Origin: preflightProbe(probe.method).origin, "Content-Type": "application/json" },
      ...(probe.body === undefined ? {} : { body: JSON.stringify(probe.body) }),
    });
    record(
      `${probe.method} ${probe.path}`,
      judgeProbe(probe, {
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        body: await response.text(),
      }),
    );
  }

  for (const probe of NOTIFICATIONS_SMOKE_PROBES.filter((p) => p.method !== "DELETE")) {
    const response = await call(`${apiBase}${probe.path}`, {
      method: probe.method,
      headers: { "Content-Type": "application/json" },
      ...(probe.body === undefined ? {} : { body: JSON.stringify(probe.body) }),
    });
    record(
      `boundary ${probe.method} ${probe.path}`,
      judgeBoundaryRedirect(response.status, response.headers.get("location"), origin),
    );
  }

  for (const warning of warnings) console.log(`! ${warning}`);
  if (failures.length > 0) {
    console.error(`\nsmoke:notifications failed — ${failures.length} problem(s).`);
    process.exit(1);
  }
  console.log("\nsmoke:notifications passed.");
}

void main().catch((error) => {
  console.error("smoke:notifications could not run:", error instanceof Error ? error.message : error);
  process.exit(1);
});
