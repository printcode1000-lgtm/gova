import assert from 'node:assert/strict';

import { hostMultiplicity, symbolKey } from '../dom-identity/repetition';

function multiplicity(files: Record<string, string>) {
  return hostMultiplicity(new Map(Object.entries(files)));
}

{
  const result = multiplicity({
    'src/widget.tsx': 'export function Widget() { return <div />; }',
    'src/page-a.tsx': 'import { Widget } from "./widget"; export function PageA() { return <Widget />; }',
    'src/page-b.tsx': 'import { Widget } from "./widget"; export function PageB() { return <Widget />; }',
  });
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/widget.tsx', 'Widget')),
    false,
    'One usage in each unrelated render root must not be treated as simultaneous multiplicity.',
  );
}

{
  const result = multiplicity({
    'src/widget.tsx': 'export function Widget() { return <div />; }',
    'src/dashboard.tsx': [
      'import { Widget } from "./widget";',
      'export function Dashboard() { return <><Widget /><Widget /></>; }',
    ].join('\n'),
  });
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/widget.tsx', 'Widget')),
    true,
    'Two usages in the same host template must be repeated.',
  );
}

{
  const result = multiplicity({
    'src/widget.tsx': 'export function Widget() { return <div />; }',
    'src/dashboard.tsx': [
      'import { Widget } from "./widget";',
      'export function Dashboard({ ready }: { ready: boolean }) {',
      '  return ready ? <Widget /> : <Widget />;',
      '}',
    ].join('\n'),
  });
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/widget.tsx', 'Widget')),
    false,
    'Opposite ternary branches are mutually exclusive and must count as one runtime copy.',
  );
}

{
  const result = multiplicity({
    'src/widget.tsx': 'export function Widget() { return <div />; }',
    'src/dashboard.tsx': [
      'import { Widget } from "./widget";',
      'export function Dashboard({ ready }: { ready: boolean }) {',
      '  if (ready) return <Widget />;',
      '  else return <Widget />;',
      '}',
    ].join('\n'),
  });
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/widget.tsx', 'Widget')),
    false,
    'Opposite if/else branches are mutually exclusive and must count as one runtime copy.',
  );
}

{
  const result = multiplicity({
    'src/widget.tsx': 'export function Widget() { return <div />; }',
    'src/dashboard.tsx': [
      'import { Suspense } from "react";',
      'import { Widget } from "./widget";',
      'export function Dashboard() {',
      '  return <Suspense fallback={<Widget />}><Widget /></Suspense>;',
      '}',
    ].join('\n'),
  });
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/widget.tsx', 'Widget')),
    false,
    'Suspense fallback and resolved children are mutually exclusive runtime branches.',
  );
}

{
  const result = multiplicity({
    'src/widget.tsx': 'export function Widget() { return <div />; }',
    'src/dashboard.tsx': [
      'import { Widget } from "./widget";',
      'export function Dashboard({ a, b }: { a: boolean; b: boolean }) {',
      '  return <>{a ? <Widget /> : null}{b ? <Widget /> : null}</>;',
      '}',
    ].join('\n'),
  });
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/widget.tsx', 'Widget')),
    true,
    'Independent conditionals can both render and therefore remain multiplicity.',
  );
}

{
  const result = multiplicity({
    'src/leaf.tsx': 'export function Leaf() { return <span />; }',
    'src/left.tsx': 'import { Leaf } from "./leaf"; export function Left() { return <Leaf />; }',
    'src/right.tsx': 'import { Leaf } from "./leaf"; export function Right() { return <Leaf />; }',
    'src/dashboard.tsx': [
      'import { Left } from "./left";',
      'import { Right } from "./right";',
      'export function Dashboard() { return <><Left /><Right /></>; }',
    ].join('\n'),
  });
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/leaf.tsx', 'Leaf')),
    true,
    'Two sibling render paths converging on the same child must mark that child repeated.',
  );
}

{
  const result = multiplicity({
    'src/leaf.tsx': 'export function Leaf() { return <span />; }',
    'src/card.tsx': 'import { Leaf } from "./leaf"; export function Card() { return <Leaf />; }',
    'src/list.tsx': [
      'import { Card } from "./card";',
      'export function List() { return <>{[1, 2].map((value) => <Card key={value} />)}</>; }',
    ].join('\n'),
  });
  assert.equal(result.repeatingSymbols.has(symbolKey('src/card.tsx', 'Card')), true);
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/leaf.tsx', 'Leaf')),
    true,
    'Multiplicity from an iterator must propagate through the repeated component template.',
  );
}

{
  const result = multiplicity({
    'src/tree.tsx': [
      'export function TreeItem({ nested = false }: { nested?: boolean }) {',
      '  return <div>{nested ? <TreeItem /> : null}</div>;',
      '}',
    ].join('\n'),
  });
  assert.equal(
    result.repeatingSymbols.has(symbolKey('src/tree.tsx', 'TreeItem')),
    true,
    'Recursive component cycles must converge to repeated multiplicity.',
  );
}

console.log('DOM identity render-graph multiplicity tests passed.');
