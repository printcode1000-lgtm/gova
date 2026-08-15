import assert from "node:assert/strict";
import { evaluateOtaCapabilities } from "../domain/release/capability-gate";

export async function runCapabilityGateTests(): Promise<void> {
  const availableSet = new Set(["camera.photo", "location.current"]);
  const mockRegistry = {
    missing: async (keys: readonly string[]) => keys.filter((k) => !availableSet.has(k)),
  };

  const decision1 = await evaluateOtaCapabilities(
    ["camera.photo", "location.current"],
    mockRegistry,
  );
  assert.equal(decision1.compatible, true);
  assert.deepEqual(decision1.missingCapabilities, []);

  const decision2 = await evaluateOtaCapabilities(
    ["camera.photo", "barcode.scan"],
    mockRegistry,
  );
  assert.equal(decision2.compatible, false);
  assert.deepEqual(decision2.missingCapabilities, ["barcode.scan"]);

  const decision3 = await evaluateOtaCapabilities(
    ["camera.photo"],
    mockRegistry,
    ["barcode.scan"],
  );
  assert.equal(decision3.compatible, true);
  assert.deepEqual(decision3.missingOptionalCapabilities, ["barcode.scan"]);

  console.log("  ✔ capability-gate unit tests passed");
}

if (process.argv[1]?.endsWith("capability-gate.test.ts")) {
  runCapabilityGateTests().catch((e) => { console.error(e); process.exit(1); });
}
