import type { KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from './model';

export type RiskLevel = 'low' | 'medium' | 'high' | 'release-critical';

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
  summary: string;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function hasWriteGateway(graph: KnowledgeGraph, ids: Set<string>): boolean {
  return graph.edges.some(
    (edge) =>
      ids.has(edge.from) &&
      edge.kind === 'imports' &&
      (edge.detail?.includes('@asol/page-save-core') ||
        edge.detail?.includes('@asol/data-core') ||
        edge.detail?.includes('@asol/storage-core') ||
        graph.nodes.find((node) => node.id === edge.to)?.name.startsWith('@asol/page-save-core') ||
        graph.nodes.find((node) => node.id === edge.to)?.name.startsWith('@asol/data-core') ||
        graph.nodes.find((node) => node.id === edge.to)?.name.startsWith('@asol/storage-core')),
  );
}

export function classifyContextRisk(input: {
  graph: KnowledgeGraph;
  seeds: KnowledgeNode[];
  expandedIds: Set<string>;
  routes: KnowledgeNode[];
  environmentKeys: KnowledgeNode[];
  commands: KnowledgeNode[];
  tests: KnowledgeNode[];
  owners: KnowledgeNode[];
  coreDirectRuntimes: KnowledgeNode[];
  isDevOnly: boolean;
  documentationCoverageWeak: boolean;
  runtimeTestGuidanceMissing: boolean;
}): RiskAssessment {
  const reasons: string[] = [];
  const { seeds, expandedIds, routes, environmentKeys, commands, tests, owners, graph } = input;

  const handlers = routes.filter((route) => route.summary === 'App Router request handler');
  if (handlers.length) reasons.push(`touches ${handlers.length} App Router API handler(s)`);

  const authish = [...seeds, ...routes, ...owners].some((node) =>
    /auth|token|password|secret|session|permission/i.test(`${node.name} ${node.path || ''} ${node.summary || ''}`),
  );
  if (authish) reasons.push('auth/security-sensitive naming or ownership evidence');

  if (environmentKeys.length) reasons.push(`uses ${environmentKeys.length} environment key name(s)`);

  const native = [...seeds, ...input.coreDirectRuntimes].some(
    (node) =>
      node.path?.startsWith('android/') ||
      node.path?.startsWith('ios/') ||
      node.id === 'runtime:android' ||
      node.id === 'runtime:ios' ||
      /android|ios|capacitor|fastlane|native/i.test(node.name),
  );
  if (native) reasons.push('Android/iOS or native surface impact');

  const staticOut = input.coreDirectRuntimes.some((node) => node.id === 'runtime:static-out') ||
    seeds.some((node) => /static|out\/|build:static/i.test(`${node.name} ${node.path || ''}`));
  if (staticOut) reasons.push('Static out / export surface impact');

  const releaseCommands = commands.filter((command) =>
    /deploy|ota|release|fastlane|store|publish|upload/i.test(command.name),
  );
  if (releaseCommands.length) reasons.push(`related to release/deploy/OTA command(s): ${releaseCommands.map((c) => c.name).join(', ')}`);

  const writeEvidence = hasWriteGateway(graph, expandedIds) ||
    [...seeds, ...owners].some((node) => /write|save|mutate|upload|delete|insert|patch/i.test(`${node.name} ${node.summary || ''}`));
  if (writeEvidence) reasons.push('data write / persistence gateway evidence');

  const storageish = [...seeds, ...owners].some((node) =>
    /storage|database|turso|drizzle|schema|repository/i.test(`${node.name} ${node.path || ''}`),
  );
  if (storageish) reasons.push('storage/database access evidence');

  const protectedDoc = seeds.some(
    (node) =>
      node.path?.startsWith('docs/01-architecture/') ||
      node.path?.includes('document-mutability') ||
      node.path?.includes('runtime-contract') ||
      node.path?.startsWith('docs/09-agent-knowledge/contracts/') ||
      ['AGENTS.md', 'CLAUDE.md', 'GEMINI.md'].includes(node.path || ''),
  );
  if (protectedDoc) reasons.push('protected documentation or agent-contract surface');

  const generatedDoc = seeds.some((node) => node.path?.startsWith('docs/09-agent-knowledge/generated/'));
  if (generatedDoc) reasons.push('generated documentation/knowledge output');

  const docsTooling = seeds.some(
    (node) =>
      node.path?.startsWith('scripts/docs/') ||
      node.path === 'scripts/architecture-check.ts' ||
      node.path?.startsWith('scripts/architecture/') ||
      node.path === '.github/workflows/docs.yml',
  );
  if (docsTooling) reasons.push('documentation CI / knowledge tooling');

  const crossRuntime = !input.isDevOnly && input.coreDirectRuntimes.length >= 3;
  if (crossRuntime) reasons.push('cross-runtime shared footprint');

  if (!owners.length) reasons.push('missing/unknown ownership evidence');
  if (!tests.length) reasons.push('no related tests discovered in context neighborhood');
  if (input.documentationCoverageWeak) reasons.push('weak or missing documentation coverage signals');
  if (input.runtimeTestGuidanceMissing) reasons.push('missing/weak runtime-compatibility test guidance');

  let level: RiskLevel = 'low';
  if (releaseCommands.length || (writeEvidence && handlers.length) || (native && releaseCommands.length)) {
    level = 'release-critical';
  } else if (
    handlers.length ||
    authish ||
    native ||
    releaseCommands.length ||
    protectedDoc ||
    docsTooling ||
    (writeEvidence && storageish)
  ) {
    level = 'high';
  } else if (
    environmentKeys.length ||
    staticOut ||
    writeEvidence ||
    storageish ||
    crossRuntime ||
    generatedDoc ||
    input.documentationCoverageWeak ||
    input.runtimeTestGuidanceMissing ||
    !owners.length
  ) {
    level = 'medium';
  }

  const uniqueReasons = unique(reasons);
  return {
    level,
    reasons: uniqueReasons,
    summary:
      uniqueReasons.length > 0
        ? `Risk ${level}: ${uniqueReasons.slice(0, 4).join('; ')}${uniqueReasons.length > 4 ? `; +${uniqueReasons.length - 4} more` : ''}.`
        : `Risk ${level}: no elevated risk signals detected in the bounded neighborhood.`,
  };
}

export function renderRiskSection(assessment: RiskAssessment): string[] {
  return [
    '## Risk Classification',
    '',
    `**Level:** \`${assessment.level}\``,
    '',
    assessment.summary,
    '',
    ...(assessment.reasons.length
      ? ['Reasons:', '', ...assessment.reasons.map((reason) => `- ${reason}`), '']
      : ['']),
  ];
}
