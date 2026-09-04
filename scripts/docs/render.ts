import { posix } from 'node:path';

import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from './model';

/** Where every generated catalog is written. Relative links are rebased onto it. */
const CATALOG_DIRECTORY = 'docs/09-agent-knowledge/generated/catalogs';

const GENERATED_BANNER = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.\n     Source: live repository graph built by scripts/docs/.\n     Regenerate: npm run docs:generate\n     Validate: npm run docs:ci -->\n`;

function cell(value: string | undefined): string {
  return (value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/**
 * Rebase a document's own relative links onto the catalog's directory.
 *
 * A summary is copied verbatim out of the document it describes, and its links
 * are relative to *that* file. The catalog sits at a different depth, so
 * `../08-reference/capability-map.md` — correct inside
 * `docs/01-architecture/02-packages/` — pointed at a path that does not exist
 * once it landed in the catalog. Every such link in the catalog was broken.
 *
 * Resolving against the source directory and re-relativising against the
 * catalog keeps the link pointing at the same file. Absolute, protocol and
 * bare-anchor hrefs are left alone: they do not depend on where they are read.
 */
function relinkSummary(summary: string | undefined, sourcePath: string | undefined): string {
  if (!summary || !sourcePath) return summary || '';
  const sourceDirectory = posix.dirname(sourcePath);
  return summary.replace(/\]\(([^)\s]+)\)/g, (whole, href: string) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return whole;
    const [target, anchor] = href.split('#');
    if (!target) return whole;
    const resolved = posix.normalize(posix.join(sourceDirectory, target));
    const rebased = posix.relative(CATALOG_DIRECTORY, resolved);
    return `](${rebased}${anchor ? `#${anchor}` : ''})`;
  });
}

function byKind(graph: KnowledgeGraph, kind: KnowledgeNode['kind']): KnowledgeNode[] {
  return graph.nodes.filter((node) => node.kind === kind);
}

function edgesFor(graph: KnowledgeGraph, id: string): { outgoing: KnowledgeEdge[]; incoming: KnowledgeEdge[] } {
  return {
    outgoing: graph.edges.filter((edge) => edge.from === id),
    incoming: graph.edges.filter((edge) => edge.to === id),
  };
}

function nodeMap(graph: KnowledgeGraph): Map<string, KnowledgeNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function linkedNodes(graph: KnowledgeGraph, id: string, kinds: KnowledgeEdge['kind'][]): KnowledgeNode[] {
  const map = nodeMap(graph);
  const ids = new Set<string>();
  for (const edge of graph.edges) {
    if (!kinds.includes(edge.kind)) continue;
    if (edge.from === id) ids.add(edge.to);
    if (edge.to === id) ids.add(edge.from);
  }
  return [...ids]
    .map((linked) => map.get(linked))
    .filter((node): node is KnowledgeNode => Boolean(node))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function nodeLabel(node: KnowledgeNode | undefined): string {
  if (!node) return '';
  return node.path ? `\`${cell(node.path)}\`` : `\`${cell(node.name)}\``;
}

