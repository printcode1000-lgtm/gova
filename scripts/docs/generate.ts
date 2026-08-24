import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

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

const ROOT = process.cwd();

export const GENERATED_KNOWLEDGE_FILES = [
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

export type GeneratedKnowledgeFile = (typeof GENERATED_KNOWLEDGE_FILES)[number];

export function renderGeneratedKnowledgeFiles(): Map<GeneratedKnowledgeFile, string> {
  const graph = buildRepositoryKnowledgeGraph();
  return new Map<GeneratedKnowledgeFile, string>([
    [GENERATED_KNOWLEDGE_FILES[0], renderRepositoryCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[1], renderDocumentCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[2], renderRouteCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[3], renderChangeImpactIndex(graph)],
    [GENERATED_KNOWLEDGE_FILES[4], renderRuntimeCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[5], renderCommandCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[6], renderEnvironmentCatalog(graph)],
    [GENERATED_KNOWLEDGE_FILES[7], renderGraphHealth(graph)],
    [GENERATED_KNOWLEDGE_FILES[8], renderOperationalCatalog()],
    [GENERATED_KNOWLEDGE_FILES[9], renderKnowledgeGraphJson(graph)],
    [GENERATED_KNOWLEDGE_FILES[10], renderSearchIndexJson(graph)],
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
    // Live graph validation is binding even in a checkout without committed snapshots.
    // When a snapshot is committed, byte-for-byte drift is also binding.
    if (!existsSync(absolute)) continue;
    const actual = readFileSync(absolute, 'utf8');
    if (actual !== expected) errors.push(`${path} is stale; run npm run architecture:docs`);
  }
  return errors;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/generate.ts')) {
  writeGeneratedKnowledge();
  console.log(`Generated ${GENERATED_KNOWLEDGE_FILES.length} repository knowledge files.`);
}
