import "server-only";

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
 * while `NODE_ENV === "development"`.
 */

export function isDevNotificationSendEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function handleDevNotificationSendPost(
  request: Request,
): Promise<Response> {
  const headers = { ...corsHeaders(request), "Content-Type": "application/json" };

  if (!isDevNotificationSendEnabled()) {
    return Response.json({ error: "notFound" }, { status: 404, headers });
  }

  let grants: string[];
  try {
    grants = readGrantsFromRequestBody(await request.json()).slice(
      0,
      MAX_GRANTS_PER_REQUEST,
    );
  } catch {
    return Response.json({ error: "invalidJsonBody" }, { status: 400, headers });
  }

  if (grants.length === 0) {
    return Response.json(
      { error: "notificationGrantRequired" },
      { status: 400, headers },
    );
  }

  return Response.json(await deliverNotificationGrants(grants), {
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
