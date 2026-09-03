import { ACCOUNT_DECLARATIONS, type AccountDeclaration } from "@asol/account-declarations";
import { RELEASE_WORKLOADS, type ReleaseWorkload } from "@asol/vercel-deploy-core";
import { syncServiceMirror } from "@asol/service-mirror-core";

export function resolveReleaseWorkloadDeclaration(service: string): AccountDeclaration & { serviceDir: string } {
  if (!RELEASE_WORKLOADS.includes(service as ReleaseWorkload)) {
    throw new Error(`Unknown standard workload "${service}". Control is a separate privileged runtime.`);
  }
  const declaration = ACCOUNT_DECLARATIONS[service];
  if (!declaration?.serviceDir) throw new Error(`Deployment declaration for ${service} has no service directory.`);
  return declaration as AccountDeclaration & { serviceDir: string };
}

export function syncReleaseWorkloadSources(service: string): void {
  const declaration = resolveReleaseWorkloadDeclaration(service);
  syncServiceMirror({ serviceName: service as ReleaseWorkload, serviceDir: declaration.serviceDir, entryPoints: declaration.mirrorEntryPoints, runtimeAssets: declaration.runtimeAssets });
}

export function main(argv: readonly string[] = process.argv.slice(2)): void {
  if (argv.length < 1) throw new Error("Usage: sync-service-sources.ts <workload> [--out <directory>]");
  syncReleaseWorkloadSources(argv[0]!);
}

if (process.argv[1]?.endsWith("sync-service-sources.ts")) main();
