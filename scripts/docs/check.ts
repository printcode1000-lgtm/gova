import type { DomainRegistry } from './model';
import { pathExists, readRepoJson } from './fs-scan';
import { diffGeneratedKnowledge } from './generate';
import { buildRepositoryKnowledgeGraph } from './repository-knowledge';

const REQUIRED_ENTRY_POINTS = [
  'docs/README.md',
  'docs/00-overview/README.md',
  'docs/01-architecture/README.md',
  'docs/02-data-and-storage/README.md',
  'docs/03-products-and-commerce/README.md',
  'docs/04-ui-components/README.md',
  'docs/05-platform-features/README.md',
  'docs/06-super-admin-and-operations/README.md',
  'docs/07-mobile-and-release/README.md',
  'docs/08-troubleshooting/README.md',
  'docs/09-agent-knowledge/README.md',
  'docs/09-agent-knowledge/agent-protocol.md',
  'docs/09-agent-knowledge/knowledge-schema.md',
  'docs/09-agent-knowledge/context-packs.md',
  'docs/09-agent-knowledge/generation-and-drift.md',
  'docs/09-agent-knowledge/authoring-standard.md',
  'docs/09-agent-knowledge/domain-registry.json',
  'docs/09-agent-knowledge/generated/README.md',
] as const;

export function validateAgentKnowledge(): string[] {
  const errors: string[] = [];
  for (const path of REQUIRED_ENTRY_POINTS) {
    if (!pathExists(path)) errors.push(`missing agent knowledge entry point: ${path}`);
  }
  if (errors.length) return errors;

  let registry: DomainRegistry;
  try {
    registry = readRepoJson<DomainRegistry>('docs/09-agent-knowledge/domain-registry.json');
  } catch (error) {
    return [`cannot read agent knowledge domain registry: ${error instanceof Error ? error.message : String(error)}`];
  }

  if (registry.version !== 1) errors.push(`unsupported domain registry version: ${String(registry.version)}`);
  const domainIds = new Set<string>();
  for (const domain of registry.domains) {
    if (domainIds.has(domain.id)) errors.push(`duplicate documentation domain: ${domain.id}`);
    domainIds.add(domain.id);
    if (!pathExists(domain.docsPrefix)) errors.push(`missing documentation domain path: ${domain.docsPrefix}`);
    for (const path of domain.readFirst) if (!pathExists(path)) errors.push(`missing read-first document for ${domain.id}: ${path}`);
    for (const prefix of domain.sourcePrefixes) if (!pathExists(prefix)) errors.push(`missing mapped source path for ${domain.id}: ${prefix}`);
  }

  try {
    const graph = buildRepositoryKnowledgeGraph();
    for (const kind of ['document', 'package', 'feature', 'route', 'service'] as const) {
      if (!graph.nodes.some((node) => node.kind === kind)) errors.push(`knowledge graph has no ${kind} nodes`);
    }
    if (!graph.edges.some((edge) => edge.kind === 'imports')) errors.push('knowledge graph has no import relationships');
    if (!graph.edges.some((edge) => edge.kind === 'documents' || edge.kind === 'references')) errors.push('knowledge graph has no documentation relationships');
  } catch (error) {
    errors.push(`knowledge graph build failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  errors.push(...diffGeneratedKnowledge());
  return [...new Set(errors)].sort();
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/check.ts')) {
  const errors = validateAgentKnowledge();
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Agent knowledge documentation contract passed.');
  }
}