export function renderRepositoryCatalog(graph: KnowledgeGraph): string {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) counts.set(node.kind, (counts.get(node.kind) || 0) + 1);
  const lines = [GENERATED_BANNER, '# Repository Catalog', '', '## Inventory', '', '| Kind | Count |', '|---|---:|'];
  for (const [kind, count] of [...counts.entries()].sort()) lines.push(`| ${kind} | ${count} |`);

  for (const kind of ['domain', 'package', 'feature', 'service', 'runtime', 'artifact'] as const) {
    lines.push('', `## ${kind[0].toUpperCase()}${kind.slice(1)}s`, '', '| Name | Path | Summary |', '|---|---|---|');
    for (const node of byKind(graph, kind)) lines.push(`| ${cell(node.name)} | \`${cell(node.path)}\` | ${cell(node.summary)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderDocumentCatalog(graph: KnowledgeGraph): string {
  const lines = [GENERATED_BANNER, '# Document Catalog', '', 'Searchable inventory of hand-written and generated-entry Markdown documents.', '', '| Document | Path | Summary |', '|---|---|---|'];
  for (const node of byKind(graph, 'document')) {
    lines.push(
      `| ${cell(node.name)} | \`${cell(node.path)}\` | ${cell(relinkSummary(node.summary, node.path))} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function renderRouteCatalog(graph: KnowledgeGraph): string {
  const map = nodeMap(graph);
  const lines = [GENERATED_BANNER, '# Route Catalog', '', 'Routes are derived from `src/app/**/page.*` and `src/app/**/route.*`. Route groups and parallel slots are removed from URL identity.', '', '| Route | Source | Related owners | Runtime surfaces |', '|---|---|---|---|'];
  for (const route of byKind(graph, 'route')) {
    const owners = graph.edges
      .filter((edge) => edge.from === route.id && (edge.kind === 'belongs-to' || edge.kind === 'related-to'))
      .map((edge) => map.get(edge.to))
      .filter((node): node is KnowledgeNode => node !== undefined)
      .filter((node) => ['package', 'feature', 'service'].includes(node.kind));
    const runtimes = graph.edges
      .filter((edge) => edge.from === route.id && edge.kind === 'affects-runtime')
      .map((edge) => map.get(edge.to)?.name)
      .filter((value): value is string => Boolean(value));
    lines.push(`| \`${cell(route.name)}\` | \`${cell(route.path)}\` | ${owners.map((owner) => `\`${cell(owner.name)}\``).join(', ')} | ${runtimes.map((runtime) => `\`${cell(runtime)}\``).join(', ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderChangeImpactIndex(graph: KnowledgeGraph): string {
  const map = nodeMap(graph);
  const subjects = graph.nodes.filter((node) => ['package', 'feature', 'service'].includes(node.kind));
  const lines = [
    GENERATED_BANNER,
    '# Change Impact Index',
    '',
    'Owner-level dependency edges are aggregated from live source imports. Use `npx tsx scripts/docs/context.ts <target>` for task-specific expansion.',
    '',
    '| Subject | Kind | Docs | Tests | Routes | Runtime surfaces | Imports in | Imports out |',
    '|---|---|---:|---:|---:|---:|---:|---:|',
  ];

  for (const subject of subjects) {
    const linked = linkedNodes(graph, subject.id, ['belongs-to', 'tests', 'references', 'documents', 'related-to', 'affects-runtime']);
    const relationship = edgesFor(graph, subject.id);
    const docs = linked.filter((node) => node.kind === 'document').length;
    const tests = linked.filter((node) => node.kind === 'test').length;
    const routes = linked.filter((node) => node.kind === 'route').length;
    const runtimes = linked.filter((node) => node.kind === 'runtime').length;
    const importsIn = relationship.incoming.filter((edge) => edge.kind === 'imports' && map.has(edge.from)).length;
    const importsOut = relationship.outgoing.filter((edge) => edge.kind === 'imports' && map.has(edge.to)).length;
    lines.push(`| \`${cell(subject.name)}\` | ${subject.kind} | ${docs} | ${tests} | ${routes} | ${runtimes} | ${importsIn} | ${importsOut} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderRuntimeCatalog(graph: KnowledgeGraph): string {
  const map = nodeMap(graph);
  const lines = [
    GENERATED_BANNER,
    '# Runtime and Artifact Catalog',
    '',
    'The project has five mandatory application surfaces — Development, Web, Static out, Android, and iOS — plus service/tooling execution contexts. Every change must evaluate the five application surfaces even when only some are directly mapped.',
    '',
    '| Runtime | Summary | Commands | Config | Consumed artifacts | Directly mapped source nodes |',
    '|---|---|---:|---:|---:|---:|',
  ];
  for (const runtime of byKind(graph, 'runtime')) {
    const relationship = edgesFor(graph, runtime.id);
    const commands = relationship.incoming.filter((edge) => edge.kind === 'targets-runtime' && map.get(edge.from)?.kind === 'command').length;
    const configs = relationship.outgoing.filter((edge) => edge.kind === 'configured-by' && map.get(edge.to)?.kind === 'config').length;
    const artifacts = relationship.outgoing.filter((edge) => edge.kind === 'consumes' && map.get(edge.to)?.kind === 'artifact').length;
    const sources = relationship.incoming.filter((edge) => edge.kind === 'affects-runtime' && ['source', 'script', 'route'].includes(map.get(edge.from)?.kind ?? '')).length;
    lines.push(`| ${cell(runtime.name)} | ${cell(runtime.summary)} | ${commands} | ${configs} | ${artifacts} | ${sources} |`);
  }

  lines.push('', '## Artifact Topology', '', '| Artifact | Path | Producers | Consumers |', '|---|---|---|---|');
  for (const artifact of byKind(graph, 'artifact')) {
    const relationship = edgesFor(graph, artifact.id);
    const producers = relationship.incoming
      .filter((edge) => edge.kind === 'produces')
      .map((edge) => map.get(edge.from))
      .filter((node): node is KnowledgeNode => Boolean(node));
    const consumers = relationship.incoming
      .filter((edge) => edge.kind === 'consumes')
      .map((edge) => map.get(edge.from))
      .filter((node): node is KnowledgeNode => Boolean(node));
    lines.push(`| ${cell(artifact.name)} | \`${cell(artifact.path)}\` | ${producers.map(nodeLabel).join(', ')} | ${consumers.map((node) => `\`${cell(node.name)}\``).join(', ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderCommandCatalog(graph: KnowledgeGraph): string {
  const map = nodeMap(graph);
  const lines = [
    GENERATED_BANNER,
    '# Command Relationship Catalog',
    '',
    'Root npm scripts as graph nodes. Raw environment assignment values are intentionally not stored here.',
    '',
    '| Command | Runtime targets | Invokes | Produces | Environment keys |',
    '|---|---|---:|---|---:|',
  ];
  for (const command of byKind(graph, 'command')) {
    const relationship = edgesFor(graph, command.id);
    const runtimes = relationship.outgoing
      .filter((edge) => edge.kind === 'targets-runtime')
      .map((edge) => map.get(edge.to)?.name)
      .filter((value): value is string => Boolean(value));
    const invokes = relationship.outgoing.filter((edge) => edge.kind === 'invokes').length;
    const produces = relationship.outgoing
      .filter((edge) => edge.kind === 'produces')
      .map((edge) => map.get(edge.to)?.name)
      .filter((value): value is string => Boolean(value));
    const envKeys = relationship.outgoing.filter((edge) => edge.kind === 'uses-environment').length;
    lines.push(`| \`${cell(command.name)}\` | ${runtimes.map((runtime) => `\`${cell(runtime)}\``).join(', ')} | ${invokes} | ${produces.map((artifact) => `\`${cell(artifact)}\``).join(', ')} | ${envKeys} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderEnvironmentCatalog(graph: KnowledgeGraph): string {
  const map = nodeMap(graph);
  const lines = [
    GENERATED_BANNER,
    '# Environment Usage Catalog',
    '',
    'Key names only. No environment value is stored in the graph or this catalog.',
    '',
    '| Key | Visibility | Direct consumers | Example consumer paths/commands |',
    '|---|---|---:|---|',
  ];
  for (const environment of byKind(graph, 'environment-key')) {
    const consumers = edgesFor(graph, environment.id).incoming
      .filter((edge) => edge.kind === 'uses-environment')
      .map((edge) => map.get(edge.from))
      .filter((node): node is KnowledgeNode => Boolean(node));
    const examples = consumers.slice(0, 6).map(nodeLabel).join(', ');
    lines.push(`| \`${cell(environment.name)}\` | ${environment.name.startsWith('NEXT_PUBLIC_') ? 'client-visible' : 'server/tooling'} | ${consumers.length} | ${examples} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderGraphHealth(graph: KnowledgeGraph): string {
  const map = nodeMap(graph);
  const nodeCounts = new Map<string, number>();
  const edgeCounts = new Map<string, number>();
  for (const node of graph.nodes) nodeCounts.set(node.kind, (nodeCounts.get(node.kind) ?? 0) + 1);
  for (const edge of graph.edges) edgeCounts.set(edge.kind, (edgeCounts.get(edge.kind) ?? 0) + 1);
  const dangling = graph.edges.filter((edge) => !map.has(edge.from) || !map.has(edge.to));
  const owners = graph.nodes.filter((node) => ['package', 'feature', 'service'].includes(node.kind));
  const ownersWithDependencies = owners.filter((owner) => graph.edges.some((edge) => edge.kind === 'imports' && (edge.from === owner.id || edge.to === owner.id)));
  const coreRuntimeNames = ['Development', 'Web', 'Static out', 'Android', 'iOS'];
  const coreRuntimes = byKind(graph, 'runtime').filter((node) => coreRuntimeNames.includes(node.name));

  const lines = [
    GENERATED_BANNER,
    '# Knowledge Graph Health',
    '',
    '| Metric | Value |',
    '|---|---:|',
    `| Graph version | ${graph.version} |`,
    `| Nodes | ${graph.nodes.length} |`,
    `| Edges | ${graph.edges.length} |`,
    `| Dangling edges | ${dangling.length} |`,
    `| Owner nodes with dependency relationships | ${ownersWithDependencies.length} / ${owners.length} |`,
    `| Mandatory application runtime nodes | ${coreRuntimes.length} / 5 |`,
    '',
    '## Nodes by Kind',
    '',
    '| Kind | Count |',
    '|---|---:|',
  ];
  for (const [kind, count] of [...nodeCounts.entries()].sort()) lines.push(`| ${kind} | ${count} |`);
  lines.push('', '## Edges by Kind', '', '| Kind | Count |', '|---|---:|');
  for (const [kind, count] of [...edgeCounts.entries()].sort()) lines.push(`| ${kind} | ${count} |`);
  lines.push('');
  return lines.join('\n');
}

export function renderKnowledgeGraphJson(graph: KnowledgeGraph): string {
  return `${JSON.stringify(graph, null, 2)}\n`;
}

export function renderSearchIndexJson(graph: KnowledgeGraph): string {
  const index = graph.nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    name: node.name,
    path: node.path,
    summary: node.summary,
    tags: node.tags,
  }));
  return `${JSON.stringify({ version: 2, entries: index }, null, 2)}\n`;
}
