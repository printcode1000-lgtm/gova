#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { buildAppInitScript } from '../src/lib/app-init/build-app-init-script';

const ROOT = join(__dirname, '..');
const SCRIPT = `${buildAppInitScript()}\n`;

const publicDir = join(ROOT, 'public');
mkdirSync(publicDir, { recursive: true });

for (const filename of ['asol-app-init.js', 'asol-theme-init.js'] as const) {
  const output = join(publicDir, filename);
  writeFileSync(output, SCRIPT, 'utf8');
  console.log(`✅ Wrote ${output.replace(ROOT, '.')}`);
}
