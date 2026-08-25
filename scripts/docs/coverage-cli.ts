import { buildRepositoryKnowledgeGraph } from './repository-knowledge';
import { buildDocCoverageScore, renderDocCoverageScore } from './coverage-score';

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/coverage-cli.ts')) {
  const graph = buildRepositoryKnowledgeGraph();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(buildDocCoverageScore(graph), null, 2));
  } else {
    console.log(renderDocCoverageScore(graph));
  }
}
