/**
 * Rename competing feature folder conventions to the canonical vocabulary:
 * entities → domain, components → presentation.
 */
import { readdirSync, existsSync, cpSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const FEATURES = 'src/features';
const features = readdirSync(FEATURES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const moves: Array<{ from: string; to: string }> = [];

for (const f of features) {
  const root = join(FEATURES, f);
  const entities = join(root, 'entities');
  const domain = join(root, 'domain');
  const components = join(root, 'components');
  const presentation = join(root, 'presentation');

  if (existsSync(entities)) {
    cpSync(entities, domain, { recursive: true });
    rmSync(entities, { recursive: true });
    moves.push({
      from: `src/features/${f}/entities`,
      to: `src/features/${f}/domain`,
    });
  }

  if (existsSync(components)) {
    cpSync(components, presentation, { recursive: true });
    rmSync(components, { recursive: true });
    moves.push({
      from: `src/features/${f}/components`,
      to: `src/features/${f}/presentation`,
    });
  }
}

console.log('Moves:', moves.length);
for (const m of moves) console.log(`  ${m.from} → ${m.to}`);

const SKIP = new Set(['node_modules', '.git', '.next', 'out', 'android', 'ios']);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs|cjs|md|json)$/.test(e.name)) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(process.cwd())) {
  const text = readFileSync(file, 'utf8');
  let next = text;
  for (const m of moves) {
    const fromAlias = m.from.replace('src/', '@/');
    const toAlias = m.to.replace('src/', '@/');
    next = next.split(fromAlias).join(toAlias);
    next = next.split(m.from).join(m.to);
  }
  if (next !== text) {
    writeFileSync(file, next);
    changed += 1;
  }
}
console.log(`Import rewrites in ${changed} files`);
