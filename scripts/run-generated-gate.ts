import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  generatedGateIds,
  resolveGeneratedGate,
  type GeneratedGateId,
} from './generated-gates';
import { verifyGeneratedGateContract } from './generated-gate-contract';
import {
  currentDeployRunId,
  gateStepAlreadyProven,
  isReusableGateStep,
  recordGateStep,
} from './gate-step-checkpoints';

const gateId = process.argv[2] as GeneratedGateId | undefined;
if (!gateId || !generatedGateIds().includes(gateId)) {
  console.error('Usage: npx tsx scripts/run-generated-gate.ts <build|build:static|test>');
  process.exit(2);
}

const contractErrors = verifyGeneratedGateContract();
if (contractErrors.length > 0) {
  console.error(`[gate:${gateId}] contract failed:`);
  for (const error of contractErrors) console.error(`- ${error}`);
  process.exit(1);
}

function spawnWithoutShell(command: string, args: string[]) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
}

function nextBin(): string {
  const candidate = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!existsSync(candidate)) {
    throw new Error('Pinned Next.js binary is missing; generated gates cannot spawn `next` through a shell.');
  }
  return candidate;
}

function tsxBin(): string {
  const candidate = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!existsSync(candidate)) {
    throw new Error('Pinned tsx binary is missing; generated gates cannot spawn `npx tsx` through a shell.');
  }
  return candidate;
}

function runNpmScript(script: string) {
  const npmCli = process.env.npm_execpath?.trim();
  if (npmCli) {
    return spawnWithoutShell(process.execPath, [npmCli, 'run', script]);
  }

  if (process.platform === 'win32') {
    if (!/^[A-Za-z0-9:_-]+$/.test(script)) {
      throw new Error(`Unsafe npm script name for Windows command execution: ${script}`);
    }
    return spawnWithoutShell(process.env.ComSpec?.trim() || 'cmd.exe', [
      '/d',
      '/s',
      '/c',
      `npm.cmd run ${script}`,
    ]);
  }

  return spawnWithoutShell('npm', ['run', script]);
}

function runGateCommand(command: string) {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  if (parts[0] === 'next') {
    return spawnWithoutShell(process.execPath, [nextBin(), ...parts.slice(1)]);
  }
  if (parts[0] === 'npx' && parts[1] === 'tsx') {
    return spawnWithoutShell(process.execPath, [tsxBin(), ...parts.slice(2)]);
  }
  throw new Error(
    `Unsupported generated-gate command ${command}. Spawn must use executable plus args without a shell (DEP0190).`,
  );
}

const steps = resolveGeneratedGate(gateId);
console.log(`[gate:${gateId}] ${steps.length} generated step(s).`);
if (currentDeployRunId()) {
  console.log(
    `[gate:${gateId}] Deploy run ${currentDeployRunId()}: a read-only step already proved in this run, ` +
      'against the same source hash, is reused instead of being run a second time.',
  );
}

for (let index = 0; index < steps.length; index += 1) {
  const step = steps[index]!;
  const label = step.kind === 'npm-script' ? `npm run ${step.value}` : step.value;
  console.log(`\n[gate:${gateId}] ${index + 1}/${steps.length}: ${label}`);

  // Reuse is offered only to read-only verification steps, only inside one
  // deploy run, and only for an unchanged source hash. Everything else — the
  // generators, the mirror sync, the database steps and the build itself —
  // always runs.
  if (isReusableGateStep(step)) {
    const proven = gateStepAlreadyProven(step.value);
    if (proven) {
      console.log(
        `[gate:${gateId}] REUSED: ${label} already passed in gate "${proven.gateId}" at ${proven.finishedAt} for the same source hash.`,
      );
      continue;
    }
  }

  const result = step.kind === 'npm-script'
    ? runNpmScript(step.value)
    : runGateCommand(step.value);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  if (isReusableGateStep(step)) recordGateStep(step.value, gateId);
}
