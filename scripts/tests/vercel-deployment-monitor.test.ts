import assert from "node:assert/strict";

import {
  vercelDeploymentMetadata,
  waitForVercelProductionDeployment,
} from "../lib/vercel-deployment-monitor";

async function main() {
const metadata = vercelDeploymentMetadata({
  target: "products",
  comment: "deploy(products): test",
  runId: "run-products",
  revision: "abc123",
});
assert.equal(metadata.includes("asolDeploymentComment=deploy(products): test"), true);
assert.equal(metadata.includes("asolDeploymentTarget=products"), true);
assert.equal(metadata.includes("asolDeploymentRunId=run-products"), true);

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = String(input);
  if (url.includes("/v6/deployments")) {
    return Response.json({
      deployments: [
        {
          uid: "deployment-1",
          state: "READY",
          url: "products.example.vercel.app",
          meta: { asolDeploymentRunId: "run-products" },
        },
      ],
    });
  }
  return Response.json({
    uid: "deployment-1",
    readyState: "READY",
    url: "products.example.vercel.app",
    aliasError: null,
  });
}) as typeof fetch;

try {
  const report = await waitForVercelProductionDeployment({
    token: "test-token",
    project: "asol-products",
    target: "products",
    account: "account-products",
    comment: "deploy(products): test",
    runId: "run-products",
    timeoutMs: 1_000,
  });
  assert.equal(report.state, "READY");
  assert.equal(report.url, "https://products.example.vercel.app");
  assert.match(report.message, /production is ready/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Vercel deployment metadata and terminal verification tests passed.");
}

void main();
