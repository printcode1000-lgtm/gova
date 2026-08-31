#!/usr/bin/env tsx
import { assertGovaArtifact } from '@asol/gova-deployment-core';

/** Post-build gate: the shipped gova artifact must be a frontend. */
try {
  const report = assertGovaArtifact(process.cwd());
  console.log(
    `✅ gova artifact verified: ${report.apiFunctions.length} API function(s) — ` +
      `${report.apiFunctions.join(', ') || 'none'}; no business capability or secret in the trace.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
