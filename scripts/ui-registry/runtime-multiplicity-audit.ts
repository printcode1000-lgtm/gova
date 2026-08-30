import { runtimeMultiplicityReport } from '@asol/architecture-core';

export { runtimeMultiplicityReport } from '@asol/architecture-core';
export type {
  RuntimeMultiplicityFinding,
  RuntimeMultiplicityReport,
} from '@asol/architecture-core';

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runtimeMultiplicityReport();
  console.log(
    JSON.stringify(
      {
        canonicalInlineDescriptors: report.canonicalInlineDescriptors,
        repeatedSourceSites: report.repeatedSourceSites,
        repeatedWithInstance: report.repeatedWithInstance,
        directIteratorSites: report.directIteratorSites,
        reusableTemplateSites: report.reusableTemplateSites,
        unresolvedCount: report.unresolved.length,
      },
      null,
      2,
    ),
  );
  for (const finding of report.unresolved) {
    console.log(
      `UNRESOLVED ${finding.reason} ${finding.file}:${finding.line} ${finding.uid} (${finding.id}) component=${finding.component ?? 'unknown'}`,
    );
  }
  if (process.argv.includes('--check') && report.unresolved.length > 0) process.exitCode = 1;
}
