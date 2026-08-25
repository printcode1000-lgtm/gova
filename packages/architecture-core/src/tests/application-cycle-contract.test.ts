import assert from 'node:assert/strict';

import { extractImports } from '../checks/architecture-types';
import {
  KNOWN_APPLICATION_CYCLE_BASELINE,
  applicationCycleBaselineViolations,
  cyclicApplicationEdgeSignatures,
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
  const cycles = findApplicationClusterCycles(
    graphOf({
      'feature:auth': ['shared:session-runtime'],
      'shared:session-runtime': ['feature:auth'],
      'feature:profile': ['shared:session-runtime'],
    }),
  );
  assert.equal(cycles.length, 1, 'all discovered shared/core/feature clusters must close cycles');
  assert.deepEqual(cycles[0], ['feature:auth', 'shared:session-runtime']);
  assert.equal(
    applicationCycleBaselineViolations(
      graphOf({
        'feature:auth': ['shared:session-runtime'],
        'shared:session-runtime': ['feature:auth'],
      }),
    ).unexpected.length,
    1,
    'a new cycle outside the historical hand-picked scope must be rejected',
  );
}

{
  const original = graphOf({
    'feature:a': ['feature:b'],
    'feature:b': ['feature:a', 'feature:c'],
    'feature:c': ['feature:b'],
  });
  const expanded = graphOf({
    'feature:a': ['feature:b', 'feature:c'],
    'feature:b': ['feature:a', 'feature:c'],
    'feature:c': ['feature:b'],
  });
  assert.deepEqual(findApplicationClusterCycles(original), findApplicationClusterCycles(expanded));
  assert.deepEqual(
    cyclicApplicationEdgeSignatures(expanded).filter(
      (edge) => !cyclicApplicationEdgeSignatures(original).includes(edge),
    ),
    ['feature:a -> feature:c'],
    'adding a cyclic edge inside an existing SCC must appear as an exact new edge',
  );
}

{
  const live = findApplicationClusterCycles();
  assert.deepEqual(
    live,
    KNOWN_APPLICATION_CYCLE_BASELINE.map((component) => [...component]).sort((left, right) =>
      left.join('|').localeCompare(right.join('|')),
    ),
    `live application cycles must match the audited baseline, found ${JSON.stringify(live)}`,
  );
  assert.deepEqual(applicationCycleBaselineViolations(), {
    unexpected: [],
    stale: [],
    unexpectedCyclicEdges: [],
    staleCyclicEdges: [],
  });
}

console.log('  ✔ application cycle contract: repository-wide discovery and audited baseline enforced.');
