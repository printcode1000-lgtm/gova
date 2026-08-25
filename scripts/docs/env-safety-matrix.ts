import type { KnowledgeGraph, KnowledgeNode } from './model';

export interface EnvSafetyRow {
  key: string;
  visibility: 'server-only' | 'client-visible' | 'unknown';
  consumers: string[];
  commandUsage: string[];
  staticNative: 'allowed' | 'dangerous' | 'unknown';
  relevance: string[];
  classification: string;
  requiredRuntimeChecks: string[];
}

function nodeMap(graph: KnowledgeGraph): Map<string, KnowledgeNode> {
  return new Map(graph.nodes.map((node) => [node.id, node]));
}

export function buildEnvSafetyMatrix(graph: KnowledgeGraph): EnvSafetyRow[] {
  const map = nodeMap(graph);
  const rows: EnvSafetyRow[] = [];
  for (const keyNode of graph.nodes.filter((node) => node.kind === 'environment-key')) {
    const consumers = graph.edges
      .filter((edge) => edge.kind === 'uses-environment' && edge.to === keyNode.id)
      .map((edge) => map.get(edge.from))
      .filter((node): node is KnowledgeNode => Boolean(node));
    const consumerPaths = consumers.map((node) => node.path || node.name).sort();
    const commandUsage = consumers.filter((node) => node.kind === 'command').map((node) => node.name).sort();
    const visibility = keyNode.name.startsWith('NEXT_PUBLIC_') ? 'client-visible' : 'server-only';
    const relevance: string[] = [];
    if (/VERCEL|TURSO|DATABASE|LIBSQL/i.test(keyNode.name)) relevance.push('vercel/database');
    if (/R2|S3|AWS|BUCKET/i.test(keyNode.name)) relevance.push('object-storage');
    if (/CAPACITOR|ANDROID|IOS|FASTLANE|APPLE|GOOGLE_PLAY/i.test(keyNode.name)) relevance.push('native/fastlane');
    if (/CURSOR|CLOUD_AGENT/i.test(keyNode.name)) relevance.push('cloud-agent');
    if (/OTA|RELEASE/i.test(keyNode.name)) relevance.push('ota/release');

    let staticNative: EnvSafetyRow['staticNative'] = 'unknown';
    if (visibility === 'client-visible') staticNative = 'allowed';
    if (visibility === 'server-only' && /SECRET|TOKEN|PASSWORD|PRIVATE|KEY$/i.test(keyNode.name)) staticNative = 'dangerous';
    if (visibility === 'server-only' && consumerPaths.some((path) => path.startsWith('src/') && !path.includes('server') && !path.includes('/api/'))) {
      staticNative = 'dangerous';
    }

    const classification =
      consumers.length === 0
        ? 'missing/unknown consumers'
        : staticNative === 'dangerous'
          ? 'dangerous-for-static-native-if-leaked'
          : visibility;

    rows.push({
      key: keyNode.name,
      visibility,
      consumers: consumerPaths.slice(0, 12),
      commandUsage,
      staticNative,
      relevance: relevance.length ? relevance : ['unclassified'],
      classification,
      requiredRuntimeChecks:
        staticNative === 'dangerous'
          ? ['npm run runtime:check:static', 'npm run runtime:check:web', 'npm run docs:ci']
          : ['npm run runtime:check:changed'],
    });
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

export function renderEnvSafetyMatrix(graph: KnowledgeGraph): string {
  const rows = buildEnvSafetyMatrix(graph);
  const banner = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->
`;
  const lines = [
    banner,
    '# Env Safety Matrix',
    '',
    'Key **names only**. Values are never emitted. Command assignments are redacted elsewhere in generated catalogs.',
    '',
    `Keys: **${rows.length}**`,
    '',
    '| Key | Visibility | Static/native | Consumers (sample) | Relevance | Classification | Runtime checks |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const row of rows) {
    lines.push(
      `| \`${row.key}\` | ${row.visibility} | ${row.staticNative} | ${row.consumers.map((item) => `\`${item}\``).join(', ') || 'none'} | ${row.relevance.join(', ')} | ${row.classification} | ${row.requiredRuntimeChecks.join(', ')} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export function envSafetyValidationErrors(graph: KnowledgeGraph): string[] {
  const errors: string[] = [];
  for (const node of graph.nodes.filter((item) => item.kind === 'environment-key')) {
    if (/=/.test(node.name) || /\s/.test(node.name)) {
      errors.push(`environment key node appears to include a value or spaces: ${node.name}`);
    }
  }
  return errors;
}
