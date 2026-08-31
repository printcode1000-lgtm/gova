import assert from 'node:assert/strict';

import {
  captureProductionBaseline,
  formatRollbackReport,
  rollbackSucceeded,
  rollbackToBaseline,
  type ProjectDeploymentBaseline,
} from '../release-rollback';

/**
 * Rollback is exercised without a secret, which is the only way it can be
 * exercised at all: a path that can only be tested against live Vercel is a path
 * nobody runs until the night it is needed.
 */
type Call = { url: string; method: string };

function stubFetch(handler: (url: string, init?: RequestInit) => Response, calls: Call[] = []) {
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? 'GET' });
    return handler(url, init);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const ACCESS = () => ({ token: 'test-token', teamId: 'team_1' });

// ── Capture records what production is serving, by id ────────────────────────
{
  const { fetchImpl } = stubFetch(() =>
    Response.json({ deployments: [{ uid: 'dpl_before', url: 'gova-before.vercel.app' }] }),
  );
  const baseline = await captureProductionBaseline(
    { account: 'gova', project: 'gova', token: 't' },
    fetchImpl,
  );
  assert.equal(baseline.deploymentId, 'dpl_before');
  assert.equal(baseline.url, 'https://gova-before.vercel.app');
  assert.ok(Date.parse(baseline.capturedAt) > 0);
}

// ── A project that does not exist yet is a baseline, not an error ────────────
//
// Control has no production deployment during the release that creates it, and
// that is exactly what the rollback needs to know in order to leave it alone.
{
  const { fetchImpl } = stubFetch(() => new Response('not found', { status: 404 }));
  const baseline = await captureProductionBaseline(
    { account: 'control', project: 'asol-control', token: 't' },
    fetchImpl,
  );
  assert.equal(baseline.deploymentId, undefined);
  assert.equal(baseline.account, 'control');
}

// ── Restore promotes the captured deployment, without rebuilding ─────────────
{
  const calls: Call[] = [];
  const { fetchImpl } = stubFetch((url) => {
    if (url.includes('/v9/projects/')) return Response.json({ id: 'prj_1' });
    return Response.json({});
  }, calls);

  const baselines: ProjectDeploymentBaseline[] = [
    { account: 'gova', project: 'gova', deploymentId: 'dpl_before', capturedAt: 'x' },
    { account: 'control', project: 'asol-control', capturedAt: 'x' },
  ];
  const outcomes = await rollbackToBaseline(baselines, ACCESS, fetchImpl);

  assert.deepEqual(
    outcomes.map((outcome) => [outcome.account, outcome.result]),
    [['gova', 'restored'], ['control', 'skipped']],
  );
  assert.ok(rollbackSucceeded(outcomes));

  const promote = calls.find((call) => call.url.includes('/promote/'));
  assert.ok(promote, 'the restore must promote an existing deployment');
  assert.equal(promote.method, 'POST');
  assert.match(promote.url, /\/promote\/dpl_before/);
  // A rebuild could fail for the same reason the release did.
  assert.equal(calls.some((call) => call.url.includes('/v13/deployments')), false);
  // The team is carried on every call, or a scoped token looks at the wrong account.
  assert.ok(calls.every((call) => call.url.includes('teamId=team_1')));
}

// ── One failure never stops the rest ─────────────────────────────────────────
//
// A rollback that aborts halfway leaves exactly the mixed topology it exists to
// prevent.
{
  const { fetchImpl } = stubFetch((url) => {
    if (url.includes('asol-control')) return new Response('nope', { status: 500 });
    if (url.includes('/v9/projects/')) return Response.json({ id: 'prj_1' });
    return Response.json({});
  });

  const outcomes = await rollbackToBaseline(
    [
      { account: 'control', project: 'asol-control', deploymentId: 'dpl_c', capturedAt: 'x' },
      { account: 'orders', project: 'orders', deploymentId: 'dpl_o', capturedAt: 'x' },
    ],
    ACCESS,
    fetchImpl,
  );

  assert.equal(outcomes.length, 2, 'every project must be attempted');
  assert.equal(outcomes[0]!.result, 'failed');
  assert.equal(outcomes[1]!.result, 'restored');
  assert.equal(rollbackSucceeded(outcomes), false);

  // The report is what a release log prints, so it must name projects, not secrets.
  const report = formatRollbackReport(outcomes);
  assert.match(report, /control \(asol-control\): failed/);
  assert.match(report, /orders \(orders\): restored/);
  assert.equal(report.includes('test-token'), false);
}

assert.equal(rollbackSucceeded([]), true);
assert.match(formatRollbackReport([]), /nothing to restore/);

console.log('@asol/vercel-deploy-core release rollback: baseline capture, promote-only restore, no early abort.');
