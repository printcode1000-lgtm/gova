import assert from "node:assert/strict";

import { isEventTargetInside } from "../application/is-event-target-inside";

const container = {
  contains() {
    throw new Error("contains must not run for a non-Node target");
  },
} as unknown as Node;

assert.equal(isEventTargetInside(container, {} as EventTarget), false);
assert.equal(isEventTargetInside(null, {} as EventTarget), false);

console.log("isEventTargetInside ignores non-Node event targets.");
