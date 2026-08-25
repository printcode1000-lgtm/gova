import { execSync } from 'node:child_process';

import { isDirectory, normalizePath, pathExists, readRepoJson, walkFiles } from './fs-scan';

export type DocumentMutabilityClass = 'protected' | 'editable' | 'generated';

export interface DocumentMutabilityEntry {
  class: DocumentMutabilityClass;
  path: string;
  reason: string;
  except?: string[];
  authorizationRequired?: boolean;
  handEditForbidden?: boolean;
}

export interface DocumentMutabilityRegistry {
  version: 1;
  authorization: {
    commitMessageMarker: string;
    environmentVariable: string;
    default: 'deny';
    description: string;
  };
  classes: Record<
    DocumentMutabilityClass,
    {
      description: string;
      authorizationRequired: boolean;
      handEditForbidden?: boolean;
    }
  >;
  entries: DocumentMutabilityEntry[];
}

export interface ClassifiedPath {
  path: string;
  classification: DocumentMutabilityClass;
  reason: string;
  matchedEntryPath: string;
}

export const DOCUMENT_MUTABILITY_REGISTRY_PATH = 'docs/09-agent-knowledge/document-mutability.json';
export const DOCS_CONTRACT_CHANGE_MARKER = '[docs-contract-change]';

function longestPrefixMatch(path: string, candidates: DocumentMutabilityEntry[]): DocumentMutabilityEntry | undefined {
  const normalized = normalizePath(path);
  let best: DocumentMutabilityEntry | undefined;
  for (const entry of candidates) {
    const prefix = normalizePath(entry.path);
    const except = (entry.except || []).map(normalizePath);
    if (except.some((item) => normalized === item || normalized.startsWith(item.endsWith('/') ? item : `${item}/`))) {
      continue;
    }
    const matches =
      normalized === prefix ||
      (prefix.endsWith('/')
        ? normalized.startsWith(prefix)
        : normalized === prefix || normalized.startsWith(`${prefix}/`));
    if (!matches) continue;
    if (!best || prefix.length > normalizePath(best.path).length) best = entry;
  }
  return best;
}

export function loadDocumentMutabilityRegistry(): DocumentMutabilityRegistry {
  const registry = readRepoJson<DocumentMutabilityRegistry>(DOCUMENT_MUTABILITY_REGISTRY_PATH);
  if (registry.version !== 1) {
    throw new Error(`unsupported document mutability registry version: ${String(registry.version)}`);
  }
  if (!registry.entries?.length) throw new Error('document mutability registry has no entries');
  return registry;
}

