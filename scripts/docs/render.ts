import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from './model';

const GENERATED_BANNER = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.\n     Source: live repository graph built by scripts/docs/.\n     Regenerate: npm run architecture:docs\n     Validate: npm run architecture:check -->\n`;

function cell(value: string | undefined): string {
  return (value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
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
  return [...ids].map((linked) => map.get(linked)).filter((node): node is KnowledgeNode => Boolean(node)).sort((a, b) => a.id.localeCompare(b.id));
}

export function renderRepositoryCatalog(graph: KnowledgeGraph): string {
  const counts = new Map<string, number>();
  for (const node of graph.nodes) counts.set(node.kind, (counts.get(node.kind) || 0) + 1);
  const lines = [GENERATED_BANNER, '# Repository Catalog', '', '## Inventory', '', '| Kind | Count |', '|---|---:|'];
  for (const [kind, count] of [...counts.entries()].sort()) lines.push(`| ${kind} | ${count} |`);

  for (const kind of ['package', 'feature', 'service'] as const) {
    lines.push('', `## ${kind[0].toUpperCase()}${kind.slice(1)}s`, '', '| Name | Path | Summary |', '|---|---|---|');
    for (const node of byKind(graph, kind)) lines.push(`| ${cell(node.name)} | \`${cell(node.path)}\` | ${cell(node.summary)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderDocumentCatalog(graph: KnowledgeGraph): string {
  const lines = [GENERATED_BANNER, '# Document Catalog', '', 'Searchable inventory of hand-written and generated-entry Markdown documents.', '', '| Document | Path | Summary |', '|---|---|---|'];
  for (const node of byKind(graph, 'document')) {
    lines.push(`| ${cell(node.name)} | \`${cell(node.path)}\` | ${cell(node.summary)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderRouteCatalog(graph: KnowledgeGraph): string {
  const map = nodeMap(graph);
  const lines = [GENERATED_BANNER, '# Route Catalog', '', 'Routes are derived from `src/app/**/page.*` and `src/app/**/route.*`. Route groups and parallel slots are removed from URL identity.', '', '| Route | Source | Related Owner |', '|---|---|---|'];
  for (const route of byKind(graph, 'route')) {
    const ownerEdge = graph.edges.find((edge) => edge.from === route.id && edge.kind === 'belongs-to');
    const owner = ownerEdge ? map.get(ownerEdge.to) : undefined;
    lines.push(`| \`${cell(route.name)}\` | \`${cell(route.path)}\` | ${owner ? `\`${cell(owner.name)}\`` : ''} |`);
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
    'Direct relational impact only. Use `npx tsx scripts/docs/context.ts <target>` for task-specific expansion.',
    '',
    '| Subject | Kind | Docs | Tests | Routes | Direct imports in | Direct imports out |',
    '|---|---|---:|---:|---:|---:|---:|',
  ];

  for (const subject of subjects) {
    const linked = linkedNodes(graph, subject.id, ['belongs-to', 'tests', 'references', 'documents', 'related-to']);
    const relationship = edgesFor(graph, subject.id);
    const docs = linked.filter((node) => node.kind === 'document').length;
    const tests = linked.filter((node) => node.kind === 'test').length;
    const routes = linked.filter((node) => node.kind === 'route').length;
    const importsIn = relationship.incoming.filter((edge) => edge.kind === 'imports' && map.has(edge.from)).length;
    const importsOut = relationship.outgoing.filter((edge) => edge.kind === 'imports' && map.has(edge.to)).length;
    lines.push(`| \`${cell(subject.name)}\` | ${subject.kind} | ${docs} | ${tests} | ${routes} | ${importsIn} | ${importsOut} |`);
  }
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
  return `${JSON.stringify({ version: 1, entries: index }, null, 2)}\n`;
}
