/** Single responsibility: verify cached capability negotiation without permissions. */
import assert from "node:assert/strict";
import { CapabilityRegistry } from "../capabilities/capability-registry";
import { CapabilityKeys } from "../capabilities/capability-keys";

async function main(): Promise<void> {
  let resolutions = 0;
  const registry = new CapabilityRegistry(async (key) => {
    resolutions += 1;
    return key === CapabilityKeys.BarcodeScan;
  });
  assert.equal(await registry.has(CapabilityKeys.BarcodeScan), true);
  assert.equal(await registry.has(CapabilityKeys.BarcodeScan), true);
  assert.equal(
    resolutions,
    1,
    "capability result must be cached for the session",
  );
  assert.equal(await registry.hasAll([CapabilityKeys.BarcodeScan]), true);
  assert.deepEqual(
    await registry.missing([
      CapabilityKeys.BarcodeScan,
      CapabilityKeys.LocationWatch,
    ]),
    [CapabilityKeys.LocationWatch],
  );
  console.log("Capability registry tests passed.");
}
void main();