export function validateDocumentMutabilityRegistry(registry = loadDocumentMutabilityRegistry()): string[] {
  const errors: string[] = [];
  if (registry.authorization.default !== 'deny') {
    errors.push('document mutability authorization default must be deny');
  }
  if (registry.authorization.commitMessageMarker !== DOCS_CONTRACT_CHANGE_MARKER) {
    errors.push(`document mutability commit marker must be ${DOCS_CONTRACT_CHANGE_MARKER}`);
  }
  if (registry.authorization.environmentVariable !== 'DOCS_CONTRACT_CHANGE') {
    errors.push('document mutability environment variable must be DOCS_CONTRACT_CHANGE');
  }

  const seen = new Set<string>();
  for (const entry of registry.entries) {
    const path = normalizePath(entry.path);
    if (seen.has(`${entry.class}:${path}`)) errors.push(`duplicate mutability entry: ${entry.class} ${path}`);
    seen.add(`${entry.class}:${path}`);
    if (!['protected', 'editable', 'generated'].includes(entry.class)) {
      errors.push(`invalid mutability class for ${path}: ${String(entry.class)}`);
    }
    if (!entry.reason?.trim()) errors.push(`mutability entry missing reason: ${path}`);
    if (!pathExists(path) && !path.endsWith('/')) {
      errors.push(`mutability entry path does not exist: ${path}`);
    }
    if (path.endsWith('/') && !isDirectory(path.replace(/\/$/, '') || path)) {
      // Directory entries may be listed with trailing slash.
      if (!isDirectory(path.slice(0, -1))) errors.push(`mutability entry directory does not exist: ${path}`);
    }
  }

  const requiredProtected = [
    'docs/09-agent-knowledge/runtime-contract.md',
    'docs/09-agent-knowledge/coverage-contract.md',
    'docs/09-agent-knowledge/knowledge-schema.md',
    'docs/09-agent-knowledge/context-packs.md',
    'docs/09-agent-knowledge/generation-and-drift.md',
    'docs/09-agent-knowledge/authoring-standard.md',
    'docs/09-agent-knowledge/document-mutability.md',
    'docs/09-agent-knowledge/document-mutability.json',
    'docs/09-agent-knowledge/contracts/',
    'docs/01-architecture/',
    'docs/07-mobile-and-release/release-and-secrets.md',
    'docs/07-mobile-and-release/deployment-targets.md',
    'docs/07-mobile-and-release/scripts-and-workflows.md',
    'docs/04-ui-components/touch-interaction-policy.md',
    'docs/04-ui-components/page-snapshot-system.md',
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.agents/rules/agent-instructions.md',
  ];
  for (const required of requiredProtected) {
    const found = registry.entries.some(
      (entry) => entry.class === 'protected' && normalizePath(entry.path) === normalizePath(required),
    );
    if (!found) errors.push(`protected mutability registry missing required path: ${required}`);
  }

  const generatedRoots = registry.entries.filter((entry) => entry.class === 'generated');
  if (!generatedRoots.some((entry) => normalizePath(entry.path) === 'docs/09-agent-knowledge/generated/')) {
    errors.push('generated mutability registry missing docs/09-agent-knowledge/generated/');
  }

  return [...new Set(errors)].sort();
}

export function classifyDocumentationPath(
  repoPath: string,
  registry = loadDocumentMutabilityRegistry(),
): ClassifiedPath | undefined {
  const path = normalizePath(repoPath);
  const isDocLike =
    path.startsWith('docs/') ||
    path === 'AGENTS.md' ||
    path === 'CLAUDE.md' ||
    path === 'GEMINI.md' ||
    path.startsWith('.agents/');
  if (!isDocLike && !registry.entries.some((entry) => path === normalizePath(entry.path) || path.startsWith(`${normalizePath(entry.path).replace(/\/$/, '')}/`))) {
    return undefined;
  }

  const generated = longestPrefixMatch(path, registry.entries.filter((entry) => entry.class === 'generated'));
  if (generated) {
    return {
      path,
      classification: 'generated',
      reason: generated.reason,
      matchedEntryPath: normalizePath(generated.path),
    };
  }

  const protectedEntry = longestPrefixMatch(path, registry.entries.filter((entry) => entry.class === 'protected'));
  if (protectedEntry) {
    return {
      path,
      classification: 'protected',
      reason: protectedEntry.reason,
      matchedEntryPath: normalizePath(protectedEntry.path),
    };
  }

  const editable = longestPrefixMatch(path, registry.entries.filter((entry) => entry.class === 'editable'));
  if (editable) {
    return {
      path,
      classification: 'editable',
      reason: editable.reason,
      matchedEntryPath: normalizePath(editable.path),
    };
  }

  if (path.startsWith('docs/') || path === 'AGENTS.md' || path === 'CLAUDE.md' || path === 'GEMINI.md' || path.startsWith('.agents/')) {
    return {
      path,
      classification: 'protected',
      reason: 'documentation path is not classified as editable or generated; default-deny treats it as protected',
      matchedEntryPath: '(default-deny)',
    };
  }
  return undefined;
}

export function isProtectedContractChangeAuthorized(options?: {
  commitMessage?: string;
  env?: NodeJS.ProcessEnv;
}): boolean {
  const env = options?.env ?? process.env;
  if (env.DOCS_CONTRACT_CHANGE === '1' || env.DOCS_CONTRACT_CHANGE === 'true') return true;
  const message = options?.commitMessage ?? readLatestCommitMessage();
  return message.includes(DOCS_CONTRACT_CHANGE_MARKER);
}

function readLatestCommitMessage(): string {
  try {
    return execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
  } catch {
    return '';
  }
}

