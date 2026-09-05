import "server-only";

import { jsonContractResponse, readJsonContractBody } from "@asol/api-contract-core/server";

import { createCorsPolicy, reflectRequestOrigin, resolveCorsHeaders } from "@asol/cors";

import { isDevRuntime } from "@/core/config/runtime-context.server";
import {
  deliverNotificationGrants,
  readGrantsFromRequestBody,
  MAX_GRANTS_PER_REQUEST,
} from "@asol/notifications-core/server";

/**
 * Local-development fan-out for Web Push.
 *
 * Production web still posts grants to the notifications service. In
 * `next dev` the main app reads device tokens from SQLite, so pointing the
 * bridge at the remote service would never find registrations made on
 * localhost. This handler is the same send path the service runs, but only
 * while the development runtime is in force.
 *
 * The gate is `isDevRuntime()` rather than a bare environment read — the
 * Configuration layer owns those, and this is the same predicate that makes
 * the notifications database resolve to local SQLite. Tying both to one value
 * is what keeps the route fanning out against the store the runtime actually
 * chose: a development `NODE_ENV` alone is also true of a Vercel build, where
 * tokens come from Turso and this route must stay a 404.
 */

export function isDevNotificationSendEnabled(): boolean {
  return isDevRuntime();
}

/**
 * The same envelope the notifications deployment answers with, so a client that
 * works against localhost works against the service and back again. Credentials
 * are never accepted — the authority is the signed grant in the body.
 */
const DEV_SEND_CORS = createCorsPolicy({
  origins: reflectRequestOrigin(),
  methods: ["POST", "OPTIONS"],
  headers: ["Content-Type"],
});

function corsHeaders(request: Request): Record<string, string> {
  return resolveCorsHeaders(DEV_SEND_CORS, request);
}

export async function handleDevNotificationSendPost(
  request: Request,
): Promise<Response> {
  const headers = { ...corsHeaders(request), "Content-Type": "application/json" };

  if (!isDevNotificationSendEnabled()) {
    return jsonContractResponse({ error: "notFound" }, { status: 404, headers });
  }

  let grants: string[];
  try {
    grants = readGrantsFromRequestBody(await readJsonContractBody<unknown>(request)).slice(
      0,
      MAX_GRANTS_PER_REQUEST,
    );
  } catch {
    return jsonContractResponse({ error: "invalidJsonBody" }, { status: 400, headers });
  }

  if (grants.length === 0) {
    return jsonContractResponse(
      { error: "notificationGrantRequired" },
      { status: 400, headers },
    );
  }

  return jsonContractResponse(await deliverNotificationGrants(grants), {
    status: 200,
    headers,
  });
}

export function handleDevNotificationSendOptions(
  request: Request,
): Response {
  if (!isDevNotificationSendEnabled()) {
    return new Response(null, { status: 404, headers: corsHeaders(request) });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
