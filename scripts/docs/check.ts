import type { DomainRegistry, KnowledgeGraph, KnowledgeNode } from './model';
import { pathExists, readRepoJson, readRepoText } from './fs-scan';
import { diffGeneratedKnowledge } from './generate';
import { validateDocumentMutabilityRegistry } from './document-mutability';
import { redactEnvironmentAssignments } from './operational-facts';
import { buildRepositoryKnowledgeGraph } from './repository-knowledge';
import { CORE_RUNTIME_IDS } from './runtime-knowledge';
import { renderContextPack } from './context';

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
  'docs/09-agent-knowledge/runtime-contract.md',
  'docs/09-agent-knowledge/coverage-contract.md',
  'docs/09-agent-knowledge/knowledge-schema.md',
  'docs/09-agent-knowledge/context-packs.md',
  'docs/09-agent-knowledge/generation-and-drift.md',
  'docs/09-agent-knowledge/authoring-standard.md',
  'docs/09-agent-knowledge/document-mutability.md',
  'docs/09-agent-knowledge/document-mutability.json',
  'docs/09-agent-knowledge/domain-registry.json',
  'docs/09-agent-knowledge/contracts/docs-ci.md',
  'docs/09-agent-knowledge/contracts/runtime-compatibility.md',
  'docs/09-agent-knowledge/contracts/documentation-update-policy.md',
  'docs/09-agent-knowledge/contracts/protected-docs.md',
  'docs/09-agent-knowledge/generated/README.md',
] as const;

const AGENT_ENTRY_SURFACES = [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.agents/rules/agent-instructions.md',
  '.cursor/rules/session-standards.mdc',
] as const;

const REQUIRED_AGENT_MARKERS = [
  'scripts/docs/context.ts',
  'docs/09-agent-knowledge/runtime-contract.md',
  'document-mutability',
  'runtime:check',
  'docs:ci',
] as const;

