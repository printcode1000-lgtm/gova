import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { scanStaticDomRuntimeRegistry } from '../index';

function fixture(files: Record<string, string>, run: (root: string) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'static-dom-runtime-registry-'));
  try {
    for (const [file, content] of Object.entries(files)) {
      const full = path.join(root, file);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const registry = JSON.stringify({ version: 1, ids: { shell: { main: 'shell-main-root-a1b2c3' } } });
const registryImport = `import STATIC_DOM_IDS from '@/shared/dom/identity/static-ids.json';`;

fixture({
  'src/shared/dom/identity/static-ids.json': registry,
  'src/app/page.tsx': `${registryImport} export default function Page(){return <main id={STATIC_DOM_IDS.ids.shell.main}/>;}`,
}, (root) => {
  const result = scanStaticDomRuntimeRegistry({ root, requireShellConsumer: false });
  assert.deepEqual(result.violations, [], 'registered static DOM identity passes');
});

fixture({
  'src/shared/dom/identity/static-ids.json': registry,
  'src/app/page.tsx': `${registryImport} export default function Page(){return <main id={STATIC_DOM_IDS.ids.shell.main}/>;}`,
  'src/features/runtime.ts': `document.getElementById('unregistered-static-id-a1b2c3');`,
}, (root) => {
  const types = scanStaticDomRuntimeRegistry({ root, requireShellConsumer: false }).violations.map((v) => v.type);
  assert.ok(types.includes('unregistered-runtime-id'), 'unregistered getElementById target fails');
});

fixture({
  'src/shared/dom/identity/static-ids.json': registry,
  'src/app/page.tsx': `export default function Page(){return <main id="other-main-root-d4e5f6"/>;}`,
}, (root) => {
  const types = scanStaticDomRuntimeRegistry({ root, requireShellConsumer: false }).violations.map((v) => v.type);
  assert.ok(types.includes('stale-registry-id'), 'stale registry entry fails');
});

fixture({
  'src/shared/dom/identity/static-ids.json': registry,
  'src/app/page.tsx': `${registryImport} export default function Page(){return <main id={STATIC_DOM_IDS.ids.shell.main}/>;}`,
  'src/features/runtime.ts': registryImport + ' document.querySelector(`#${STATIC_DOM_IDS.ids.shell.main}`);',
}, (root) => {
  const result = scanStaticDomRuntimeRegistry({ root, requireShellConsumer: false });
  assert.deepEqual(result.violations, [], 'querySelector consuming a registered id passes');
});

fixture({
  'src/shared/dom/identity/static-ids.json': registry,
  'src/app/page.tsx': `export default function Page(){return <main id="shell-main-root-a1b2c3"/>;}`,
}, (root) => {
  const types = scanStaticDomRuntimeRegistry({ root, requireShellConsumer: false }).violations.map((v) => v.type);
  assert.ok(types.includes('registered-id-literal-duplication'), 'registered ids cannot be duplicated as literals');
});

fixture({
  'src/shared/dom/identity/static-ids.json': registry,
  'src/shared/layouts/AppShell.tsx': `${registryImport} export function AppShell(){return <main id={STATIC_DOM_IDS.ids.shell.main}/>;}`,
}, (root) => {
  const result = scanStaticDomRuntimeRegistry({ root });
  assert.deepEqual(result.violations, [], 'AppShell consumes the static id registry');
});

fixture({
  'src/shared/dom/identity/static-ids.json': JSON.stringify({ version: 1, ids: { a: 'same-root-id-a1b2c3', b: 'same-root-id-a1b2c3' } }),
}, (root) => {
  const types = scanStaticDomRuntimeRegistry({ root, requireShellConsumer: false }).violations.map((v) => v.type);
  assert.ok(types.includes('registry-duplicate-id'), 'duplicate registry values fail');
});
