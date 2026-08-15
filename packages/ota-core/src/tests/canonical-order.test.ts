import assert from "node:assert/strict";
import {
  compareOtaCanonicalStrings,
  sortOtaCanonicalKeys,
} from "../domain/release/canonical-order";

export async function runCanonicalOrderTests(): Promise<void> {
  const keys = ["b", "a", "c", "10", "2", "A", "a"];
  const sorted = sortOtaCanonicalKeys(keys);
  assert.deepEqual(sorted, ["10", "2", "A", "a", "a", "b", "c"]);

  assert.equal(compareOtaCanonicalStrings("abc", "abc"), 0);
  assert.ok(compareOtaCanonicalStrings("a", "b") < 0);
  assert.ok(compareOtaCanonicalStrings("b", "a") > 0);

  console.log("  ✔ canonical-order unit tests passed");
}

if (process.argv[1]?.endsWith("canonical-order.test.ts")) {
  runCanonicalOrderTests().catch((e) => { console.error(e); process.exit(1); });
}
