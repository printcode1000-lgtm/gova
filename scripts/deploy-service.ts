import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { deployAccountService } from "@asol/vercel-deploy-core";
import { resolveReleaseWorkloadDeclaration, syncReleaseWorkloadSources } from "./sync-service-sources";
import { assertReleaseDeploymentContext } from "./assert-release-deployment-context";

export async function deployReleaseWorkload(service: string): Promise<void> {
  assertReleaseDeploymentContext(`${service}:deploy`);
  if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
  dotenv.config({ path: ".env", quiet: true });
  const declaration = resolveReleaseWorkloadDeclaration(service);
  await deployAccountService({ declaration, syncSources: () => syncReleaseWorkloadSources(service) });
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  if (argv.length !== 1) throw new Error("Usage: deploy-service.ts <workload>");
  await deployReleaseWorkload(argv[0]!);
}

if (process.argv[1]?.endsWith("deploy-service.ts")) main().catch((error) => { console.error("Service deploy failed:", error instanceof Error ? error.message : error); process.exit(1); });
