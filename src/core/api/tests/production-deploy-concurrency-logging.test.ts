import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * A running deployment is a business state, not a server fault.
 *
 * `productionDeployAlreadyRunning` means the single-deploy lock refused a second
 * start. The workflow polls while it waits, so logging that refusal turned every
 * poll into a `server.error` event and buried the failures that actually matter.
 *
 * The distinction is what these assertions protect, in both directions: this one
 * 409 must stay quiet, and every other 409 must keep logging. Asserting only the
 * first half would let a future change silence real conflicts and still pass.
 *
 * Read as source rather than executed because the logging decision is a branch
 * in a module that pulls in Next server runtime, system-log persistence and dev
 * tracing. Importing all of that to observe one absent call would test the
 * harness, not the contract.
 */

const source = readFileSync('src/core/api/api-response.ts', 'utf8');

/** Each `if (message === '…') { … }` block that returns a 409. */
function branchesReturning409(): Array<{ code: string; body: string }> {
  const found: Array<{ code: string; body: string }> = [];
  const pattern = /if \(message === '([A-Za-z]+)'\) \{([\s\S]*?)\n  \}/g;
  for (const match of source.matchAll(pattern)) {
    const body = match[2]!;
    if (/apiError\(message, 409/.test(body)) found.push({ code: match[1]!, body });
  }
  return found;
}

const branches = branchesReturning409();
assert.ok(branches.length > 0, 'the 409 branches must be findable, or this test proves nothing');

const expected = branches.find((branch) => branch.code === 'productionDeployAlreadyRunning');
assert.ok(expected, 'the expected-concurrency branch must exist; the lock still has to answer 409');

// Half one: the expected state stays quiet.
assert.doesNotMatch(
  expected.body,
  /logMappedServiceError/,
  'productionDeployAlreadyRunning must not log — it is the concurrency lock working, and the workflow polls it',
);
assert.match(
  expected.body,
  /skipPersistence: true/,
  'it must still skip persistence, so the refusal never lands in the system log store',
);
assert.match(expected.body, /apiError\(message, 409/, 'and it must still answer 409, so the lock is still enforced');

// Half two: everything else stays loud. This is what keeps the fix honest —
// silencing failures generally would satisfy the first half on its own.
//
// `productionDeployAlreadyRunning` is currently the ONLY branch returning 409, so
// looping over the others proves nothing today; it is a forward guard for the day
// a second conflict code is added. The assertion that has teeth right now is that
// the sibling deploy branches, which represent real faults, still log.
for (const branch of branches) {
  if (branch.code === 'productionDeployAlreadyRunning') continue;
  assert.match(
    branch.body,
    /logMappedServiceError\(error, message, 409\)/,
    `${branch.code} returns 409 and must still be logged; an unexpected conflict has to stay observable`,
  );
}

const stillLogged = ['productionDeployCallbackRejected', 'productionDeployNotConfigured'];
for (const code of stillLogged) {
  const branch = new RegExp(`if \\(message === '${code}'\\) \\{([\\s\\S]*?)\\n  \\}`).exec(source);
  assert.ok(branch, `${code} must still be handled`);
  assert.match(
    branch[1]!,
    /logMappedServiceError/,
    `${code} is a real fault and must stay logged; quieting the concurrency state must not quiet its siblings`,
  );
}

// And the catch-all for anything unrecognised must still log, or a genuine
// deployment failure would vanish along with the noise.
assert.match(
  source,
  /logServerSystemIssue|logMappedServiceError/,
  'the unmapped error path must still report',
);

// The code must remain a known business code, or `sanitizeApiErrorCodeForClient`
// would rewrite it and the workflow's exact-match check on the response body
// would silently stop recognising the state it waits for.
const codes = readFileSync('src/core/api/business-api-error-codes.ts', 'utf8');
assert.match(
  codes,
  /'productionDeployAlreadyRunning'/,
  'the code must stay declared, so the client receives it verbatim and the workflow can match it',
);

console.log('production deploy concurrency logging: all checks passed.');
