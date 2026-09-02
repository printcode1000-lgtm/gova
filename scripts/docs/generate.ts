import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { renderAccountRoutingCatalog } from './account-routing-catalog';
import { renderApiContractCatalog, renderWriteSurfaceMap } from './api-and-write-catalogs';
import { renderDocCoverageScore } from './coverage-score';
import { collectDeadDocsFindings, renderDeadDocsReport } from './dead-docs';
import { renderEnvSafetyMatrix } from './env-safety-matrix';
import { renderNativeCapabilityMap } from './native-capability-map';
import { buildRepositoryKnowledgeGraph } from './repository-knowledge';
import { renderOperationalCatalog } from './operational-facts';
import {
  renderChangeImpactIndex,
  renderCommandCatalog,
  renderDocumentCatalog,
  renderEnvironmentCatalog,
  renderGraphHealth,
  renderKnowledgeGraphJson,
  renderRepositoryCatalog,
  renderRouteCatalog,
  renderRuntimeCatalog,
  renderSearchIndexJson,
} from './render';
import { renderRuntimeCompatibilityMatrix } from '../runtime/compatibility-checks';

const ROOT = process.cwd();

export const GENERATED_KNOWLEDGE_FILES = [
  'docs/09-agent-knowledge/generated/catalogs/repository-catalog.md',
  'docs/09-agent-knowledge/generated/catalogs/document-catalog.md',
  'docs/09-agent-knowledge/generated/catalogs/route-catalog.md',
  'docs/09-agent-knowledge/generated/catalogs/api-contract-catalog.md',
  'docs/09-agent-knowledge/generated/catalogs/account-routing-catalog.md',
  'docs/09-agent-knowledge/generated/catalogs/command-catalog.md',
  'docs/09-agent-knowledge/generated/catalogs/environment-catalog.md',
  'docs/09-agent-knowledge/generated/catalogs/native-capability-map.md',
  'docs/09-agent-knowledge/generated/catalogs/runtime-catalog.md',
  'docs/09-agent-knowledge/generated/catalogs/operational-catalog.md',
  'docs/09-agent-knowledge/generated/reports/change-impact-index.md',
  'docs/09-agent-knowledge/generated/reports/doc-coverage-score.md',
  'docs/09-agent-knowledge/generated/reports/write-surface-map.md',
  'docs/09-agent-knowledge/generated/reports/env-safety-matrix.md',
  'docs/09-agent-knowledge/generated/reports/dead-docs-report.md',
  'docs/09-agent-knowledge/generated/reports/runtime-compatibility-matrix.md',
  'docs/09-agent-knowledge/generated/reports/graph-health.md',
  'docs/09-agent-knowledge/generated/graphs/knowledge-graph.json',
  'docs/09-agent-knowledge/generated/graphs/search-index.json',
] as const;

export type GeneratedKnowledgeFile = (typeof GENERATED_KNOWLEDGE_FILES)[number];

/** Legacy flat paths kept only so migration messaging stays actionable. */
export const LEGACY_GENERATED_KNOWLEDGE_FILES = [
  'docs/09-agent-knowledge/generated/repository-catalog.md',
  'docs/09-agent-knowledge/generated/document-catalog.md',
  'docs/09-agent-knowledge/generated/route-catalog.md',
  'docs/09-agent-knowledge/generated/change-impact-index.md',
  'docs/09-agent-knowledge/generated/runtime-catalog.md',
  'docs/09-agent-knowledge/generated/command-catalog.md',
  'docs/09-agent-knowledge/generated/environment-catalog.md',
  'docs/09-agent-knowledge/generated/graph-health.md',
  'docs/09-agent-knowledge/generated/operational-catalog.md',
  'docs/09-agent-knowledge/generated/knowledge-graph.json',
  'docs/09-agent-knowledge/generated/search-index.json',
] as const;

export function renderGeneratedKnowledgeFiles(): Map<GeneratedKnowledgeFile, string> {
  const graph = buildRepositoryKnowledgeGraph();
  const deadFindings = collectDeadDocsFindings(graph);
  return new Map<GeneratedKnowledgeFile, string>([
    [GENERATED_KNOWLEDGE_FILES[0], renderRepositoryCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[1], renderDocumentCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[2], renderRouteCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[3], renderApiContractCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[4], renderAccountRoutingCatalog()],
    [GENERATED_KNOWLEDGE_FILES[5], renderCommandCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[6], renderEnvironmentCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[7], renderNativeCapabilityMap(graph)],
    [GENERATED_KNOWLEDGE_FILES[8], renderRuntimeCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[9], renderOperationalCatalog()],
    [GENERATED_KNOWLEDGE_FILES[10], renderChangeImpactIndex(graph)],
    [GENERATED_KNOWLEDGE_FILES[11], renderDocCoverageScore(graph)],
    [GENERATED_KNOWLEDGE_FILES[12], renderWriteSurfaceMap(graph)],
    [GENERATED_KNOWLEDGE_FILES[13], renderEnvSafetyMatrix(graph)],
    [GENERATED_KNOWLEDGE_FILES[14], renderDeadDocsReport(deadFindings)],
    [GENERATED_KNOWLEDGE_FILES[15], renderRuntimeCompatibilityMatrix(graph)],
    [GENERATED_KNOWLEDGE_FILES[16], renderGraphHealth(graph)],
    [GENERATED_KNOWLEDGE_FILES[17], renderKnowledgeGraphJson(graph)],
    [GENERATED_KNOWLEDGE_FILES[18], renderSearchIndexJson(graph)],
  ]);
}

export function writeGeneratedKnowledge(): void {
  for (const [path, content] of renderGeneratedKnowledgeFiles()) {
    const absolute = join(ROOT, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content, 'utf8');
  }
}

export function diffGeneratedKnowledge(): string[] {
  const errors: string[] = [];
  for (const [path, expected] of renderGeneratedKnowledgeFiles()) {
    const absolute = join(ROOT, path);
    if (!existsSync(absolute)) {
      errors.push(`${path} is missing; run npm run docs:generate`);
      continue;
    }
    const actual = readFileSync(absolute, 'utf8');
    if (actual !== expected) errors.push(`${path} is stale; run npm run docs:generate`);
  }
  for (const legacy of LEGACY_GENERATED_KNOWLEDGE_FILES) {
    if (existsSync(join(ROOT, legacy))) {
      errors.push(
        `${legacy} is a legacy generated path; remove it and use the catalogs/graphs/reports layout via npm run docs:generate`,
      );
    }
  }
  return errors;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/generate.ts')) {
  writeGeneratedKnowledge();
  console.log(`Generated ${GENERATED_KNOWLEDGE_FILES.length} repository knowledge files.`);
}
