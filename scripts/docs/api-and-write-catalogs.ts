import type { KnowledgeGraph, KnowledgeNode } from './model';
import { pathExists, readRepoText, walkFiles } from './fs-scan';
import { runtimeIdsForPath } from './runtime-knowledge';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
const WRITE_GATEWAYS = ['@asol/page-save-core', '@asol/data-core', '@asol/storage-core'] as const;
const WRITE_NAME = /\b(create|update|delete|upload|save|insert|patch|mutate|publish|remove|upsert)\b/i;

export interface ApiContractRow {
  route: string;
  source: string;
  methods: string[];
  runtimeSurfaces: string[];
  auth: string;
  owners: string[];
  writers: string[];
  gateways: string[];
  staticNativeImpact: string;
  envKeys: string[];
  tests: string[];
  requiredRuntimeTests: string[];
  riskNotes: string[];
}

function nodeMap(graph: KnowledgeGraph): Map<string, KnowledgeNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

function extractMethods(content: string): string[] {
  const found = new Set<string>();
  for (const method of HTTP_METHODS) {
    const re = new RegExp(`export\\s+async\\s+function\\s+${method}\\b|export\\s+function\\s+${method}\\b|export\\s+const\\s+${method}\\b`);
    if (re.test(content)) found.add(method);
  }
  return [...found].sort();
}

function detectAuth(content: string): string {
  if (/requireAuth|assertAuth|getSession|authorization|bearer|authRequired/i.test(content)) return 'likely-required';
  if (/public|noAuth|allowAnonymous/i.test(content)) return 'likely-public';
  return 'unknown';
}

function collectImportClosure(graph: KnowledgeGraph, startId: string, depth = 3): Set<string> {
  const visited = new Set<string>([startId]);
  let frontier = new Set<string>([startId]);
  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.kind !== 'imports' || !frontier.has(edge.from) || visited.has(edge.to)) continue;
      visited.add(edge.to);
      next.add(edge.to);
    }
    frontier = next;
    if (!frontier.size) break;
  }
  return visited;
}

export function buildApiContractCatalog(graph: KnowledgeGraph): ApiContractRow[] {
  const map = nodeMap(graph);
  const rows: ApiContractRow[] = [];
  for (const route of graph.nodes.filter((node) => node.kind === 'route' && node.summary === 'App Router request handler')) {
    const source = route.path || '';
    const content = source && pathExists(source) ? readRepoText(source) : '';
    const methods = extractMethods(content);
    const owners = graph.edges
      .filter((edge) => edge.from === route.id && edge.kind === 'related-to')
      .map((edge) => map.get(edge.to))
      .filter((node): node is KnowledgeNode => Boolean(node))
      .filter((node) => ['package', 'feature', 'service'].includes(node.kind))
      .map((node) => node.name);

    const sourceNode = graph.nodes.find((node) => node.kind === 'source' && node.path === source);
    const closure = sourceNode ? collectImportClosure(graph, sourceNode.id, 4) : new Set<string>();
    const gateways = new Set<string>();
    const writers = new Set<string>();
    for (const id of closure) {
      const node = map.get(id);
      if (!node) continue;
      for (const gateway of WRITE_GATEWAYS) {
        if (node.name === gateway || node.name.startsWith(`${gateway}/`) || (node.path || '').includes(gateway.replace('@asol/', 'packages/'))) {
          gateways.add(gateway);
        }
      }
      if (WRITE_NAME.test(node.name) || WRITE_NAME.test(node.summary || '')) writers.add(node.path || node.name);
    }
    for (const edge of graph.edges) {
      if (!sourceNode || edge.from !== sourceNode.id || edge.kind !== 'imports') continue;
      for (const gateway of WRITE_GATEWAYS) {
        if (edge.detail?.includes(gateway)) gateways.add(gateway);
      }
    }

    const envKeys = graph.edges
      .filter((edge) => edge.kind === 'uses-environment' && (edge.from === route.id || (sourceNode && edge.from === sourceNode.id)))
      .map((edge) => map.get(edge.to)?.name)
      .filter((name): name is string => Boolean(name));

    const tests = graph.nodes
      .filter((node) => node.kind === 'test' && (node.path || '').includes(route.name.replace(/\W+/g, '')))
      .map((node) => node.path || node.name)
      .slice(0, 8);

    const runtimeSurfaces = graph.edges
      .filter((edge) => edge.from === route.id && edge.kind === 'affects-runtime')
      .map((edge) => map.get(edge.to)?.name)
      .filter((name): name is string => Boolean(name));

    const riskNotes: string[] = [];
    if (!methods.length) riskNotes.push('HTTP methods not detected from exports');
    if (detectAuth(content) === 'unknown') riskNotes.push('auth requirement unknown');
    if (!owners.length) riskNotes.push('owner mapping incomplete');
    if (!gateways.size && WRITE_NAME.test(content)) riskNotes.push('write-like route without proven gateway import');

    rows.push({
      route: route.name,
      source,
      methods,
      runtimeSurfaces,
      auth: detectAuth(content),
      owners: [...new Set(owners)].sort(),
      writers: [...writers].sort().slice(0, 12),
      gateways: [...gateways].sort(),
      staticNativeImpact: 'Handlers are not bundled into out/; static/native clients need remote API boundary',
      envKeys: [...new Set(envKeys)].sort(),
      tests,
      requiredRuntimeTests: [
        'npm run runtime:check:web',
        'npm run runtime:check:static',
        'npm run runtime:check:dev',
      ],
      riskNotes,
    });
  }
  return rows.sort((a, b) => a.route.localeCompare(b.route));
}

