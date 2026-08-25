import assert from 'node:assert/strict';

import { extractImports } from '../checks/architecture-types';
import {
  APPLICATION_CYCLE_SUBGRAPH,
  findApplicationClusterCycles,
} from '../checks/application-cycle-contract';

function graphOf(edges: Record<string, readonly string[]>): Map<string, Map<string, string>> {
  const graph = new Map<string, Map<string, string>>();
  for (const [from, targets] of Object.entries(edges)) {
    graph.set(from, new Map(targets.map((target) => [target, `${from}.ts`])));
  }
  return graph;
}

{
  const staticImports = extractImports(
    `import { useSession } from '@/features/auth/ui';\n`,
  );
  assert.deepEqual(staticImports, ['@/features/auth/ui']);

  const dynamicImports = extractImports(
    `const mod = await import('@/features/profile/ui');\n`,
  );
  assert.ok(dynamicImports.includes('@/features/profile/ui'));

  const reexportImports = extractImports(
    `export { ProductAddToCartButton } from '@/features/cart/ui';\n`,
  );
  assert.deepEqual(reexportImports, ['@/features/cart/ui']);
}

{
  const cycles = findApplicationClusterCycles(
    graphOf({
      'feature:auth': ['feature:profile'],
      'feature:profile': ['feature:auth'],
    }),
  );
  assert.equal(cycles.length, 1, 'static two-node cycle must be reported');
  assert.ok(cycles[0]?.includes('feature:auth') && cycles[0]?.includes('feature:profile'));
}

{
  const cycles = findApplicationClusterCycles(
    graphOf({
      'feature:product': ['feature:cart'],
      'feature:cart': ['feature:profile'],
      'feature:profile': ['feature:product'],
    }),
  );
  assert.equal(cycles.length, 1, 'three-node cycle must be reported');
}

{
  assert.ok(!APPLICATION_CYCLE_SUBGRAPH.has('shared:session-runtime'));
  const cycles = findApplicationClusterCycles(
    graphOf({
      'feature:auth': ['shared:session-runtime'],
      'shared:session-runtime': ['feature:auth'],
      'feature:profile': ['shared:session-runtime'],
    }),
  );
  assert.deepEqual(
    cycles,
    [],
    'edges through clusters outside APPLICATION_CYCLE_SUBGRAPH must not close a cycle',
  );
}

{
  const live = findApplicationClusterCycles();
  assert.deepEqual(
    live,
    [],
    `live application subgraph must have zero cycles, found ${JSON.stringify(live)}`,
  );
}

console.log('  ✔ application cycle contract: static/dynamic/re-export detection; live graph empty.');
