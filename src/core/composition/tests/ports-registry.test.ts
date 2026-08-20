import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Every port seam in the application is called from a composition root.
 *
 * A seam is a module that calls a package's `configure<Name>Core(...)`. Each of those ports
 * defaults safely — telemetry no-ops, identity predicates fail closed — which is precisely why a
 * forgotten registration is invisible: the application keeps working and quietly loses the
 * behaviour. That has already happened once here, to the OTA ports during splash.
 *
 * So the rule is mechanical rather than conventional: if a file registers ports, one of the two
 * roots must call it.
 */
const APP_SRC = path.join(process.cwd(), 'src');
const ROOTS = [
  'src/core/composition/browser-ports.ts',
  'src/core/composition/server-ports.ts',
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const rootText = ROOTS.map((rel) => readFileSync(path.join(process.cwd(), rel), 'utf8')).join('\n');

const seams: string[] = [];
for (const file of sourceFiles(APP_SRC)) {
  const relative = path.relative(process.cwd(), file).split(path.sep).join('/');
  if (ROOTS.includes(relative) || relative.includes('/tests/')) continue;

  const content = readFileSync(file, 'utf8');
  if (!/\bconfigure[A-Z][A-Za-z]*Core\s*\(/.test(content)) continue;

  const exported = content.match(/export function (register[A-Za-z]+)\s*\(/);
  assert.ok(
    exported,
    `${relative} configures a package's ports but exports no register* function, so no root ` +
      'can call it. A seam that cannot be composed registers only for whoever imports it.',
  );
  seams.push(relative);

  assert.ok(
    rootText.includes(exported[1]!),
    `${relative} registers ports through ${exported[1]}(), which no composition root calls. ` +
      `Add it to one of: ${ROOTS.join(', ')} — every port here defaults safely, so a missing ` +
      'registration is silent by design.',
  );
}

assert.ok(
  seams.length >= 4,
  `Found only ${seams.length} port seams. Either the scan is broken or the convention changed — ` +
    'a check that examines nothing passes for the wrong reason.',
);

console.log(`  ✔ composition roots: all ${seams.length} port seams registered from a root.`);
