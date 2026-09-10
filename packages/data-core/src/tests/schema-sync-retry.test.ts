import assert from "node:assert/strict";

import {
  isTransientTursoReadError,
  retryTransientTursoRead,
} from "../provisioning/core/schema-sync";

assert.equal(isTransientTursoReadError(new Error("fetch failed")), true);
assert.equal(isTransientTursoReadError(new Error("schema mismatch")), false);

let transientCalls = 0;
const value = await retryTransientTursoRead(
  "test",
  async () => {
    transientCalls += 1;
    if (transientCalls < 3) throw new Error("fetch failed");
    return "ok";
  },
  { maxAttempts: 4, delayMs: 0 },
);
assert.equal(value, "ok");
assert.equal(transientCalls, 3);

let logicalCalls = 0;
await assert.rejects(
  retryTransientTursoRead(
    "logical-test",
    async () => {
      logicalCalls += 1;
      throw new Error("schema mismatch");
    },
    { maxAttempts: 4, delayMs: 0 },
  ),
  /schema mismatch/,
);
assert.equal(logicalCalls, 1);

console.log(
  "data-core schema sync retry: transient transport only, bounded attempts verified.",
);
