import { ROUTE_OWNERSHIP } from "@asol/account-bridge/routes";
import {
  ACCOUNT_DECLARATIONS,
  type AccountDeclaration,
} from "@asol/account-declarations";

import type {
  CloudAccountRouteGroup,
  VercelAccountFacts,
} from "../../presentation/cloud-accounts-facts.types";
import { VERCEL_USAGE_SNAPSHOT } from "../../presentation/cloud-accounts-vercel-usage-snapshot";
import {
  deployCommandFor,
  gitAutoDeployFor,
  readPackageScripts,
} from "./cloud-accounts-repository-facts";

function declarations(): AccountDeclaration[] {
  return Object.values(ACCOUNT_DECLARATIONS);
}

/** Route patterns grouped by the account that answers them, in registry order. */
export function cloudAccountRouteGroups(): readonly CloudAccountRouteGroup[] {
  const byOwner = new Map<string, CloudAccountRouteGroup["patterns"][number][]>();
  for (const entry of ROUTE_OWNERSHIP) {
    const list = byOwner.get(entry.owner) ?? [];
    list.push({ pattern: entry.pattern, methods: entry.methods, description: entry.description });
    byOwner.set(entry.owner, list);
  }
  return [...byOwner.entries()].map(([owner, patterns]) => ({
    owner,
    project: ACCOUNT_DECLARATIONS[owner]?.project ?? owner,
    patterns,
  }));
}

export function listVercelAccountFacts(): readonly VercelAccountFacts[] {
  const scripts = readPackageScripts();
  return declarations().map((declaration) => ({
    name: declaration.name,
    project: declaration.project,
    email: declaration.email,
    serviceDir: declaration.serviceDir ?? null,
    declaredEnvCount: declaration.requiredEnv.length + declaration.optionalEnv.length,
    deployCommand: deployCommandFor(scripts, declaration),
    gitAutoDeploy: gitAutoDeployFor(declaration),
    ownedRoutePatterns: ROUTE_OWNERSHIP.filter((entry) => entry.owner === declaration.name).map(
      (entry) => entry.pattern,
    ),
    servesFrontend: declaration.deployFromRepositoryRoot === true,
    usage: VERCEL_USAGE_SNAPSHOT[declaration.name],
  }));
}
