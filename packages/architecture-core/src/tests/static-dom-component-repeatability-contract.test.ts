import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { scanStaticDomComponentRepeatability, scanStaticDomIdentities } from '../index';

function fixture(files: Record<string, string>, run: (root: string) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'static-dom-repeatability-'));
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

fixture({
  'src/app/page.tsx': `import { useId } from 'react'; export default function Page(){ const id=useId(); return <main id={id}/>; }`,
}, (root) => {
  const types = scanStaticDomIdentities({ root, validateManifest: false }).violations.map((v) => v.type);
  assert.ok(types.includes('forbidden-use-id'), 'indirect useId binding must fail');
});

fixture({
  'src/app/page.tsx': `export default function Page(){ const id='bad-local-id'; return <main id={id}/>; }`,
}, (root) => {
  const types = scanStaticDomIdentities({ root, validateManifest: false }).violations.map((v) => v.type);
  assert.ok(types.includes('invalid-format'), 'invalid local id binding must fail');
});

fixture({
  'src/app/page.tsx': `export default function Page({count}:{count:number}){ return <section id="home-dots-root-a1b2c3">{Array.from({length:count},(_,i)=><button key={i}/>)}</section>; }`,
}, (root) => {
  const result = scanStaticDomIdentities({ root, validateManifest: false });
  assert.deepEqual(result.violations, [], 'Array.from mapper DOM is dynamic and excluded while static parent remains checked');
  assert.equal(result.entries.length, 1);
});

fixture({
  'src/shared/ui/input.tsx': `import * as React from 'react'; export const Input=React.forwardRef<HTMLInputElement,React.InputHTMLAttributes<HTMLInputElement>>((props,ref)=><input id="shared-input-root-a1b2c3" ref={ref} {...props}/>);`,
  'src/app/page.tsx': `import { Input } from '@/shared/ui/input'; export default function Page(){return <><Input/><Input/></>}`,
}, (root) => {
  const types = scanStaticDomComponentRepeatability({ root }).violations.map((v) => v.type);
  assert.ok(types.includes('repeatable-component-literal-id'), 'repeated shared component with literal internal id must fail');
});

fixture({
  'src/features/list.tsx': `function Row(){return <div id="row-inner-root-a1b2c3"/>} export default function List({items}:{items:string[]}){return <section id="list-root-main-d4e5f6">{items.map((x)=><Row key={x}/>)}</section>}`,
}, (root) => {
  const types = scanStaticDomComponentRepeatability({ root }).violations.map((v) => v.type);
  assert.ok(types.includes('repeatable-component-literal-id'), 'component invoked from map is repeatable and cannot own literal ids');
});

fixture({
  'src/shared/ui/input.tsx': `import * as React from 'react'; export const Input=React.forwardRef<HTMLInputElement,React.InputHTMLAttributes<HTMLInputElement>>(({id,...props},ref)=><input id={id} ref={ref} {...props}/>);`,
  'src/app/page.tsx': `import { Input } from '@/shared/ui/input'; export default function Page(){return <><Input id="page-name-input-a1b2c3"/><Input id="page-email-input-d4e5f6"/></>}`,
}, (root) => {
  assert.deepEqual(scanStaticDomComponentRepeatability({ root }).violations, [], 'repeatable shared component forwarding distinct static ids passes');
});

fixture({
  'src/features/list.tsx': `function Row(){return <div/>} export default function List({items}:{items:string[]}){return <section id="list-root-main-a1b2c3">{items.map((x)=><Row key={x}/>)}</section>}`,
}, (root) => {
  const result = scanStaticDomComponentRepeatability({ root });
  assert.ok(result.dynamicOnlyComponents.some((key) => key.endsWith('#Row')), 'map-only component is dynamic-only');
  const staticResult = scanStaticDomIdentities({ root, validateManifest: false });
  assert.deepEqual(staticResult.violations, [], 'DOM inside dynamic-only component is excluded from static identity');
});

