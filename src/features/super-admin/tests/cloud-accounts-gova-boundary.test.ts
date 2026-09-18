import assert from "node:assert/strict";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";

import { ACCOUNT_DECLARATIONS, type AccountDeclaration } from "@asol/account-declarations";
import { ROUTE_OWNERSHIP } from "@asol/account-bridge/routes";
import { govaDeploymentManifest } from "@asol/gova-deployment-core";

import { withTemporaryEnvironment } from "@/core/config/test-env";

import { CLOUD_ACCOUNTS_COPY } from "../presentation/cloud-accounts-copy";
import { CloudAccountRoutesSection } from "../presentation/CloudAccountRoutesSection";
import { readGovaBoundaryFacts } from "../server/services/cloud-accounts-gova-boundary-facts";

/**
 * What `/dev/cloud-accounts` says the frontend deployment answers must be what
 * it does. The facts are read from the build manifest and `src/proxy.ts`; this
 * suite then runs the real proxy and checks each stated status and error.
 */

const OWNER_ORIGINS = {
  NEXT_PUBLIC_ASOL_CONTROL_URL: "https://control.example",
  NEXT_PUBLIC_ASOL_PRODUCTS_URL: "https://products.example",
  NEXT_PUBLIC_ASOL_SUB2MAIN_URL: "https://sub2main.example",
  NEXT_PUBLIC_ASOL_SUBMAIN_URL: "https://submain.example",
  NEXT_PUBLIC_ASOL_ORDERS_URL: "https://orders.example",
  NEXT_PUBLIC_ASOL_PROFILES_URL: "https://profiles.example",
  NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL: "https://notifications.example",
} as const;

const frontend = (Object.values(ACCOUNT_DECLARATIONS) as AccountDeclaration[]).find(
  (declaration) => declaration.deployFromRepositoryRoot === true,
)!;
const boundary = readGovaBoundaryFacts(frontend.project);

// Kept routes are exactly the build manifest's.
assert.deepEqual(
  boundary.keptRoutes.map((route) => `src/app${route.pattern}/route.ts`),
  govaDeploymentManifest(process.cwd()).keptRouteModules,
  "kept routes must be the ones the gova build keeps",
);
for (const route of boundary.keptRoutes) assert.ok(route.methods.length > 0, `${route.pattern} must export a method`);

async function main() {
  const { proxy, config } = await import("@/proxy");
  assert.equal(boundary.boundaryMatcher, config.matcher, "the stated matcher must be the proxy's");

  const run = (method: string, pathname: string) =>
    proxy(new NextRequest(`https://gova.example${pathname}`, { method }));

  // Every owned pattern is redirected with the stated status.
  for (const entry of ROUTE_OWNERSHIP) {
    const pathname = entry.pattern.replace(/\/\*\*$/, "/probe").replace(/\[[^\]]+\]/g, "probe-id");
    const method = entry.methods[0]!;
    const response = run(method, pathname);
    assert.equal(response.status, boundary.redirectStatus, `${method} ${pathname} must be redirected`);
  }

  // An unowned business route gets the stated status and error.
  const unowned = run("GET", "/api/cloud-accounts-probe-unowned-route");
  assert.equal(unowned.status, boundary.unownedStatus);
  assert.equal(((await unowned.json()) as { error?: string }).error, boundary.unownedError);

  // A kept route passes through to the deployment itself.
  for (const route of boundary.keptRoutes) {
    const response = run(route.methods.find((method) => method !== "OPTIONS") ?? "GET", route.pattern);
    assert.equal(response.headers.get("x-middleware-next"), "1", `${route.pattern} must be answered by gova`);
  }

  // The routes section shows gova as its own collapsible group.
  const html = renderToStaticMarkup(
    React.createElement(CloudAccountRoutesSection, { groups: [], boundary }),
  );
  assert.ok(html.includes(boundary.project), "the routes section must list the frontend deployment");
  assert.ok(html.includes("aria-expanded"), "the frontend group must be collapsible");
  assert.ok(
    html.includes(CLOUD_ACCOUNTS_COPY.vercel.routeCount(boundary.keptRoutes.length + 1)),
    "the frontend group must count its kept routes plus the boundary",
  );
  for (const text of [CLOUD_ACCOUNTS_COPY.vercel.boundaryDescription(boundary)]) {
    for (const fact of [String(boundary.redirectStatus), String(boundary.unownedStatus), boundary.unownedError]) {
      assert.ok(text.includes(fact), `the boundary description must state ${fact}`);
    }
  }

  console.log(
    `cloud-accounts gova boundary: ${boundary.keptRoutes.length} kept route(s), ` +
      `${ROUTE_OWNERSHIP.length} owned patterns redirected with ${boundary.redirectStatus}, ` +
      `unowned business routes answered ${boundary.unownedStatus}.`,
  );
}

withTemporaryEnvironment(OWNER_ORIGINS, main).catch((error) => {
  console.error(error);
  process.exit(1);
});
