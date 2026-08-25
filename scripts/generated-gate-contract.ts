import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  COMPOSITION_LEAF_TESTS,
  generatedGateIds,
  readPackageScripts,
  resolveGeneratedGate,
  type GeneratedGateId,
} from './generated-gates';
import { VERCEL_BUILD_COMMAND, VERCEL_INSTALL_COMMAND } from './vercel-deployment-guards';

export const GATE_ENTRYPOINTS: Readonly<Record<GeneratedGateId, string>> = {
  build: 'npx tsx scripts/run-generated-gate.ts build',
  'build:static': 'npx tsx scripts/run-generated-gate.ts build:static',
  test: 'npx tsx scripts/run-generated-gate.ts test',
};

const VERIFY_ENTRYPOINT = 'npx tsx scripts/generated-gate-contract.ts';

export function verifyGeneratedGateContract(): string[] {
  const errors: string[] = [];
  const scripts = readPackageScripts();

  for (const gateId of generatedGateIds()) {
    if (scripts[gateId] !== GATE_ENTRYPOINTS[gateId]) {
      errors.push(
        `package.json script ${gateId} must be exactly: ${GATE_ENTRYPOINTS[gateId]}`,
      );
    }
  }
  if (scripts['gates:verify'] !== VERIFY_ENTRYPOINT) {
    errors.push(`package.json script gates:verify must be exactly: ${VERIFY_ENTRYPOINT}`);
  }
  if (scripts.pretest) {
    errors.push('package.json pretest is forbidden: test setup belongs to the generated test gate.');
  }
  if (scripts.build === scripts['build:vercel']) {
    errors.push('Vercel build:vercel must not be the local correctness gate `build`.');
  }
  try {
    const vercel = JSON.parse(
      readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'),
    ) as { installCommand?: string; buildCommand?: string };
    if (vercel.installCommand !== VERCEL_INSTALL_COMMAND) {
      errors.push(`vercel.json installCommand must be exactly: ${VERCEL_INSTALL_COMMAND}`);
    }
    if (vercel.buildCommand !== VERCEL_BUILD_COMMAND) {
      errors.push(`vercel.json buildCommand must be exactly: ${VERCEL_BUILD_COMMAND}`);
    }
  } catch (error) {
    errors.push(
      `vercel.json Deployment/Smoke Guards contract could not be read: ${error instanceof Error ? error.message : error}`,
    );
  }

  const resolved = new Map<GeneratedGateId, ReturnType<typeof resolveGeneratedGate>>();
  for (const gateId of generatedGateIds()) {
    try {
      const steps = resolveGeneratedGate(gateId, scripts);
      if (steps.length === 0) errors.push(`Generated gate ${gateId} resolved to zero steps.`);
      resolved.set(gateId, steps);
      for (const step of steps) {
        if (step.kind !== 'npm-script') continue;
        if (step.value === gateId || step.value === 'gates:verify') {
          errors.push(`Generated gate ${gateId} recursively invokes ${step.value}.`);
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const testSteps = new Set(
    (resolved.get('test') ?? [])
      .filter((step) => step.kind === 'npm-script')
      .map((step) => step.value),
  );
  for (const scriptName of Object.keys(scripts).filter((name) => name.startsWith('test:'))) {
    if (COMPOSITION_LEAF_TESTS.has(scriptName)) continue;
    if (!testSteps.has(scriptName)) {
      errors.push(`Generated test gate does not cover npm script ${scriptName}.`);
    }
  }

  const coreScripts = Object.keys(scripts).filter((name) => /^test:.*-core$/.test(name));
  for (const gateId of ['build', 'build:static'] as const) {
    const names = new Set(
      (resolved.get(gateId) ?? [])
        .filter((step) => step.kind === 'npm-script')
        .map((step) => step.value),
    );
    for (const coreScript of coreScripts) {
      if (!names.has(coreScript)) {
        errors.push(`Generated ${gateId} gate does not cover core test ${coreScript}.`);
      }
    }
  }

  return errors;
}

const executedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/generated-gate-contract.ts');
if (executedDirectly) {
  const errors = verifyGeneratedGateContract();
  if (errors.length > 0) {
    console.error('Generated Build/Test gate contract failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    const scripts = readPackageScripts();
    const counts = generatedGateIds()
      .map((id) => `${id}=${resolveGeneratedGate(id, scripts).length}`)
      .join(', ');
    console.log(`Generated Build/Test gate contract passed (${counts}).`);
  }
}