fixture({
  'src/features/list.tsx': `function Row(){return <div id="row-root-main-a1b2c3"/>} export default function List({items}:{items:string[]}){return <><section id="list-root-main-d4e5f6">{items.map((x)=><Row key={x}/>)}</section><Row/></>}`,
}, (root) => {
  const result = scanStaticDomComponentRepeatability({ root });
  assert.ok(!result.dynamicOnlyComponents.some((key) => key.endsWith('#Row')), 'mixed static/dynamic component is not dynamic-only');
});


fixture(
  {
    'src/features/shared.tsx': 'export function Tile(){return <div id="tile-root-main-a1b2c3"/>}',
    'src/app/page.tsx': 'import {Tile} from "../features/shared"; export default function Page(){return <><Tile/><Tile/></>}',
  },
  (root) => {
    const violationTypes = scanStaticDomComponentRepeatability({ root }).violations.map((v) => v.type);
    assert.ok(violationTypes.includes('repeatable-component-literal-id'), 'two static siblings make component repeatable');
  },
);

fixture(
  {
    'src/features/child.tsx': 'export function Child({id}:{id?:string}){return <div id={id ? `${id}-root-a1b2c3` : undefined}/>} ',
    'src/features/parent.tsx': 'import {Child} from "./child"; export function Parent({id}:{id?:string}){return <section id={id ? `${id}-root-b1c2d3` : undefined}><Child id="fixed-child-root-c1d2e3"/></section>} ',
    'src/app/page.tsx': 'import {Parent} from "../features/parent"; export default function Page(){return <><Parent id="page-one-root-d1e2f3"/><Parent id="page-two-root-e1f2g3"/></>}',
  },
  (root) => {
    const types = scanStaticDomComponentRepeatability({ root }).violations.map((v) => v.type);
    assert.ok(types.includes('repeatable-parent-unscoped-id'), 'repeatable parent cannot pass a fixed child scope');
  },
);

fixture(
  {
    'src/features/child.tsx': 'export function Child({id}:{id?:string}){return <div id={id ? `${id}-root-a1b2c3` : undefined}/>} ',
    'src/features/parent.tsx': 'import {Child} from "./child"; export function Parent({id}:{id?:string}){return <section id={id ? `${id}-root-b1c2d3` : undefined}><Child id={id ? `${id}-child-c1d2e3` : undefined}/></section>} ',
    'src/app/page.tsx': 'import {Parent} from "../features/parent"; export default function Page(){return <><Parent id="page-one-root-d1e2f3"/><Parent id="page-two-root-e1f2g3"/></>}',
  },
  (root) => {
    const relevant = scanStaticDomComponentRepeatability({ root }).violations.filter((v) => v.type === 'repeatable-parent-unscoped-id');
    assert.equal(relevant.length, 0, 'scoped child identity derived from repeatable parent passes');
  },
);


fixture(
  {
    'src/shared/ui/child.tsx': 'export function Child({id}:{id?:string}){return <div id={id ? `${id}-root-a1b2c3` : undefined}/>} ',
    'src/features/parent.tsx': 'import {Child} from "@/shared/ui/child"; export function Parent({id}:{id?:string}){return <section id={id ? `${id}-root-b1c2d3` : undefined}><Child id={id ? `${id}-child-c1d2e3` : undefined}/></section>} ',
    'src/app/page.tsx': 'import {Parent} from "../features/parent"; import {Child} from "../shared/ui/child"; export default function Page(){return <><Parent id="page-parent-root-d1e2f3"/><Child id="page-direct-root-e1f2g3"/></>}',
  },
  (root) => {
    const relevant = scanStaticDomComponentRepeatability({ root }).violations.filter(
      (v) => v.component === 'Child' && v.type === 'static-component-invalid-id',
    );
    assert.equal(relevant.length, 0, 'conditional scoped placement in a static parent passes');
  },
);
