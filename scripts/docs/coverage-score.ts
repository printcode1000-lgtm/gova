import type { KnowledgeGraph, KnowledgeNode } from './model';

export interface CoverageScoreRow {
  ownerPath: string;
  ownerKind: string;
  hasOwner: boolean;
  hasDocs: boolean;
  hasTests: boolean;
  hasRuntimeFootprint: boolean;
  hasConsumers: boolean;
  hasDependencies: boolean;
  hasCommandsOrConfigOrEnv: boolean;
  hasRuntimeCompatibilityGuidance: boolean;
  scorePercent: number;
}

function linked(
  graph: KnowledgeGraph,
  id: string,
  kinds: string[],
  direction: 'from' | 'to' | 'both' = 'both',
): KnowledgeNode[] {
  const map = new Map(graph.nodes.map((node) => [node.id, node]));
  const ids = new Set<string>();
  for (const edge of graph.edges) {
    if (!kinds.includes(edge.kind)) continue;
    if ((direction === 'from' || direction === 'both') && edge.from === id) ids.add(edge.to);
    if ((direction === 'to' || direction === 'both') && edge.to === id) ids.add(edge.from);
  }
  return [...ids].map((item) => map.get(item)).filter((node): node is KnowledgeNode => Boolean(node));
}

export function buildDocCoverageScore(graph: KnowledgeGraph): CoverageScoreRow[] {
  const owners = graph.nodes.filter((node) => ['package', 'feature', 'service'].includes(node.kind));
  const rows: CoverageScoreRow[] = [];

  for (const owner of owners) {
    const docs = linked(graph, owner.id, ['documents', 'references', 'related-to', 'belongs-to']).filter(
      (node) => node.kind === 'document',
    );
    const tests = linked(graph, owner.id, ['tests', 'belongs-to']).filter((node) => node.kind === 'test');
    const runtimes = linked(graph, owner.id, ['affects-runtime', 'targets-runtime']).filter((node) => node.kind === 'runtime');
    const dependencies = linked(graph, owner.id, ['imports'], 'from');
    const consumers = linked(graph, owner.id, ['imports'], 'to');
    const commands = linked(graph, owner.id, ['invokes', 'related-to']).filter((node) => node.kind === 'command');
    const configs = linked(graph, owner.id, ['configured-by', 'related-to']).filter((node) => node.kind === 'config');
    const envs = linked(graph, owner.id, ['uses-environment']).filter((node) => node.kind === 'environment-key');

    const flags = {
      hasOwner: true,
      hasDocs: docs.length > 0,
      hasTests: tests.length > 0,
      hasRuntimeFootprint: runtimes.length > 0,
      hasConsumers: consumers.length > 0,
      hasDependencies: dependencies.length > 0,
      hasCommandsOrConfigOrEnv: commands.length + configs.length + envs.length > 0,
      hasRuntimeCompatibilityGuidance: runtimes.length > 0 || Boolean(owner.path?.startsWith('src/features/dev-')),
    };
    const values = Object.values(flags);
    const scorePercent = Math.round((values.filter(Boolean).length / values.length) * 100);
    rows.push({
      ownerPath: owner.path || owner.name,
      ownerKind: owner.kind,
      ...flags,
      scorePercent,
    });
  }

  return rows.sort((a, b) => a.scorePercent - b.scorePercent || a.ownerPath.localeCompare(b.ownerPath));
}

export function renderDocCoverageScore(graph: KnowledgeGraph): string {
  const rows = buildDocCoverageScore(graph);
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.scorePercent, 0) / rows.length) : 0;
  const weak = rows.filter((row) => row.scorePercent < 70);
  const banner = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->
`;
  const lines = [
    banner,
    '# Doc Coverage Score',
    '',
    `Owners scored: **${rows.length}**`,
    `Average coverage: **${average}%**`,
    `Weak owners (<70%): **${weak.length}**`,
    '',
    '| Owner | Kind | Owner | Docs | Tests | Runtime | Consumers | Dependencies | Cmd/Cfg/Env | Runtime tests | Score |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const row of rows) {
    const yn = (value: boolean) => (value ? 'yes' : 'NO');
    lines.push(
      `| \`${row.ownerPath.replace(/\|/g, '\\|')}\` | ${row.ownerKind} | ${yn(row.hasOwner)} | ${yn(row.hasDocs)} | ${yn(row.hasTests)} | ${yn(row.hasRuntimeFootprint)} | ${yn(row.hasConsumers)} | ${yn(row.hasDependencies)} | ${yn(row.hasCommandsOrConfigOrEnv)} | ${yn(row.hasRuntimeCompatibilityGuidance)} | ${row.scorePercent}% |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}
