import {
  collectServiceSourceFiles,
  collectSpecifiers,
  resolveModule,
} from '@asol/service-mirror-core';
import path from 'path';
import { readFileSync } from 'fs';
import { PRODUCTS_DECLARATION } from '@asol/account-declarations/products';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const publicRoot = path.join(root, 'public');
const packagesRoot = path.join(root, 'packages');
const serviceDir = path.join(root, PRODUCTS_DECLARATION.serviceDir as string);
const serviceOwnFiles = collectServiceSourceFiles(path.join(serviceDir, 'src'));
const serviceSrcRoot = path.join(serviceDir, 'src');

const parent = new Map<string, { from: string; spec: string } | null>();
const queue: string[] = [];

for (const entry of PRODUCTS_DECLARATION.mirrorEntryPoints) {
  const absolute = path.join(sourceRoot, entry);
  queue.push(absolute);
  parent.set(absolute, null);
}
for (const file of serviceOwnFiles) {
  queue.push(file);
  if (!parent.has(file)) parent.set(file, null);
}

const visited = new Set<string>();
while (queue.length > 0) {
  const current = queue.pop()!;
  if (visited.has(current)) continue;
  visited.add(current);
  if (current.endsWith('.json')) continue;
  const content = readFileSync(current, 'utf8');
  for (const specifier of collectSpecifiers(content)) {
    const resolved = resolveModule(specifier, current, sourceRoot, packagesRoot);
    if (!resolved) continue;
    const ok =
      resolved.startsWith(sourceRoot) ||
      resolved.startsWith(publicRoot) ||
      resolved.startsWith(packagesRoot) ||
      resolved.startsWith(serviceSrcRoot);
    if (!ok) continue;
    if (!parent.has(resolved)) {
      parent.set(resolved, { from: current, spec: specifier });
      queue.push(resolved);
    }
  }
}

function chain(target: string): string {
  const steps: string[] = [];
  let cur: string | undefined = target;
  while (cur) {
    steps.push(path.relative(root, cur));
    const link = parent.get(cur);
    if (!link) break;
    steps.push(`  ← ${link.spec}`);
    cur = link.from;
  }
  return steps.join('\n');
}

const targets = [...visited].filter((file) =>
  /asol-db-persister|query-observer|query-provider|browser\/index|native-core\/src\/index\.|adapters\/index/.test(
    file,
  ),
);

for (const target of targets.slice(0, 10)) {
  console.log('====', path.relative(root, target));
  console.log(chain(target));
  console.log();
}

const interesting = [
  '@asol/data-core/browser',
  '@asol/native-core',
  '@/core/providers/query-provider',
  '@asol/observability-core',
];
for (const [file, link] of parent) {
  if (!link) continue;
  if (interesting.some((item) => link.spec === item || link.spec.startsWith(`${item}/`))) {
    console.log(
      'EDGE',
      path.relative(root, link.from),
      '→',
      link.spec,
      '→',
      path.relative(root, file),
    );
  }
}

console.log('visited', visited.size);
