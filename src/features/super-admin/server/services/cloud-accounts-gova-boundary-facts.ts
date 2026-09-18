import { readFileSync } from "node:fs";
import path from "node:path";

import { BUSINESS_HTTP_METHODS } from "@asol/account-bridge/routes";
import { govaDeploymentManifest } from "@asol/gova-deployment-core";

import type { GovaBoundaryFacts } from "../../presentation/cloud-accounts-facts.types";

const PROXY_FILE = "src/proxy.ts";
const ROUTE_METHOD = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function required(pattern: RegExp, source: string, what: string): string {
  const match = pattern.exec(source);
  if (!match?.[1]) throw new Error(`[cloud-accounts] ${PROXY_FILE} no longer states ${what}.`);
  return match[1];
}

/** `src/app/api/health/route.ts` → `/api/health`. */
function apiPathOf(routeModule: string): string {
  return `/${routeModule.replace(/^src\/app\//, "").replace(/\/route\.tsx?$/, "")}`;
}

/**
 * What the repository-root deployment answers under `/api`, from the code that
 * decides it: the route modules `@asol/gova-deployment-core` keeps in the
 * artifact, and the compatibility boundary in `src/proxy.ts` — its matcher, the
 * status it redirects owned routes with, and the status and error it returns for
 * a business route no account owns.
 */
export function readGovaBoundaryFacts(project: string): GovaBoundaryFacts {
  const manifest = govaDeploymentManifest(process.cwd());
  const proxy = read(PROXY_FILE);
  const unownedBlock = required(
    /if \(isBusinessApiPath\(pathname\)\) \{([\s\S]*?)\n  \}/,
    proxy,
    "how it answers an unowned business route",
  );
  return {
    project,
    keptRoutes: manifest.keptRouteModules.map((routeModule) => ({
      pattern: apiPathOf(routeModule),
      methods: [...read(routeModule).matchAll(ROUTE_METHOD)].map((match) => match[1]!),
    })),
    boundaryMatcher: required(/matcher:\s*'([^']+)'/, proxy, "its matcher"),
    boundaryMethods: [...BUSINESS_HTTP_METHODS],
    redirectStatus: Number(
      required(/status:\s*(\d{3}),\s*headers:\s*\{[^}]*?location:/, proxy, "its redirect status"),
    ),
    unownedStatus: Number(required(/status:\s*(\d{3})/, unownedBlock, "its unowned-route status")),
    unownedError: required(/error:\s*'([^']+)'/, unownedBlock, "its unowned-route error"),
  };
}
