import { readFileSync } from 'node:fs';
import path from 'node:path';

export type GeneratedGateId = 'build' | 'build:static' | 'test';

export interface ResolvedGateStep {
  kind: 'npm-script' | 'command';
  value: string;
}

interface ScriptStep {
  kind: 'script';
  name: string;
}

interface SelectorStep {
  kind: 'selector';
  pattern: RegExp;
  exclude?: ReadonlySet<string>;
}

interface CommandStep {
  kind: 'command';
  command: string;
}

type GatePolicyStep = ScriptStep | SelectorStep | CommandStep;

const PACKAGE_PATH = path.join(process.cwd(), 'package.json');

export const COMPOSITION_LEAF_TESTS = new Set([
  'test:notifications-composition',
  'test:products-composition',
  'test:orders-composition',
  'test:profiles-composition',
  'test:submain-composition',
  'test:sub2main-composition',
]);

const coreTests: SelectorStep = {
  kind: 'selector',
  pattern: /^test:.*-core$/,
};

const allTests: SelectorStep = {
  kind: 'selector',
  pattern: /^test:/,
  exclude: COMPOSITION_LEAF_TESTS,
};

const commonBuildChecks: readonly GatePolicyStep[] = [
  { kind: 'script', name: 'catalog:validate' },
  { kind: 'script', name: 'test:catalog-studio' },
  { kind: 'script', name: 'architecture:check' },
  { kind: 'script', name: 'services:sync' },
  coreTests,
  { kind: 'script', name: 'test:account-deletion-registry' },
  { kind: 'script', name: 'test:account-deletion-schema' },
  { kind: 'script', name: 'test:import-without-composition' },
  { kind: 'script', name: 'test:notifications' },
  { kind: 'script', name: 'ios:push:validate' },
  { kind: 'script', name: 'test:account-declarations' },
  { kind: 'script', name: 'test:cloud-accounts' },
  { kind: 'script', name: 'test:super-admin-users' },
  { kind: 'script', name: 'test:account-bridge' },
  { kind: 'script', name: 'test:compositions' },
];

const GATE_POLICY: Readonly<Record<GeneratedGateId, readonly GatePolicyStep[]>> = {
  build: [
    { kind: 'script', name: 'branding:generate' },
    { kind: 'script', name: 'app:init' },
    ...commonBuildChecks,
    { kind: 'script', name: 'db:ensure' },
    { kind: 'script', name: 'db:schema:sync' },
    { kind: 'command', command: 'next build' },
  ],
  'build:static': [
    { kind: 'script', name: 'branding:generate' },
    { kind: 'script', name: 'maplibre:sync' },
    ...commonBuildChecks,
    { kind: 'script', name: 'test:console-command-parity' },
    { kind: 'script', name: 'test:deploy-runbook-execution' },
    { kind: 'command', command: 'npx tsx scripts/build-static.ts' },
  ],
  test: [
    { kind: 'script', name: 'services:sync' },
    { kind: 'script', name: 'validate:error-logging' },
    { kind: 'script', name: 'android:backup:validate' },
    { kind: 'script', name: 'android:r8:validate' },
    { kind: 'script', name: 'ios:push:validate' },
    allTests,
  ],
};

export function readPackageScripts(): Record<string, string> {
  const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as {
    scripts?: Record<string, string>;
  };
  return pkg.scripts ?? {};
}

export function resolveGeneratedGate(
  gateId: GeneratedGateId,
  scripts = readPackageScripts(),
): ResolvedGateStep[] {
  const policy = GATE_POLICY[gateId];
  const resolved: ResolvedGateStep[] = [];
  const seen = new Set<string>();

  const add = (step: ResolvedGateStep): void => {
    const key = `${step.kind}:${step.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    resolved.push(step);
  };

  for (const step of policy) {
    if (step.kind === 'command') {
      add({ kind: 'command', value: step.command });
      continue;
    }
    if (step.kind === 'script') {
      if (!scripts[step.name]) {
        throw new Error(`Generated gate ${gateId} requires missing npm script: ${step.name}`);
      }
      add({ kind: 'npm-script', value: step.name });
      continue;
    }

    const matches = Object.keys(scripts)
      .filter((name) => step.pattern.test(name))
      .filter((name) => !step.exclude?.has(name))
      .sort((left, right) => left.localeCompare(right));
    if (matches.length === 0) {
      throw new Error(`Generated gate ${gateId} selector ${step.pattern} matched no npm scripts.`);
    }
    for (const name of matches) add({ kind: 'npm-script', value: name });
  }

  return resolved;
}

export function generatedGateIds(): GeneratedGateId[] {
  return ['build', 'build:static', 'test'];
}
