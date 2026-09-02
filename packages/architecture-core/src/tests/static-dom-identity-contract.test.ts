import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  scanStaticDomIdentities,
  writeStaticDomIdentityManifest,
  type StaticDomIdentityViolation,
} from '../index';

function withFixture(files: Record<string, string>, run: (root: string) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'static-dom-id-'));
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

function violationsFor(source: string): readonly StaticDomIdentityViolation[] {
  let violations: readonly StaticDomIdentityViolation[] = [];
  withFixture({ 'src/app/page.tsx': source }, (root) => {
    violations = scanStaticDomIdentities({ root, validateManifest: false }).violations;
  });
  return violations;
}

function types(source: string): readonly string[] {
  return violationsFor(source).map((violation) => violation.type);
}

assert.deepEqual(
  types('export default function Page() { return <main id="home-main-root-a1b2c3" />; }'),
  [],
  'valid static element passes',
);

assert.ok(
  types('export default function Page() { return <button>Save</button>; }').includes('missing-id'),
  'static element without id fails',
);

assert.ok(
  types('export default function Page() { return <button id="">Save</button>; }').includes('empty-id'),
  'empty id fails',
);

assert.ok(
  types(
    'export default function Page() { return <><button id="account-save-button-a1b2c3" /><button id="account-save-button-a1b2c3" /></>; }',
  ).includes('duplicate-id'),
  'duplicate permanent id fails',
);

assert.ok(
  types('export default function Page() { return <button id={crypto.randomUUID()}>Save</button>; }').includes(
    'runtime-generated-id',
  ),
  'runtime generated id fails',
);

assert.ok(
  types('import { useId } from "react"; export default function Page() { return <button id={useId()}>Save</button>; }').includes(
    'forbidden-use-id',
  ),
  'useId as static identity fails',
);

assert.ok(
  types(
    'export default function Page({ items }: { items: string[] }) { return <section>{items.map((item) => <div>{item}</div>)}</section>; }',
  ).includes('missing-id'),
  'static parent around dynamic map children is still checked',
);

assert.deepEqual(
  types(
    'export default function Page({ items }: { items: string[] }) { return <section id="home-list-section-a1b2c3">{items.map((item) => <div>{item}</div>)}</section>; }',
  ),
  [],
  'dynamic map DOM element is excluded',
);

assert.deepEqual(
  types('function Header() { return <header id="shared-header-root-a1b2c3" />; }'),
  [],
  'shared single-instance component with literal id passes',
);

assert.deepEqual(
  types(
    'function SharedCard({ elementScope }: { elementScope: string }) { return <div id={`${elementScope}-card-root-a1b2c3`} />; }',
  ),
  [],
  'repeatable shared component with explicit stable namespace passes',
);

assert.ok(
  types(
    'function SharedCard() { return <div id="shared-card-root-a1b2c3" />; } export default function Page() { return <><SharedCard /><SharedCard /><div id="shared-card-root-a1b2c3" /></>; }',
  ).includes('duplicate-id'),
  'repeatable shared duplicate id risk fails when duplicated in source',
);

assert.ok(types('function Card() { return <div><span id="shared-card-label-a1b2c3" /></div>; }').includes('missing-id'));

withFixture(
  {
    'src/app/page.tsx':
      'export default function Page() { return <main id="home-main-root-a1b2c3"><section id="home-main-section-d4e5f6" /></main>; }',
  },
  (root) => {
    const written = writeStaticDomIdentityManifest(root);
    const checked = scanStaticDomIdentities({ root });
    assert.equal(written.entries.length, 2);
    assert.equal(checked.violations.length, 0);
    assert.deepEqual(
      written.entries.map((entry) => entry.id),
      writeStaticDomIdentityManifest(root).entries.map((entry) => entry.id),
      'registry regeneration keeps valid IDs stable',
    );
  },
);

withFixture(
  {
    'src/app/page.tsx': `export default function Page({count}:{count:number}){return <section id="page-dots-root-a1b2c3">{Array.from({length:count},(_,i)=><button id="page-dot-button-d4e5f6" key={i}/>)}</section>}`,
  },
  (root) => {
    const types = scanStaticDomIdentities({ root, validateManifest: false }).violations.map((v) => v.type);
    assert.ok(types.includes('dynamic-literal-id'), 'literal ids inside Array.from mapper must fail');
  },
);


assert.ok(
  types('import { useId } from "react"; export default function Page() { const id = useId(); return <button id={id}>Save</button>; }').includes('forbidden-use-id'),
  'useId assigned to a local variable fails',
);

assert.ok(
  types('import * as React from "react"; export default function Page() { const id = React.useId(); return <button id={id}>Save</button>; }').includes('forbidden-use-id'),
  'React.useId assigned to a local variable fails',
);

assert.ok(
  types('export default function Page() { const id = "local"; return <button id={id}>Save</button>; }').includes('invalid-format'),
  'invalid local id fails',
);

assert.deepEqual(
  types('function Action({ id }: { id: string }) { return <button id="action-button-root-a1b2c3" />; } export default function Page(){ return <Action id={businessId} />; }'),
  [],
  'custom component business id is not treated as DOM identity',
);

assert.deepEqual(
  types('function Shared({ elementScope }: { elementScope?: string }) { return <div id={elementScope ? `${elementScope}-root-a1b2c3` : undefined} />; }'),
  [],
  'optional caller scope is accepted',
);
