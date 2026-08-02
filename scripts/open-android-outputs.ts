#!/usr/bin/env tsx
/**
 * Opens the folder holding the freshly built Android packages in the OS file
 * manager. Falls back to the nearest existing parent when a build has not run
 * yet, so the command never fails just because `outputs/` is missing.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const CANDIDATES = [
  path.join('android', 'app', 'build', 'outputs'),
  path.join('android', 'app', 'build'),
  'android',
  '.',
];

const target = CANDIDATES.find((candidate) => existsSync(path.resolve(candidate)));
if (!target) {
  console.error('No Android output folder found in this project.');
  process.exit(1);
}

const absolute = path.resolve(target);
if (target !== CANDIDATES[0]) {
  console.log(`No build output yet — opening the closest existing folder instead.`);
}
console.log(`Opening ${absolute}`);

const [command, args] = process.platform === 'win32'
  ? ['explorer.exe', [absolute]]
  : process.platform === 'darwin'
    ? ['open', [absolute]]
    : ['xdg-open', [absolute]];

const child = spawn(command, args, { stdio: 'inherit', shell: false });
child.on('error', (error) => {
  console.error(`Failed to open the folder: ${error.message}`);
  process.exit(1);
});
// `explorer.exe` returns a non-zero code even when the window opens correctly.
child.on('close', (code) => {
  process.exit(process.platform === 'win32' ? 0 : code ?? 0);
});
