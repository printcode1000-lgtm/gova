import { buildRepositoryKnowledgeGraph } from './repository-knowledge';
import { renderRuntimeCompatibilityMatrix } from '../runtime/compatibility-checks';

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/runtime-coverage-cli.ts')) {
  const graph = buildRepositoryKnowledgeGraph();
  console.log(renderRuntimeCompatibilityMatrix(graph));
}
