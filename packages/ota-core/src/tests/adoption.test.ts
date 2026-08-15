import assert from "node:assert/strict";
import { summarizeOtaAdoption } from "../domain/release/adoption";

export async function runAdoptionTests(): Promise<void> {
  const summary = summarizeOtaAdoption([
    {
      feature: "ota",
      operation: "activation_succeeded",
      message: "target=0.2.4.1;from=0.2.4.0",
      occurrences: 5,
    },
    {
      feature: "ota",
      operation: "download_failed",
      message: "target=0.2.4.1;reason=network",
      occurrences: 2,
    },
  ]);

  assert.equal(summary.length, 1);
  assert.equal(summary[0]?.version, "0.2.4.1");
  assert.equal(summary[0]?.outcomes["activation_succeeded"], 5);
  assert.equal(summary[0]?.outcomes["download_failed"], 2);

  console.log("  ✔ adoption unit tests passed");
}

if (process.argv[1]?.endsWith("adoption.test.ts")) {
  runAdoptionTests().catch((e) => { console.error(e); process.exit(1); });
}
