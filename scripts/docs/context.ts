import type { DomainRegistry, KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from './model';
import { normalizePath, pathExists, readRepoJson } from './fs-scan';
import { buildRepositoryKnowledgeGraph } from './repository-knowledge';

function scoreNode(node: KnowledgeNode, target: string): number {
  const needle = target.toLowerCase();
  const path = node.path?.toLowerCase();
  const name = node.name.toLowerCase();
  if (node.id.toLowerCase() === needle || path === needle || name === needle) return 100;
  if (path && (path.startsWith(`${needle}/`) || needle.startsWith(`${path}/`))) return 85;
  if (node.tags.includes(needle)) return 75;
  if (path?.includes(needle)) return 60;
  if (name.includes(needle)) return 55;
  if (node.tags.some((tag) => tag.includes(needle) || needle.includes(tag))) return 35;
  return 0;
}

function uniqueNodes(nodes: Array<KnowledgeNode | undefined>): KnowledgeNode[] {
  const map = new Map<string, KnowledgeNode>();
  for (const node of nodes) if (node) map.set(node.id, node);
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function nodeById(graph: KnowledgeGraph): Map<string, KnowledgeNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function relatedEdges(graph: KnowledgeGraph, ids: Set<string>): KnowledgeEdge[] {
  return graph.edges.filter((edge) => ids.has(edge.from) || ids.has(edge.to));
}

function endpointIds(edges: KnowledgeEdge[]): Set<string> {
  return new Set(edges.flatMap((edge) => [edge.from, edge.to]));
}

function matchingDomains(target: string, seeds: KnowledgeNode[]): DomainRegistry['domains'] {
  const registryPath = 'docs/09-agent-knowledge/domain-registry.json';
  if (!pathExists(registryPath)) return [];
  const registry = readRepoJson<DomainRegistry>(registryPath);
  const paths = [normalizePath(target), ...seeds.map((node) => node.path).filter((path): path is string => Boolean(path))];
  return registry.domains.filter((domain) =>
    paths.some((path) =>
      path.startsWith(domain.docsPrefix) ||
      domain.sourcePrefixes.some((prefix) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)),
    ),
  );
}

function markdownList(nodes: KnowledgeNode[]): string[] {
  return nodes.map((node) => `- \`${node.path || node.name}\`${node.summary ? ` — ${node.summary}` : ''}`);
}

export function renderContextPack(targetInput: string): string {
  const target = normalizePath(targetInput.trim());
  const graph = buildRepositoryKnowledgeGraph();
  const map = nodeById(graph);
  const ranked = graph.nodes
    .map((node) => ({ node, score: scoreNode(node, target) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));

  const maximum = ranked[0]?.score || 0;
  const seeds = ranked.filter((item) => item.score >= Math.max(55, maximum - 15)).slice(0, 8).map((item) => item.node);
  const seedIds = new Set(seeds.map((node) => node.id));
  const firstEdges = relatedEdges(graph, seedIds);
  const owners = uniqueNodes(firstEdges
    .filter((edge) => edge.kind === 'belongs-to' && seedIds.has(edge.from))
    .map((edge) => map.get(edge.to))
    .concat(seeds.filter((node) => ['package', 'feature', 'service'].includes(node.kind))));
  const scopeIds = new Set([...seedIds, ...owners.map((node) => node.id)]);
  const scopeEdges = relatedEdges(graph, scopeIds);
  const expandedIds = endpointIds(scopeEdges);
  for (const id of scopeIds) expandedIds.add(id);
  const expandedEdges = relatedEdges(graph, expandedIds);

  const dependencies = uniqueNodes(scopeEdges
    .filter((edge) => edge.kind === 'imports' && scopeIds.has(edge.from))
    .map((edge) => map.get(edge.to)));
  const consumers = uniqueNodes(scopeEdges
    .filter((edge) => edge.kind === 'imports' && scopeIds.has(edge.to))
    .map((edge) => map.get(edge.from)));
  const tests = uniqueNodes(expandedEdges
    .filter((edge) => edge.kind === 'tests' || edge.kind === 'belongs-to')
    .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
    .filter((node) => node?.kind === 'test'));
  const routes = uniqueNodes(expandedEdges
    .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
    .filter((node) => node?.kind === 'route'));
  const services = uniqueNodes([...owners, ...expandedEdges.flatMap((edge) => [map.get(edge.from), map.get(edge.to)])]
    .filter((node) => node?.kind === 'service'));
  const relatedDocs = uniqueNodes(expandedEdges
    .filter((edge) => ['references', 'documents', 'related-to'].includes(edge.kind))
    .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
    .filter((node) => node?.kind === 'document'));

  const domains = matchingDomains(target, seeds);
  const domainReadFirst = domains.flatMap((domain) => domain.readFirst).map((path) => graph.nodes.find((node) => node.kind === 'document' && node.path === path));
  const mandatoryPaths = new Set<string>([
    'docs/README.md',
    'docs/09-agent-knowledge/agent-protocol.md',
  ]);
  if (seeds.some((node) => node.kind === 'package' || node.path?.startsWith('packages/')) || owners.some((node) => node.kind === 'package')) {
    mandatoryPaths.add('docs/01-architecture/README.md');
    mandatoryPaths.add('docs/01-architecture/02-packages/module-isolation-rules.md');
  }
  if (seeds.some((node) => node.path?.startsWith('src/app/') || node.path?.startsWith('src/components/'))) {
    mandatoryPaths.add('docs/04-ui-components/touch-interaction-policy.md');
    mandatoryPaths.add('docs/04-ui-components/page-snapshot-system.md');
  }
  const mandatoryDocs = [...mandatoryPaths].map((path) => graph.nodes.find((node) => node.kind === 'document' && node.path === path));
  const readFirst = uniqueNodes([...mandatoryDocs, ...domainReadFirst, ...relatedDocs]).slice(0, 18);

  const impact = uniqueNodes(expandedEdges
    .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
    .filter((node) => node && !scopeIds.has(node.id) && node.kind !== 'document' && node.kind !== 'test'))
    .slice(0, 30);

  const lines: string[] = ['# Agent Context Pack', '', `**Requested target:** \`${targetInput}\``, ''];
  if (!seeds.length) {
    lines.push('## Resolution', '', 'No high-confidence repository node was found. Refine the target to an exact path, `@asol/*` package, feature, service, or route before editing.', '', '## Read First', '', '- `docs/README.md`', '- `docs/09-agent-knowledge/agent-protocol.md`', '');
    return lines.join('\n');
  }

  lines.push('## Target', '', ...markdownList(seeds), '');
  if (owners.length) lines.push('## Owners / Scope', '', ...markdownList(owners), '');
  if (readFirst.length) lines.push('## Read First', '', ...markdownList(readFirst), '');
  if (impact.length) lines.push('## Change Impact', '', ...markdownList(impact), '');
  if (dependencies.length) lines.push('## Dependencies', '', ...markdownList(dependencies.slice(0, 25)), '');
  if (consumers.length) lines.push('## Consumers', '', ...markdownList(consumers.slice(0, 25)), '');
  if (routes.length) lines.push('## Routes', '', ...markdownList(routes.slice(0, 20)), '');
  if (services.length) lines.push('## Services', '', ...markdownList(services), '');
  if (tests.length) lines.push('## Tests', '', ...markdownList(tests.slice(0, 30)), '');

  lines.push(
    '## Verification',
    '',
    'Run targeted tests above first, then:',
    '',
    '```bash',
    'npm run typecheck',
    'npm run lint',
    'npm run architecture:check',
    '```',
    '',
    'Use `npm run build` when the task requires the complete release gate. Regenerate knowledge with `npm run architecture:docs` when graph facts changed.',
    '',
    '## Guardrails',
    '',
    '- Edit the owning capability; do not introduce a bypass because it is locally convenient.',
    '- Use declared package exports only; never deep-import sealed package internals.',
    '- Preserve browser/server/native/service runtime boundaries.',
    '- Keep one responsibility per file.',
    '- Update intentional docs when behavior, contracts, architecture, configuration, or operations change.',
    '- Never hand-edit generated knowledge snapshots.',
    '',
  );
  return lines.join('\n');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/context.ts')) {
  const target = process.argv.slice(2).join(' ').trim();
  if (!target) {
    console.error('Usage: npx tsx scripts/docs/context.ts <target-path-or-capability>');
    process.exitCode = 1;
  } else {
    console.log(renderContextPack(target));
  }
}
