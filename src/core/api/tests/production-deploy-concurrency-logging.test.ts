import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { businessApiErrorStatus } from '@/core/api/business-api-error-status';

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
 * The status table moved out of `api-response.ts` when the control runtime had
 * to answer the same failures the same way, so the statuses are now asserted by
 * calling the mapping rather than by reading branches out of a file. The logging
 * decision stayed in `api-response.ts` — logging is not part of a pure mapping —
 * and is still read as source: importing that module to observe one absent call
 * pulls in the Next server runtime, system-log persistence, and dev tracing, and
 * would test the harness rather than the contract.
 */
const response = readFileSync('src/core/api/api-response.ts', 'utf8');
const table = readFileSync('src/core/api/business-api-error-status.ts', 'utf8');

// ── The lock still answers 409, and still never persists ─────────────────────
const concurrency = businessApiErrorStatus('productionDeployAlreadyRunning');
assert.equal(concurrency.status, 409, 'the lock has to answer 409');
assert.equal(concurrency.code, 'productionDeployAlreadyRunning');
assert.equal(
  concurrency.skipPersistence,
  true,
  'the refusal must never land in the system log store',
);

// ── Half one: the expected state stays quiet ─────────────────────────────────
const quiet = /const quiet =([\s\S]*?);\n/.exec(response);
assert.ok(quiet, 'the logging decision must be findable, or this test proves nothing');
assert.match(
  quiet[1]!,
  /productionDeployAlreadyRunning/,
  'productionDeployAlreadyRunning must not log — it is the concurrency lock working, and the workflow polls it',
);

// ── Half two: everything else stays loud ─────────────────────────────────────
//
// This is what keeps the fix honest: silencing failures generally would satisfy
// the first half on its own.
assert.match(
  response,
  /if \(!quiet\) void logMappedServiceError\(error, mapped\.code, mapped\.status\)/,
  'every failure that is not the concurrency state must still be reported',
);

// The sibling deploy states are real faults. They must keep their statuses and,
// because they are not in the quiet condition, they keep logging.
assert.equal(businessApiErrorStatus('productionDeployCallbackRejected').status, 403);
assert.equal(businessApiErrorStatus('productionDeployNotConfigured').status, 503);
for (const code of ['productionDeployCallbackRejected', 'productionDeployNotConfigured']) {
  assert.equal(
    quiet[1]!.includes(code),
    false,
    `${code} is a real fault and must stay logged; quieting the concurrency state must not quiet its siblings`,
  );
}

// ── An unrecognised failure is still a reported 500 ──────────────────────────
const unknown = businessApiErrorStatus('somethingNobodyMapped');
assert.equal(unknown.status, 500);
assert.equal(unknown.code, 'internalServerError');
assert.match(
  response,
  /logServerSystemIssue|logMappedServiceError/,
  'the unmapped error path must still report',
);

// ── The code must stay a declared business code ──────────────────────────────
//
// Otherwise `sanitizeApiErrorCodeForClient` would rewrite it and the workflow's
// exact-match check on the response body would silently stop recognising the
// state it waits for.
const codes = readFileSync('src/core/api/business-api-error-codes.ts', 'utf8');
assert.match(
  codes,
  /'productionDeployAlreadyRunning'/,
  'the code must stay declared, so the client receives it verbatim and the workflow can match it',
);
assert.match(
  table,
  /productionDeployAlreadyRunning/,
  'and the shared mapping must keep it, so control answers the workflow identically',
);

console.log('production deploy concurrency logging: all checks passed.');
