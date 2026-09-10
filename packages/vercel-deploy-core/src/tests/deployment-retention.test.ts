import assert from "node:assert/strict";

import { cleanupVercelProjectDeployments } from "../deployment-retention";

type Call = { url: string; method: string };

function stubFetch(
  handler: (url: string, init?: RequestInit) => Response,
  calls: Call[] = [],
): { fetchImpl: typeof fetch; calls: Call[] } {
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET" });
    return handler(url, init);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const BASE = {
  token: "test-token",
  project: "gova",
  teamId: "team_1",
  protectedDeploymentIds: ["dpl_current", "dpl_rollback"],
} as const;
{
  const { fetchImpl, calls } = stubFetch((url, init) => {
    if ((init?.method ?? "GET") === "GET") {
      return Response.json({
        deployments: [
          { uid: "dpl_current", state: "READY" },
          { uid: "dpl_rollback", state: "READY" },
          { uid: "dpl_old_ready", state: "READY" },
          { uid: "dpl_old_error", state: "ERROR" },
          { uid: "dpl_building", state: "BUILDING" },
        ],
        pagination: {},
      });
    }
    return Response.json({ uid: url.split("/").pop(), state: "DELETED" });
  });

  const result = await cleanupVercelProjectDeployments(BASE, fetchImpl);
  assert.equal(result.scanned, 5);
  assert.equal(result.protected, 2);
  assert.equal(result.skippedActive, 1);
  assert.equal(result.eligible, 2);
  assert.equal(result.deleted, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.rateLimited, false);
  const deleteUrls = calls
    .filter((call) => call.method === "DELETE")
    .map((call) => call.url);
  assert.equal(deleteUrls.length, 2);
  assert.ok(deleteUrls.every((url) => url.includes("teamId=team_1")));
  assert.ok(deleteUrls.some((url) => url.includes("dpl_old_ready")));
  assert.ok(deleteUrls.some((url) => url.includes("dpl_old_error")));
  assert.equal(
    deleteUrls.some((url) => url.includes("dpl_current")),
    false,
  );
  assert.equal(
    deleteUrls.some((url) => url.includes("dpl_rollback")),
    false,
  );
}

{
  const reset = Date.now() + 60_000;
  const { fetchImpl } = stubFetch((_url, init) => {
    if ((init?.method ?? "GET") === "GET") {
      return Response.json({
        deployments: [{ uid: "dpl_old", state: "ERROR" }],
        pagination: {},
      });
    }
    return new Response(
      JSON.stringify({ error: { code: "rate_limited", limit: { reset } } }),
      { status: 429 },
    );
  });

  const result = await cleanupVercelProjectDeployments(BASE, fetchImpl);
  assert.equal(result.deleted, 0);
  assert.equal(result.rateLimited, true);
  assert.equal(result.rateLimitResetAt, new Date(reset).toISOString());
}

console.log(
  "@asol/vercel-deploy-core deployment retention: protected pair, active skip, and rate-limit stop verified.",
);
