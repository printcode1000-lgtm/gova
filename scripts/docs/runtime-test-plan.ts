import type { KnowledgeGraph, KnowledgeNode } from './model';
import { CORE_RUNTIME_IDS, RUNTIME_DEFINITIONS } from './runtime-knowledge';

export interface RuntimeTestPlan {
  isDevOnly: boolean;
  releaseRelevant: boolean;
  requiredChecks: string[];
  optionalChecks: string[];
  warnings: string[];
  commands: string[];
}

function isDevOnlyTarget(seeds: KnowledgeNode[]): boolean {
  return seeds.every((node) => {
    const path = node.path || '';
    const name = node.name.toLowerCase();
    if (!path && !name) return false;
    return (
      path.startsWith('src/app/dev/') ||
      path.includes('/dev/') ||
      path.startsWith('src/features/dev-') ||
      name.includes('dev-only') ||
      path.includes('dev-tools') ||
      path.includes('dev-cloud')
    );
  }) && seeds.length > 0;
}

export function buildRuntimeTestPlan(input: {
  seeds: KnowledgeNode[];
  coreDirectRuntimes: KnowledgeNode[];
  routes: KnowledgeNode[];
  hasApiHandlers: boolean;
  hasNativePaths: boolean;
  hasStaticImpact: boolean;
}): RuntimeTestPlan {
  const isDevOnly = isDevOnlyTarget(input.seeds);
  const warnings: string[] = [];
  const requiredChecks: string[] = [];
  const optionalChecks: string[] = [];
  const commands: string[] = ['npm run runtime:check:changed'];

  if (isDevOnly) {
    requiredChecks.push('Development suitability for the changed dev-only surface');
    requiredChecks.push('Confirm the change does not leak into Web/Static out/Android/iOS release behavior');
    commands.push('npm run runtime:check:dev');
    warnings.push('Target appears dev-only: do not treat Development success as release proof.');
  } else {
    requiredChecks.push('Evaluate all five runtimes: Development, Web, Static out, Android, iOS');
    commands.push('npm run runtime:check');
    commands.push('npm run runtime:check:dev');
    commands.push('npm run runtime:check:web');
    commands.push('npm run runtime:check:static');
    commands.push('npm run runtime:check:android');
    commands.push('npm run runtime:check:ios');
  }

  if (input.hasApiHandlers) {
    requiredChecks.push('API handlers are Web/Development only and must not be assumed inside out/');
    requiredChecks.push('Static/native clients must use a valid remote API boundary');
    warnings.push('App Router route handlers are absent from Static out/Android/iOS bundles.');
  }

  if (input.hasStaticImpact || !isDevOnly) {
    requiredChecks.push('Static-export constraints without overwriting release out/');
    optionalChecks.push('Do not run npm run build:static merely as a generic check');
  }

  if (input.hasNativePaths || (!isDevOnly && input.coreDirectRuntimes.some((node) => node.id === 'runtime:android' || node.id === 'runtime:ios'))) {
    requiredChecks.push('Android Capacitor/manifest/permission/plugin coherence');
    requiredChecks.push('iOS Capacitor/Info.plist/entitlement/plugin coherence');
  }

  if (!input.coreDirectRuntimes.length && !isDevOnly) {
    warnings.push('No direct runtime edges were found; treat missing footprint as an evidence gap and still run the five-surface plan.');
  }

  if (!requiredChecks.length) {
    warnings.push('Runtime-compatibility test guidance is incomplete for this target; create or extend safe checks before claiming done.');
  }

  return {
    isDevOnly,
    releaseRelevant: !isDevOnly,
    requiredChecks,
    optionalChecks,
    warnings,
    commands: [...new Set(commands)],
  };
}

export function renderRuntimeTestPlanSection(plan: RuntimeTestPlan): string[] {
  const core = RUNTIME_DEFINITIONS.filter((runtime) => CORE_RUNTIME_IDS.includes(runtime.id as (typeof CORE_RUNTIME_IDS)[number]));
  return [
    '## Required Runtime-Compatibility Test Plan',
    '',
    `**Scope class:** ${plan.isDevOnly ? 'dev-only' : 'release-relevant shared/runtime code'}`,
    '',
    plan.isDevOnly
      ? 'Verify Development suitability and non-leakage into Web/Static out/Android/iOS release behavior.'
      : 'Verify safe compatibility across Development, Web, Static out, Android, and iOS using non-publishing checks.',
    '',
    'Mandatory surfaces:',
    '',
    ...core.map((runtime) => `- **${runtime.name}**`),
    '',
    'Required checks:',
    '',
    ...plan.requiredChecks.map((item) => `- ${item}`),
    '',
    ...(plan.optionalChecks.length
      ? ['Notes:', '', ...plan.optionalChecks.map((item) => `- ${item}`), '']
      : []),
    'Suggested commands:',
    '',
    '```bash',
    ...plan.commands,
    '```',
    '',
    ...(plan.warnings.length ? ['Warnings:', '', ...plan.warnings.map((item) => `- ${item}`), ''] : []),
  ];
}
