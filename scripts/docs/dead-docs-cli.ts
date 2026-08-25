import { buildRepositoryKnowledgeGraph } from './repository-knowledge';
import { collectDeadDocsFindings, deadDocsValidationErrors, renderDeadDocsReport } from './dead-docs';

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/dead-docs-cli.ts')) {
  const graph = buildRepositoryKnowledgeGraph();
  const findings = collectDeadDocsFindings(graph);
  const errors = deadDocsValidationErrors(findings);
  if (process.argv.includes('--report')) {
    console.log(renderDeadDocsReport(findings));
  }
  if (errors.length) {
    console.error('Dead docs check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Dead docs check passed (${findings.length} informational findings).`);
  }
}
