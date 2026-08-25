import type { DomainRegistry, KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from './model';
import { normalizePath, pathExists, readRepoJson } from './fs-scan';
import { buildRepositoryKnowledgeGraph } from './repository-knowledge';
import { CORE_RUNTIME_IDS, RUNTIME_DEFINITIONS } from './runtime-knowledge';
import { classifyContextRisk, renderRiskSection } from './risk-classifier';
import { buildRuntimeTestPlan, renderRuntimeTestPlanSection } from './runtime-test-plan';

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

function relatedEdges(graph: KnowledgeGraph, ids: Set<string>, kinds?: Set<KnowledgeEdge['kind']>): KnowledgeEdge[] {
  return graph.edges.filter(
    (edge) =>
      (ids.has(edge.from) || ids.has(edge.to)) &&
      (!kinds || kinds.has(edge.kind)),
  );
}

function endpointIds(edges: KnowledgeEdge[]): Set<string> {
  return new Set(edges.flatMap((edge) => [edge.from, edge.to]));
}

function boundedStructuralNeighborhood(graph: KnowledgeGraph, initial: Set<string>, depth = 2): Set<string> {
  const traversable = new Set<KnowledgeEdge['kind']>([
    'belongs-to',
    'imports',
    'tests',
    'related-to',
    'contains',
    'invokes',
  ]);
  const visited = new Set(initial);
  let frontier = new Set(initial);
  for (let level = 0; level < depth; level += 1) {
    const edges = relatedEdges(graph, frontier, traversable);
    const next = endpointIds(edges);
    frontier = new Set([...next].filter((id) => !visited.has(id)));
    for (const id of next) visited.add(id);
    if (!frontier.size) break;
  }
  return visited;
}

function matchingDomains(target: string, seeds: KnowledgeNode[]): DomainRegistry['domains'] {
  const registryPath = 'docs/09-agent-knowledge/domain-registry.json';
  if (!pathExists(registryPath)) return [];
  const registry = readRepoJson<DomainRegistry>(registryPath);
  const paths = [
    normalizePath(target),
    ...seeds.map((node) => node.path).filter((path): path is string => Boolean(path)),
  ];
  return registry.domains.filter((domain) =>
    paths.some(
      (path) =>
        path.startsWith(domain.docsPrefix) ||
        domain.sourcePrefixes.some(
          (prefix) => path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
        ),
    ),
  );
}

function markdownList(nodes: KnowledgeNode[]): string[] {
  return nodes.map(
    (node) => `- \`${node.path || node.name}\`${node.summary ? ` — ${node.summary}` : ''}`,
  );
}

function runtimeContractLines(): string[] {
  const core = RUNTIME_DEFINITIONS.filter((runtime) => CORE_RUNTIME_IDS.includes(runtime.id as (typeof CORE_RUNTIME_IDS)[number]));
  return [
    '## Project Runtime Contract — Always Evaluate All Five',
    '',
    ...core.map((runtime) => `- **${runtime.name}** — ${runtime.summary}`),
    '',
    '**Binding rule:** every change must consider Development, Web, Static `out/`, Android, and iOS. A target-specific footprint only tells you where the graph has direct evidence; an unlisted surface is **not** permission to ignore it. Shared browser/application code normally reaches the static bundle and therefore both native shells.',
    '',
    'Key topology: `npm run build` → `.next` → Web; `npm run build:static` → `out/` → Static/Android/iOS. `src/app/api/**` and App Router `route.*` handlers are server/web behavior and are not bundled into `out/`. Capacitor production uses `webDir: "out"`; development may use `CAPACITOR_SERVER_URL` live reload.',
    '',
  ];
}

function nodesConnectedByKind(
  graph: KnowledgeGraph,
  ids: Set<string>,
  kinds: KnowledgeEdge['kind'][],
  nodeKind?: KnowledgeNode['kind'],
): KnowledgeNode[] {
  const map = nodeById(graph);
  return uniqueNodes(
    relatedEdges(graph, ids, new Set(kinds))
      .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
      .filter((node) => !nodeKind || node?.kind === nodeKind),
  );
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
  const seeds = ranked
    .filter((item) => item.score >= Math.max(55, maximum - 15))
    .slice(0, 8)
    .map((item) => item.node);
  const seedIds = new Set(seeds.map((node) => node.id));

  const lines: string[] = ['# Agent Context Pack', '', `**Requested target:** \`${targetInput}\``, '', ...runtimeContractLines()];
  if (!seeds.length) {
    lines.push(
      '## Resolution',
      '',
      'No high-confidence repository node was found. Refine the target to an exact path, `@asol/*` package, feature, service, route, command, environment key, runtime, or artifact before editing.',
      '',
      '## Read First',
      '',
      '- `docs/README.md`',
      '- `docs/09-agent-knowledge/agent-protocol.md`',
      '- `docs/09-agent-knowledge/runtime-contract.md`',
      '',
    );
    return lines.join('\n');
  }

  const firstEdges = relatedEdges(graph, seedIds, new Set(['belongs-to']));
  const owners = uniqueNodes(
    firstEdges
      .filter((edge) => edge.kind === 'belongs-to' && seedIds.has(edge.from))
      .map((edge) => map.get(edge.to))
      .concat(seeds.filter((node) => ['package', 'feature', 'service', 'domain'].includes(node.kind))),
  );
  const scopeIds = new Set([...seedIds, ...owners.map((node) => node.id)]);
  const expandedIds = boundedStructuralNeighborhood(graph, scopeIds, 2);
  const expandedEdges = relatedEdges(graph, expandedIds);

  const dependencies = uniqueNodes(
    graph.edges
      .filter((edge) => edge.kind === 'imports' && expandedIds.has(edge.from) && !expandedIds.has(edge.to))
      .map((edge) => map.get(edge.to)),
  );
  const consumers = uniqueNodes(
    graph.edges
      .filter((edge) => edge.kind === 'imports' && expandedIds.has(edge.to) && !expandedIds.has(edge.from))
      .map((edge) => map.get(edge.from)),
  );
  const tests = uniqueNodes(
    expandedEdges
      .filter((edge) => edge.kind === 'tests' || edge.kind === 'belongs-to')
      .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
      .filter((node) => node?.kind === 'test'),
  );
  const routes = uniqueNodes(
    expandedEdges
      .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
      .filter((node) => node?.kind === 'route'),
  );
  const services = uniqueNodes(
    [...owners, ...expandedEdges.flatMap((edge) => [map.get(edge.from), map.get(edge.to)])].filter(
      (node) => node?.kind === 'service',
    ),
  );
  const domains = matchingDomains(target, seeds);
  const domainReadFirst = domains
    .flatMap((domain) => domain.readFirst)
    .map((path) => graph.nodes.find((node) => node.kind === 'document' && node.path === path));

  const relatedDocs = uniqueNodes(
    graph.edges
      .filter(
        (edge) =>
          ['references', 'documents', 'related-to', 'belongs-to'].includes(edge.kind) &&
          (expandedIds.has(edge.from) || expandedIds.has(edge.to)),
      )
      .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
      .filter((node) => node?.kind === 'document'),
  );

  const mandatoryPaths = new Set<string>([
    'docs/README.md',
    'docs/09-agent-knowledge/agent-protocol.md',
    'docs/09-agent-knowledge/runtime-contract.md',
  ]);
  if (
    seeds.some((node) => node.kind === 'package' || node.path?.startsWith('packages/')) ||
    owners.some((node) => node.kind === 'package')
  ) {
    mandatoryPaths.add('docs/01-architecture/README.md');
    mandatoryPaths.add('docs/01-architecture/02-packages/module-isolation-rules.md');
  }
  if (seeds.some((node) => node.path?.startsWith('src/app/') || node.path?.startsWith('src/components/'))) {
    mandatoryPaths.add('docs/04-ui-components/touch-interaction-policy.md');
    mandatoryPaths.add('docs/04-ui-components/page-snapshot-system.md');
  }
  if (
    seeds.some((node) =>
      ['android', 'ios', 'static-out'].some(
        (value) => node.name.toLowerCase().includes(value) || node.path?.startsWith(`${value}/`),
      ),
    ) ||
    [...expandedIds].some((id) => ['runtime:android', 'runtime:ios', 'runtime:static-out'].includes(id))
  ) {
    mandatoryPaths.add('docs/07-mobile-and-release/README.md');
  }
  const mandatoryDocs = [...mandatoryPaths].map((path) =>
    graph.nodes.find((node) => node.kind === 'document' && node.path === path),
  );
  const readFirst = uniqueNodes([...mandatoryDocs, ...domainReadFirst, ...relatedDocs]).slice(0, 22);

  const runtimeEvidenceIds = new Set(expandedIds);
  const commands = nodesConnectedByKind(graph, expandedIds, ['invokes'], 'command');
  for (const command of commands) runtimeEvidenceIds.add(command.id);
  const directRuntimes = nodesConnectedByKind(
    graph,
    runtimeEvidenceIds,
    ['affects-runtime', 'targets-runtime'],
    'runtime',
  );
  const coreDirectRuntimes = directRuntimes.filter((node) =>
    CORE_RUNTIME_IDS.some((id) => node.id === `runtime:${id}`),
  );

  const environmentKeys = nodesConnectedByKind(
    graph,
    expandedIds,
    ['uses-environment'],
    'environment-key',
  );
  const configs = uniqueNodes([
    ...nodesConnectedByKind(graph, expandedIds, ['configured-by'], 'config'),
    ...seeds.filter((node) => node.kind === 'config'),
  ]);
  const artifacts = uniqueNodes([
    ...nodesConnectedByKind(graph, runtimeEvidenceIds, ['produces', 'consumes'], 'artifact'),
    ...seeds.filter((node) => node.kind === 'artifact'),
  ]);
  const relatedCommands = uniqueNodes([
    ...commands,
    ...nodesConnectedByKind(graph, expandedIds, ['invokes'], 'command'),
    ...seeds.filter((node) => node.kind === 'command'),
  ]);

  const impact = uniqueNodes(
    expandedEdges
      .flatMap((edge) => [map.get(edge.from), map.get(edge.to)])
      .filter(
        (node) =>
          node &&
          !scopeIds.has(node.id) &&
          !['document', 'test', 'runtime', 'environment-key', 'command', 'artifact'].includes(node.kind),
      ),
  ).slice(0, 35);

  lines.push('## Target', '', ...markdownList(seeds), '');
  if (owners.length) lines.push('## Owners / Scope', '', ...markdownList(owners), '');

  const hasApiHandlers = routes.some((route) => route.summary === 'App Router request handler');
  const hasNativePaths = [...seeds, ...owners].some(
    (node) => node.path?.startsWith('android/') || node.path?.startsWith('ios/') || /capacitor|fastlane|native/i.test(node.name),
  );
  const hasStaticImpact = coreDirectRuntimes.some((node) => node.id === 'runtime:static-out') || !seeds.every((node) => (node.path || '').includes('/dev'));
  const runtimePlan = buildRuntimeTestPlan({
    seeds,
    coreDirectRuntimes,
    routes,
    hasApiHandlers,
    hasNativePaths,
    hasStaticImpact,
  });
  const documentationCoverageWeak =
    relatedDocs.length === 0 ||
    !graph.edges.some(
      (edge) =>
        (expandedIds.has(edge.from) || expandedIds.has(edge.to)) &&
        (edge.kind === 'documents' || edge.kind === 'references'),
    );
  const risk = classifyContextRisk({
    graph,
    seeds,
    expandedIds,
    routes,
    environmentKeys,
    commands: relatedCommands,
    tests,
    owners,
    coreDirectRuntimes,
    isDevOnly: runtimePlan.isDevOnly,
    documentationCoverageWeak,
    runtimeTestGuidanceMissing: runtimePlan.warnings.some((item) => /incomplete|missing/i.test(item)),
  });
  lines.push(...renderRiskSection(risk));
  lines.push(...renderRuntimeTestPlanSection(runtimePlan));

  lines.push(
    '## Target Runtime Footprint',
    '',
    coreDirectRuntimes.length
      ? `Direct graph evidence connects this target to: ${coreDirectRuntimes.map((node) => `**${node.name}**`).join(', ')}.`
      : 'No direct core-runtime edge was resolved for this target. Treat that as an evidence gap, not as proof that a runtime is unaffected.',
    '',
    'Before completion, explicitly decide whether the change is compatible with each of the five mandatory application surfaces and their build/runtime differences.',
    '',
  );
  if (readFirst.length) lines.push('## Read First', '', ...markdownList(readFirst), '');
  if (impact.length) lines.push('## Change Impact', '', ...markdownList(impact), '');
  if (dependencies.length) lines.push('## Dependencies', '', ...markdownList(dependencies.slice(0, 30)), '');
  if (consumers.length) lines.push('## Consumers', '', ...markdownList(consumers.slice(0, 30)), '');
  if (routes.length) lines.push('## Routes', '', ...markdownList(routes.slice(0, 25)), '');
  if (services.length) lines.push('## Services', '', ...markdownList(services), '');
  if (relatedCommands.length) lines.push('## Related Commands', '', ...markdownList(relatedCommands.slice(0, 30)), '');
  if (artifacts.length) lines.push('## Artifacts', '', ...markdownList(artifacts), '');
  if (configs.length) lines.push('## Configuration', '', ...markdownList(configs.slice(0, 20)), '');
  if (environmentKeys.length) lines.push('## Environment Key Names', '', ...markdownList(environmentKeys.slice(0, 40)), '');
  if (tests.length) lines.push('## Tests', '', ...markdownList(tests.slice(0, 35)), '');

  lines.push(
    '## Verification',
    '',
    'Run targeted tests above first, then:',
    '',
    '```bash',
    'npm run typecheck',
    'npm run lint',
    'npm run architecture:check',
    'npm run runtime:check',
    'npm run docs:ci',
    '```',
    '',
    'Use `npm run build` when the task requires the complete server/web release gate. Do **not** run `npm run build:static` merely as a generic check because it overwrites the release `out/` bundle; use the static/native release verification flow only when the task actually affects or authorizes that output. Regenerate knowledge with `npm run docs:generate` (or `npm run architecture:docs`) when graph facts changed.',
    '',
    '## Guardrails',
    '',
    '- Evaluate Development, Web, Static `out/`, Android, and iOS for every change; never assume shared TypeScript is web-only.',
    '- Edit the owning capability; do not introduce a bypass because it is locally convenient.',
    '- Use declared package exports only; never deep-import sealed package internals.',
    '- Preserve browser/server/native/service runtime boundaries.',
    '- Static `out/` contains no App Router API handlers; native shells must reach the configured remote API.',
    '- Android and iOS production shells consume the static `out/` payload and add platform-specific native behavior.',
    '- Keep one responsibility per file.',
    '- Update editable intentional docs when behavior, contracts, architecture, configuration, runtime compatibility, or operations change.',
    '- Protected docs require explicit authorization (`[docs-contract-change]` or `DOCS_CONTRACT_CHANGE=1`); generated docs are overwrite-only and never hand-edited.',
    '- Never put environment values in documentation or generated catalogs.',
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
