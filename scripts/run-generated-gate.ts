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

const steps = resolveGeneratedGate(gateId);
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
console.log(`[gate:${gateId}] ${steps.length} generated step(s).`);

for (let index = 0; index < steps.length; index += 1) {
  const step = steps[index]!;
  const label = step.kind === 'npm-script' ? `npm run ${step.value}` : step.value;
  console.log(`\n[gate:${gateId}] ${index + 1}/${steps.length}: ${label}`);
  const result = step.kind === 'npm-script'
    ? spawnSync(npmBin, ['run', step.value], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
      })
    : spawnSync(step.value, {
        cwd: process.cwd(),
        env: process.env,
        shell: true,
        stdio: 'inherit',
      });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
