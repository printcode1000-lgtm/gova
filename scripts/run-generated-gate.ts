import { spawnSync } from 'node:child_process';
import {
  generatedGateIds,
  resolveGeneratedGate,
  type GeneratedGateId,
} from './generated-gates';
import { verifyGeneratedGateContract } from './generated-gate-contract';

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

function runNpmScript(script: string) {
  const npmCli = process.env.npm_execpath?.trim();
  if (npmCli) {
    return spawnSync(process.execPath, [npmCli, 'run', script], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
  }

  if (process.platform === 'win32') {
    if (!/^[A-Za-z0-9:_-]+$/.test(script)) {
      throw new Error(`Unsafe npm script name for Windows command execution: ${script}`);
    }
    return spawnSync(process.env.ComSpec?.trim() || 'cmd.exe', ['/d', '/s', '/c', `npm.cmd run ${script}`], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });
  }

  return spawnSync('npm', ['run', script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
}

const steps = resolveGeneratedGate(gateId);
console.log(`[gate:${gateId}] ${steps.length} generated step(s).`);

for (let index = 0; index < steps.length; index += 1) {
  const step = steps[index]!;
  const label = step.kind === 'npm-script' ? `npm run ${step.value}` : step.value;
  console.log(`\n[gate:${gateId}] ${index + 1}/${steps.length}: ${label}`);
  const result = step.kind === 'npm-script'
    ? runNpmScript(step.value)
    : spawnSync(step.value, {
        cwd: process.cwd(),
        env: process.env,
        shell: true,
        stdio: 'inherit',
      });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
