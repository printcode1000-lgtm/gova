import { collectDeadDocsFindings, deadDocsValidationErrors } from './dead-docs';
import { diffGeneratedKnowledge } from './generate';
import { listChangedPathsAgainst, loadDocumentMutabilityRegistry, classifyDocumentationPath } from './document-mutability';
import { runMutabilityCheck } from './mutability-check';
import { validateAgentKnowledge } from './check';
import { buildRepositoryKnowledgeGraph } from './repository-knowledge';
import { envSafetyValidationErrors } from './env-safety-matrix';
import { checkAllRuntimeCompatibility } from '../runtime/compatibility-checks';
import { pathExists, readRepoText } from './fs-scan';

export type DocsCiMode = 'light' | 'full' | 'auto';

function detectMode(changedPaths: string[]): DocsCiMode {
  if (!changedPaths.length) return 'full';
  const registry = loadDocumentMutabilityRegistry();
  let sawProtected = false;
  let sawGenerated = false;
  let sawTooling = false;
  let sawEditableDocs = false;
  let sawPackageJson = false;
  let sawSourceAffectingKnowledge = false;

  for (const path of changedPaths) {
    const classified = classifyDocumentationPath(path, registry);
    if (classified?.classification === 'protected') sawProtected = true;
    if (classified?.classification === 'generated') sawGenerated = true;
    if (classified?.classification === 'editable') sawEditableDocs = true;
    if (
      path.startsWith('scripts/docs/') ||
      path.startsWith('scripts/architecture/') ||
      path === 'scripts/architecture-check.ts' ||
      path.startsWith('scripts/runtime/') ||
      path === '.github/workflows/docs.yml' ||
      path === 'scripts/github-ci-policy.ts'
    ) {
      sawTooling = true;
    }
    if (path === 'package.json' || path === 'package-lock.json') sawPackageJson = true;
    if (
      path.startsWith('src/') ||
      path.startsWith('packages/') ||
      path.startsWith('services/') ||
      path.startsWith('android/') ||
      path.startsWith('ios/') ||
      path.startsWith('fastlane/')
    ) {
      sawSourceAffectingKnowledge = true;
    }
  }

  if (sawProtected || sawGenerated || sawTooling || sawPackageJson || sawSourceAffectingKnowledge) return 'full';
  if (sawEditableDocs) return 'light';
  return 'full';
}

function requireAgentMarkers(): string[] {
  const errors: string[] = [];
  const surfaces = [
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.agents/rules/agent-instructions.md',
  ];
  const markers = [
    'scripts/docs/context.ts',
    'docs/09-agent-knowledge/runtime-contract.md',
    'document-mutability',
    'runtime:check',
    'docs:ci',
    'protected',
    'generated',
  ];
  for (const surface of surfaces) {
    if (!pathExists(surface)) {
      errors.push(`missing agent instruction surface: ${surface}`);
      continue;
    }
    const content = readRepoText(surface);
    const lower = content.toLowerCase();
    for (const marker of markers) {
      if (!lower.includes(marker.toLowerCase())) errors.push(`${surface} missing required docs-ci marker: ${marker}`);
    }
  }
  return errors;
}

export function runDocsCi(options?: { mode?: DocsCiMode; baseRef?: string }): string[] {
  const changed = listChangedPathsAgainst(options?.baseRef);
  const mode = options?.mode && options.mode !== 'auto' ? options.mode : detectMode(changed);
  const errors: string[] = [];

  errors.push(...runMutabilityCheck({ baseRef: options?.baseRef }));
  errors.push(...requireAgentMarkers());

  if (mode === 'light') {
    const graph = buildRepositoryKnowledgeGraph();
    errors.push(...deadDocsValidationErrors(collectDeadDocsFindings(graph)));
    errors.push(...envSafetyValidationErrors(graph));
    // Editable docs are part of the graph/search index too. Never let the light
    // path hide stale committed snapshots.
    errors.push(...diffGeneratedKnowledge());
    return [...new Set(errors)].sort();
  }

  // Validation is intentionally non-mutating. Generation is a separate command
  // (`npm run docs:generate`); CI compares its working-tree result against HEAD.
  errors.push(...validateAgentKnowledge());

  const graph = buildRepositoryKnowledgeGraph();
  errors.push(...deadDocsValidationErrors(collectDeadDocsFindings(graph)));
  errors.push(...envSafetyValidationErrors(graph));
  errors.push(...checkAllRuntimeCompatibility());

  for (const template of [
    'docs/09-agent-knowledge/templates/ui-task.md',
    'docs/09-agent-knowledge/templates/api-task.md',
    'docs/09-agent-knowledge/templates/data-task.md',
    'docs/09-agent-knowledge/templates/native-task.md',
    'docs/09-agent-knowledge/templates/deploy-task.md',
    'docs/09-agent-knowledge/templates/package-task.md',
    'docs/09-agent-knowledge/templates/protected-doc-change-task.md',
    'docs/09-agent-knowledge/templates/editable-doc-change-task.md',
    'docs/09-agent-knowledge/templates/docs-ci-task.md',
    'docs/09-agent-knowledge/templates/runtime-compatibility-task.md',
  ]) {
    if (!pathExists(template)) errors.push(`missing agent task template: ${template}`);
  }

  return [...new Set(errors)].sort();
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/docs/docs-ci.ts')) {
  const modeArg = process.argv.includes('--mode')
    ? (process.argv[process.argv.indexOf('--mode') + 1] as DocsCiMode)
    : 'auto';
  const baseRef = process.argv.includes('--base')
    ? process.argv[process.argv.indexOf('--base') + 1]
    : process.env.DOCS_CI_BASE_REF;
  const errors = runDocsCi({ mode: modeArg, baseRef });
  if (errors.length) {
    console.error(`Docs CI failed (${modeArg}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  } else {
    console.log(`Docs CI passed (${modeArg}).`);
  }
}