export function renderApiContractCatalog(graph: KnowledgeGraph): string {
  const rows = buildApiContractCatalog(graph);
  const banner = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->
`;
  const lines = [
    banner,
    '# API Contract Catalog',
    '',
    `Handlers: **${rows.length}**`,
    '',
    '| Route | Source | Methods | Auth | Owners | Gateways | Runtime | Static/native impact | Risk notes |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    lines.push(
      `| \`${row.route}\` | \`${row.source}\` | ${row.methods.join(', ') || 'unknown'} | ${row.auth} | ${row.owners.map((item) => `\`${item}\``).join(', ') || 'unknown'} | ${row.gateways.map((item) => `\`${item}\``).join(', ') || 'none-detected'} | ${row.runtimeSurfaces.join(', ') || 'unknown'} | ${row.staticNativeImpact} | ${row.riskNotes.join('; ') || 'none'} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export interface WriteSurfaceRow {
  sourcePath: string;
  owner: string;
  operationType: string;
  targetGateway: string;
  passesThroughGateway: boolean;
  relatedRoute: string;
  runtimeSurfaces: string[];
  requiredRuntimeTests: string[];
  riskLevel: string;
}

export function buildWriteSurfaceMap(graph: KnowledgeGraph): WriteSurfaceRow[] {
  const map = nodeMap(graph);
  const rows: WriteSurfaceRow[] = [];
  const sourceFiles = walkFiles('src', (path) => /\.(ts|tsx|js|jsx)$/.test(path)).concat(
    walkFiles('packages', (path) => /\.(ts|tsx|js|jsx)$/.test(path)),
  );

  for (const path of sourceFiles) {
    let content = '';
    try {
      content = readRepoText(path);
    } catch {
      continue;
    }
    if (!WRITE_NAME.test(content) && !WRITE_GATEWAYS.some((gateway) => content.includes(gateway))) continue;
    if (!/\b(create|update|delete|upload|save|insert|patch|mutate|publish)\s*\(/.test(content) && !WRITE_GATEWAYS.some((g) => content.includes(g))) {
      continue;
    }

    const operationMatches = content.match(/\b(create|update|delete|upload|save|insert|patch|mutate|publish)\b/gi) || [];
    const operationType = [...new Set(operationMatches.map((item) => item.toLowerCase()))].sort().join(', ') || 'write-like';
    const gateways = WRITE_GATEWAYS.filter((gateway) => content.includes(gateway));
    const sourceNode = graph.nodes.find((node) => node.path === path);
    const owner =
      graph.edges
        .filter((edge) => sourceNode && edge.from === sourceNode.id && edge.kind === 'belongs-to')
        .map((edge) => map.get(edge.to)?.name)
        .find(Boolean) || 'unknown';
    const relatedRoute =
      graph.nodes.find((node) => node.kind === 'route' && node.path === path)?.name ||
      graph.edges
        .filter((edge) => sourceNode && edge.to === sourceNode.id && edge.kind === 'contains')
        .map((edge) => map.get(edge.from))
        .find((node) => node?.kind === 'route')?.name ||
      '';
    const runtimeSurfaces = runtimeIdsForPath(path, content);
    const passes = gateways.length > 0;
    rows.push({
      sourcePath: path,
      owner,
      operationType,
      targetGateway: gateways.join(', ') || 'unproven',
      passesThroughGateway: passes,
      relatedRoute,
      runtimeSurfaces,
      requiredRuntimeTests: ['npm run runtime:check', 'npm run runtime:check:web', 'npm run runtime:check:static'],
      riskLevel: passes ? 'medium' : 'high',
    });
  }

  return rows
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
    .slice(0, 800);
}

export function renderWriteSurfaceMap(graph: KnowledgeGraph): string {
  const rows = buildWriteSurfaceMap(graph);
  const unproven = rows.filter((row) => !row.passesThroughGateway).length;
  const banner = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->
`;
  const lines = [
    banner,
    '# Write Surface Map',
    '',
    `Detected write-like surfaces: **${rows.length}**`,
    `Unproven gateway paths: **${unproven}**`,
    '',
    '| Source | Owner | Operations | Gateway | Proven | Route | Runtimes | Risk |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    lines.push(
      `| \`${row.sourcePath}\` | \`${row.owner}\` | ${row.operationType} | \`${row.targetGateway}\` | ${row.passesThroughGateway ? 'yes' : 'NO'} | \`${row.relatedRoute || ''}\` | ${row.runtimeSurfaces.join(', ')} | ${row.riskLevel} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}
