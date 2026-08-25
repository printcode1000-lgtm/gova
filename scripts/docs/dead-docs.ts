import { dirname, join, resolve } from 'node:path';

import type { KnowledgeGraph } from './model';
import { normalizePath, pathExists, readRepoJson, readRepoText, walkFiles } from './fs-scan';
import { extractMarkdownFacts } from './markdown';
import { loadDocumentMutabilityRegistry } from './document-mutability';

export interface DeadDocsFinding {
  source: string;
  reference: string;
  kind:
    | 'missing-file'
    | 'missing-package'
    | 'missing-command'
    | 'missing-env-key'
    | 'missing-generated'
    | 'stale-link'
    | 'protected-redefinition'
    | 'missing-contract'
    | 'missing-runtime-compat-doc';
  detail: string;
}

const PROTECTED_REDEFINITION_PATTERNS = [
  /this\s+document\s+supersedes\s+the\s+runtime\s+contract/i,
  /ignore\s+docs\/09-agent-knowledge\/runtime-contract/i,
  /agents?\s+may\s+skip\s+context\s+packs?/i,
  /generated\s+docs?\s+may\s+be\s+hand-edited/i,
  /protected\s+docs?\s+are\s+freely\s+editable/i,
];

function resolveMarkdownLink(fromPath: string, link: string): string {
  const cleaned = link.split(/[?#]/)[0] || '';
  if (!cleaned || cleaned.startsWith('http') || cleaned.startsWith('mailto:')) return '';
  if (cleaned.startsWith('/')) return normalizePath(cleaned.slice(1));
  return normalizePath(join(dirname(fromPath), cleaned));
}

function packageNames(): Set<string> {
  const names = new Set<string>();
  for (const path of walkFiles('packages', (file) => file.endsWith('/package.json') || file === 'packages/package.json')) {
    try {
      const manifest = readRepoJson<{ name?: string }>(path);
      if (manifest.name) names.add(manifest.name);
    } catch {
      // ignore malformed package manifests in dead-doc scan
    }
  }
  return names;
}

function commandNames(): Set<string> {
  const manifest = readRepoJson<{ scripts?: Record<string, string> }>('package.json');
  return new Set(Object.keys(manifest.scripts || {}).map((name) => `npm run ${name}`));
}

function envKeyNames(graph: KnowledgeGraph): Set<string> {
  return new Set(graph.nodes.filter((node) => node.kind === 'environment-key').map((node) => node.name));
}

export function collectDeadDocsFindings(graph: KnowledgeGraph): DeadDocsFinding[] {
  const findings: DeadDocsFinding[] = [];
  const packages = packageNames();
  const commands = commandNames();
  const envKeys = envKeyNames(graph);
  const registry = loadDocumentMutabilityRegistry();

  const requiredContracts = [
    'docs/09-agent-knowledge/document-mutability.md',
    'docs/09-agent-knowledge/document-mutability.json',
    'docs/09-agent-knowledge/contracts/docs-ci.md',
    'docs/09-agent-knowledge/contracts/runtime-compatibility.md',
    'docs/09-agent-knowledge/contracts/documentation-update-policy.md',
    'docs/09-agent-knowledge/contracts/protected-docs.md',
    'docs/09-agent-knowledge/templates/ui-task.md',
    'docs/09-agent-knowledge/templates/runtime-compatibility-task.md',
  ];
  for (const path of requiredContracts) {
    if (!pathExists(path)) {
      findings.push({
        source: 'docs/09-agent-knowledge/',
        reference: path,
        kind: 'missing-contract',
        detail: 'required agent-knowledge contract/template is missing',
      });
    }
  }

  const docs = walkFiles('docs', (path) => path.endsWith('.md'));
  for (const path of docs) {
    if (path.startsWith('docs/09-agent-knowledge/generated/')) continue;
    const content = readRepoText(path);
    const facts = extractMarkdownFacts(content, path);

    for (const link of facts.links) {
      const resolved = resolveMarkdownLink(path, link);
      if (!resolved) continue;
      if (!pathExists(resolved)) {
        findings.push({
          source: path,
          reference: resolved,
          kind: path.startsWith('docs/09-agent-knowledge/generated/') ? 'missing-generated' : 'stale-link',
          detail: `broken internal markdown link from ${path}`,
        });
      }
    }

    for (const mention of facts.mentions) {
      if (mention.startsWith('@asol/') && !packages.has(mention.split('/').slice(0, 2).join('/')) && !packages.has(mention)) {
        const root = mention.split('/').slice(0, 2).join('/');
        if (![...packages].some((name) => mention === name || mention.startsWith(`${name}/`))) {
          findings.push({
            source: path,
            reference: mention,
            kind: 'missing-package',
            detail: `documentation mentions unknown package ${root}`,
          });
        }
      }
      if (mention.startsWith('npm run ') && !commands.has(mention)) {
        findings.push({
          source: path,
          reference: mention,
          kind: 'missing-command',
          detail: 'documentation mentions unknown npm script',
        });
      }
      if (/^[A-Z][A-Z0-9_]*$/.test(mention) && content.includes(`\`${mention}\``) && /required|must set|environment/.test(content) && !envKeys.has(mention) && !mention.startsWith('NEXT_PUBLIC_UNKNOWN')) {
        // Only flag when the key is asserted as an environment key elsewhere in graph absence and looks like env.
        if (/(ENV|KEY|TOKEN|SECRET|URL|URI|DSN|API)/.test(mention) && !envKeys.has(mention)) {
          findings.push({
            source: path,
            reference: mention,
            kind: 'missing-env-key',
            detail: 'documentation references an environment key name with no graph evidence',
          });
        }
      }
      if (mention.startsWith('docs/') || mention.startsWith('src/') || mention.startsWith('packages/') || mention.startsWith('scripts/')) {
        if (!pathExists(mention) && !mention.endsWith('/**')) {
          // Directory mentions without trailing evidence
          const asDir = mention.endsWith('/') ? mention.slice(0, -1) : mention;
          if (!pathExists(asDir)) {
            findings.push({
              source: path,
              reference: mention,
              kind: 'missing-file',
              detail: 'documentation mentions a missing repository path',
            });
          }
        }
      }
    }

    const editable = registry.entries.some(
      (entry) =>
        entry.class === 'editable' &&
        (path === normalizePath(entry.path) || path.startsWith(normalizePath(entry.path).replace(/\/$/, '') + '/')),
    );
    const protectedDoc = registry.entries.some(
      (entry) =>
        entry.class === 'protected' &&
        (path === normalizePath(entry.path) || path.startsWith(normalizePath(entry.path).replace(/\/$/, '') + '/')),
    );
    // Task templates intentionally describe protected-doc workflows; they are not redefinitions.
    if (editable && !protectedDoc && !path.startsWith('docs/09-agent-knowledge/templates/')) {
      for (const pattern of PROTECTED_REDEFINITION_PATTERNS) {
        if (pattern.test(content)) {
          findings.push({
            source: path,
            reference: 'protected-contract-redefinition',
            kind: 'protected-redefinition',
            detail: 'editable documentation appears to redefine a protected contract',
          });
        }
      }
    }
  }

  // Cross-runtime areas should mention runtime compatibility somewhere nearby in docs/09 contracts or authoring.
  if (!pathExists('docs/09-agent-knowledge/contracts/runtime-compatibility.md')) {
    findings.push({
      source: 'docs/09-agent-knowledge/contracts/',
      reference: 'runtime-compatibility.md',
      kind: 'missing-runtime-compat-doc',
      detail: 'runtime-compatibility contract document is required',
    });
  }

  // Deduplicate
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.kind}|${finding.source}|${finding.reference}|${finding.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function renderDeadDocsReport(findings: DeadDocsFinding[]): string {
  const banner = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->
`;
  const lines = [
    banner,
    '# Dead Docs Report',
    '',
    `Findings: **${findings.length}**`,
    '',
    '| Kind | Source | Reference | Detail |',
    '|---|---|---|---|',
  ];
  for (const finding of findings.sort((a, b) => a.kind.localeCompare(b.kind) || a.source.localeCompare(b.source))) {
    lines.push(
      `| \`${finding.kind}\` | \`${finding.source}\` | \`${finding.reference.replace(/\|/g, '\\|')}\` | ${finding.detail.replace(/\|/g, '\\|')} |`,
    );
  }
  if (!findings.length) lines.push('| _(none)_ |  |  |  |');
  lines.push('');
  return lines.join('\n');
}

export function deadDocsValidationErrors(findings: DeadDocsFinding[]): string[] {
  return findings
    .filter((finding) =>
      [
        'stale-link',
        'protected-redefinition',
        'missing-contract',
        'missing-runtime-compat-doc',
      ].includes(finding.kind),
    )
    .map(
      (finding) =>
        `dead docs (${finding.kind}): ${finding.source} -> ${finding.reference} (${finding.detail})`,
    );
}