export function listChangedPathsAgainst(baseRef?: string): string[] {
  const commands = baseRef
    ? [`git diff --name-only ${baseRef}...HEAD`, `git diff --name-only --cached`, `git diff --name-only`]
    : ['git diff --name-only HEAD~1 HEAD', 'git diff --name-only --cached', 'git diff --name-only'];
  const paths = new Set<string>();
  for (const command of commands) {
    try {
      const output = execSync(command, { encoding: 'utf8' });
      for (const line of output.split(/\r?\n/)) {
        const trimmed = normalizePath(line.trim());
        if (trimmed) paths.add(trimmed);
      }
    } catch {
      // Ignore unavailable git ranges; callers still validate registry integrity.
    }
  }
  return [...paths].sort();
}

function saferEditableSuggestion(path: string): string {
  if (path.startsWith('docs/01-architecture/')) {
    return 'Prefer an editable operational doc under docs/02-data-and-storage/, docs/05-platform-features/, or docs/08-troubleshooting/ unless the task explicitly changes architecture contracts.';
  }
  if (path.startsWith('docs/09-agent-knowledge/contracts/') || path.startsWith('docs/09-agent-knowledge/')) {
    return 'Prefer docs/09-agent-knowledge/templates/ or an editable feature doc unless the task explicitly authorizes a protected contract change.';
  }
  if (path.startsWith('docs/04-ui-components/')) {
    return 'Prefer a non-policy UI/feature document under docs/04-ui-components/ or docs/05-platform-features/.';
  }
  if (path.startsWith('docs/07-mobile-and-release/')) {
    return 'Prefer an editable mobile/release operational document that is not a protected release/CI contract.';
  }
  return 'Prefer an editable operational document under docs/00-overview/, docs/02-*, docs/03-*, docs/05-*, docs/06-*, or docs/08-troubleshooting/.';
}

export function formatMutabilityViolation(classified: ClassifiedPath, kind: 'protected' | 'generated'): string {
  if (kind === 'generated') {
    return [
      `GENERATED DOCUMENTATION MUST NOT BE HAND-EDITED: ${classified.path}`,
      `  why: ${classified.reason}`,
      '  required action: change the source/registry/generator inputs, then run `npm run docs:generate` (or `npm run architecture:docs`) and commit the regenerated overwrite-only output',
      '  never: manually patch generated catalogs/graphs/reports',
    ].join('\n');
  }
  return [
    `PROTECTED DOCUMENTATION CHANGE REQUIRES EXPLICIT AUTHORIZATION: ${classified.path}`,
    `  why: ${classified.reason}`,
    `  required authorization: include ${DOCS_CONTRACT_CHANGE_MARKER} in the commit message, or set DOCS_CONTRACT_CHANGE=1 for local/CI tooling`,
    `  safer alternative: ${saferEditableSuggestion(classified.path)}`,
    '  default: deny',
  ].join('\n');
}

export function collectMutabilityChangeErrors(
  changedPaths: string[],
  options?: { commitMessage?: string; env?: NodeJS.ProcessEnv; registry?: DocumentMutabilityRegistry },
): string[] {
  const registry = options?.registry ?? loadDocumentMutabilityRegistry();
  const authorized = isProtectedContractChangeAuthorized(options);
  const errors: string[] = [];

  for (const path of changedPaths) {
    const classified = classifyDocumentationPath(path, registry);
    if (!classified) continue;
    if (classified.classification === 'generated') {
      // Generated files may be regenerated in the same change; hand-edit detection is handled by
      // regenerate-and-diff. Unauthorized "manual" edits still fail that drift check.
      continue;
    }
    if (classified.classification === 'protected' && !authorized) {
      errors.push(formatMutabilityViolation(classified, 'protected'));
    }
  }
  return errors;
}

export function listClassifiedDocumentationFiles(registry = loadDocumentMutabilityRegistry()): ClassifiedPath[] {
  const docs = walkFiles('docs', (path) => path.endsWith('.md') || path.endsWith('.json'));
  const surfaces = [
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.agents/rules/agent-instructions.md',
  ];
  const paths = [...docs, ...surfaces].sort();
  return paths
    .map((path) => classifyDocumentationPath(path, registry))
    .filter((item): item is ClassifiedPath => Boolean(item));
}