function nodeMap(graph: KnowledgeGraph): Map<string, KnowledgeNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function validateGraphContract(graph: KnowledgeGraph): string[] {
  const errors: string[] = [];
  const map = nodeMap(graph);
  if (graph.version !== 2) errors.push(`unsupported knowledge graph version: ${String(graph.version)}`);

  for (const kind of [
    'document',
    'domain',
    'package',
    'external-dependency',
    'feature',
    'route',
    'service',
    'runtime',
    'artifact',
    'command',
    'environment-key',
  ] as const) {
    if (!graph.nodes.some((node) => node.kind === kind)) errors.push(`knowledge graph has no ${kind} nodes`);
  }

  for (const kind of [
    'imports',
    'declares-dependency',
    'documents',
    'belongs-to',
    'tests',
    'affects-runtime',
    'targets-runtime',
    'produces',
    'consumes',
    'invokes',
    'configured-by',
    'uses-environment',
  ] as const) {
    if (!graph.edges.some((edge) => edge.kind === kind)) errors.push(`knowledge graph has no ${kind} relationships`);
  }

  for (const edge of graph.edges) {
    if (!map.has(edge.from)) errors.push(`knowledge graph dangling edge source: ${edge.from}`);
    if (!map.has(edge.to)) errors.push(`knowledge graph dangling edge target: ${edge.to}`);
  }

  for (const runtimeId of CORE_RUNTIME_IDS) {
    if (!map.has(`runtime:${runtimeId}`)) errors.push(`missing mandatory runtime node: ${runtimeId}`);
  }

  const staticArtifact = map.get('artifact:static-out');
  if (!staticArtifact) {
    errors.push('missing static out artifact node');
  } else {
    if (!graph.edges.some((edge) => edge.kind === 'produces' && edge.to === staticArtifact.id && map.get(edge.from)?.name === 'npm run build:static')) {
      errors.push('static out artifact is not produced by npm run build:static');
    }
    for (const runtimeId of ['static-out', 'android', 'ios']) {
      if (!graph.edges.some((edge) => edge.kind === 'consumes' && edge.from === `runtime:${runtimeId}` && edge.to === staticArtifact.id)) {
        errors.push(`runtime ${runtimeId} does not consume the static out artifact`);
      }
    }
  }

  const serverArtifact = map.get('artifact:next-server-build');
  if (!serverArtifact || !graph.edges.some((edge) => edge.kind === 'consumes' && edge.from === 'runtime:web' && edge.to === serverArtifact.id)) {
    errors.push('web runtime does not consume the .next server artifact');
  }

  const ownerKinds = new Set<KnowledgeNode['kind']>(['package', 'feature', 'service']);
  if (!graph.edges.some((edge) => edge.kind === 'imports' && ownerKinds.has(map.get(edge.from)?.kind ?? 'source') && ownerKinds.has(map.get(edge.to)?.kind ?? 'source'))) {
    errors.push('knowledge graph has no owner-level dependency relationships');
  }
  if (!graph.edges.some((edge) => edge.kind === 'imports' && ownerKinds.has(map.get(edge.from)?.kind ?? 'source') && map.get(edge.to)?.kind === 'external-dependency')) {
    errors.push('knowledge graph has no owner-to-external dependency import relationships');
  }

  for (const dependency of graph.nodes.filter((node) => node.kind === 'external-dependency')) {
    if (dependency.name.startsWith('@asol/')) errors.push(`internal package incorrectly modeled as external dependency: ${dependency.name}`);
  }

  for (const route of graph.nodes.filter((node) => node.kind === 'route')) {
    if (!graph.edges.some((edge) => edge.from === route.id && edge.kind === 'affects-runtime')) {
      errors.push(`route has no runtime mapping: ${route.path || route.name}`);
    }
    if (route.summary === 'App Router request handler') {
      for (const forbidden of ['static-out', 'android', 'ios']) {
        if (graph.edges.some((edge) => edge.from === route.id && edge.kind === 'affects-runtime' && edge.to === `runtime:${forbidden}`)) {
          errors.push(`server route handler incorrectly mapped to ${forbidden}: ${route.path || route.name}`);
        }
      }
    }
  }

  for (const source of graph.nodes.filter((node) => node.kind === 'source' || node.kind === 'script')) {
    if (source.path?.startsWith('android/') && !graph.edges.some((edge) => edge.from === source.id && edge.kind === 'affects-runtime' && edge.to === 'runtime:android')) {
      errors.push(`Android source lacks Android runtime mapping: ${source.path}`);
    }
    if (source.path?.startsWith('ios/') && !graph.edges.some((edge) => edge.from === source.id && edge.kind === 'affects-runtime' && edge.to === 'runtime:ios')) {
      errors.push(`iOS source lacks iOS runtime mapping: ${source.path}`);
    }
  }

  for (const environment of graph.nodes.filter((node) => node.kind === 'environment-key')) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(environment.name)) errors.push(`invalid environment key node name: ${environment.name}`);
  }

  for (const document of graph.nodes.filter((node) => node.kind === 'document' && node.path !== 'docs/README.md')) {
    if (!graph.edges.some((edge) => edge.from === document.id && edge.kind === 'belongs-to' && map.get(edge.to)?.kind === 'domain')) {
      errors.push(`documentation file is not assigned to a documentation domain: ${document.path || document.name}`);
    }
  }

  const sampleContext = renderContextPack('package.json');
  for (const runtimeName of ['Development', 'Web', 'Static out', 'Android', 'iOS']) {
    if (!sampleContext.includes(`**${runtimeName}**`)) errors.push(`context pack does not always expose runtime: ${runtimeName}`);
  }
  if (!sampleContext.includes('every change must consider Development, Web, Static `out/`, Android, and iOS')) {
    errors.push('context pack is missing the binding five-runtime rule');
  }
  if (!sampleContext.includes('## Risk Classification')) {
    errors.push('context pack is missing risk classification');
  }
  if (!sampleContext.includes('## Required Runtime-Compatibility Test Plan')) {
    errors.push('context pack is missing runtime-compatibility test plan');
  }

  return errors;
}

export function validateAgentKnowledge(): string[] {
  const errors: string[] = [];
  for (const path of REQUIRED_ENTRY_POINTS) {
    if (!pathExists(path)) errors.push(`missing agent knowledge entry point: ${path}`);
  }
  for (const path of AGENT_ENTRY_SURFACES) {
    if (!pathExists(path)) {
      errors.push(`missing agent instruction surface: ${path}`);
      continue;
    }
    const content = readRepoText(path);
    for (const marker of REQUIRED_AGENT_MARKERS) {
      if (!content.includes(marker)) errors.push(`agent instruction surface ${path} is missing required marker: ${marker}`);
    }
  }
  if (errors.length) return [...new Set(errors)].sort();

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
    errors.push(...validateGraphContract(graph));
  } catch (error) {
    errors.push(`knowledge graph build failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const redactionProbe = 'cross-env SECRET_KEY=super-secret NEXT_PUBLIC_DEMO="visible-value" node script.js';
  const redacted = redactEnvironmentAssignments(redactionProbe);
  if (redacted.includes('super-secret') || redacted.includes('visible-value')) {
    errors.push('operational command redaction leaks environment assignment values');
  }

  errors.push(...validateDocumentMutabilityRegistry());
  errors.push(...diffGeneratedKnowledge());
  return [...new Set(errors)].sort();
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/check.ts')) {
  const errors = validateAgentKnowledge();
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  } else {
    console.log('Agent knowledge documentation contract passed.');
  }
}
