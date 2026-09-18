import { CANONICAL_LOCAL_ENV_FILE } from "@asol/env-core/process";

import type { CloudAccountsFacts } from "../../presentation/cloud-accounts-facts.types";
import { ENV_CONTRACT_FILE } from "./cloud-accounts-turso-organizations";
import { listR2AccountFacts, listStorageDestinations } from "./cloud-accounts-r2-facts";
import {
  deploymentIsolationRuleName,
  existingRepositoryFile,
  isGitIgnored,
  npmCommand,
  projectReconciledBy,
  readPackageScripts,
  workspacePackageName,
} from "./cloud-accounts-repository-facts";
import {
  listTursoAccountFacts,
  type EnvReader,
  type TursoDatabaseInventory,
} from "./cloud-accounts-turso-facts";
import { readGovaBoundaryFacts } from "./cloud-accounts-gova-boundary-facts";
import { cloudAccountRouteGroups, listVercelAccountFacts } from "./cloud-accounts-vercel-facts";

const ROUTING_CATALOG_PATH =
  "docs/09-agent-knowledge/generated/catalogs/account-routing-catalog.md";

/**
 * Everything `/dev/cloud-accounts` renders, derived from the code that owns it.
 *
 * Built per request by a development-only route, so a changed registry, script
 * or manifest shows on the next load — and a fact that can no longer be derived
 * throws here rather than rendering a stale sentence. The route supplies the
 * Turso inventory it reads from the desired-schema manifests and the server
 * environment reader; only names derived from the environment reach the page.
 */
export function buildCloudAccountsFacts(sources: {
  readonly tursoInventory: TursoDatabaseInventory;
  readonly readEnv: EnvReader;
}): CloudAccountsFacts {
  const scripts = readPackageScripts();
  const otaPackage = workspacePackageName("ota-core");
  const turso = listTursoAccountFacts(sources.tursoInventory, sources.readEnv);
  const vercel = listVercelAccountFacts();
  const frontend = vercel.find((account) => account.servesFrontend);
  return {
    localEnvFile: CANONICAL_LOCAL_ENV_FILE,
    envContractFile: existingRepositoryFile(ENV_CONTRACT_FILE),
    localEnvFileGitIgnored: isGitIgnored(CANONICAL_LOCAL_ENV_FILE),
    pushVercelEnvProject: projectReconciledBy(scripts, "db:push:vercel-env"),
    isolationRule: deploymentIsolationRuleName(),
    routingCatalogPath: existingRepositoryFile(ROUTING_CATALOG_PATH),
    otaPackage,
    bridgePackage: workspacePackageName("account-bridge"),
    commands: {
      secretsBackup: npmCommand(scripts, "secrets:backup"),
      architectureCheck: npmCommand(scripts, "architecture:check"),
      vercelUsage: npmCommand(scripts, "cloud-accounts:vercel-usage"),
      tursoUsage: npmCommand(scripts, "cloud-accounts:turso-usage"),
      r2Usage: npmCommand(scripts, "cloud-accounts:r2-usage"),
      r2Contents: npmCommand(scripts, "cloud-accounts:r2-contents"),
      pushVercelEnv: npmCommand(scripts, "db:push:vercel-env"),
    },
    vercel,
    routeGroups: cloudAccountRouteGroups(),
    govaBoundary: frontend ? readGovaBoundaryFacts(frontend.project) : null,
    turso: turso.accounts,
    tursoUnassigned: turso.unassigned,
    r2: listR2AccountFacts(otaPackage),
    storageDestinations: listStorageDestinations(otaPackage),
  };
}
