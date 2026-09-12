import { execFileSync } from 'node:child_process';

import { SIMULATION_ACTORS } from '@asol/simulation-core';

const ports = [3001, ...SIMULATION_ACTORS.map((actor) => actor.port)];
const remove = process.argv.includes('--remove');

function adb(args: string[]): string {
  return execFileSync('adb', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

try {
  if (adb(['get-state']) !== 'device') throw new Error('Android device is not ready');
  for (const port of ports) {
    const spec = `tcp:${port}`;
    if (remove) adb(['reverse', '--remove', spec]);
    else adb(['reverse', spec, spec]);
  }
  console.log(remove
    ? `Removed simulation ADB reverse ports: ${ports.join(', ')}`
    : `Simulation ADB reverse ready: ${ports.join(', ')}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
