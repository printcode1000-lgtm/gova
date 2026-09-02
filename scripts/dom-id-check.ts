import {
  formatStaticDomIdentityReport,
  formatStaticDomRuntimeRegistryReport,
  scanStaticDomIdentities,
  scanStaticDomRuntimeRegistry,
  writeStaticDomIdentityManifest,
} from '@asol/architecture-core';

const write = process.argv.includes('--write');

try {
  if (write) {
    const manifest = writeStaticDomIdentityManifest();
    const registry = scanStaticDomRuntimeRegistry();
    if (registry.violations.length > 0) {
      console.error(formatStaticDomRuntimeRegistryReport(registry.violations));
      process.exit(1);
    }
    console.log(`Static DOM ID Guard OK: wrote ${manifest.entries.length} identities; runtime registry ${registry.registryIds.size} id(s).`);
    process.exit(0);
  }

  const staticResult = scanStaticDomIdentities();
  const registryResult = scanStaticDomRuntimeRegistry();
  let failed = false;
  if (staticResult.violations.length > 0) {
    console.error(formatStaticDomIdentityReport(staticResult.violations));
    failed = true;
  }
  if (registryResult.violations.length > 0) {
    console.error(formatStaticDomRuntimeRegistryReport(registryResult.violations));
    failed = true;
  }
  if (failed) process.exit(1);
  console.log(`Static DOM ID Guard OK: ${staticResult.entries.length} identities; runtime registry ${registryResult.registryIds.size} id(s).`);
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
