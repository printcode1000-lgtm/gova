/** Single responsibility: verify cached capability negotiation without permissions. */
import assert from "node:assert/strict";
import {
  CapabilityRegistry,
  familyByKey,
  pluginNameByFamily,
} from "../capabilities/capability-registry";
import {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
} from "../capabilities/capability-keys";
import { SHELL_CAPABILITIES } from "../capabilities/shell-capabilities";

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

  // Every key must resolve to a plugin the bridge can actually be asked about.
  // A key with no family, or a family with no registered name, would silently
  // report "absent" on a shell that does contain the plugin.
  for (const key of ALL_CAPABILITY_KEYS) {
    const family = familyByKey.get(key);
    assert.ok(family, `Capability key has no plugin family: ${key}`);
    assert.ok(
      pluginNameByFamily[family],
      `Plugin family has no registered native name: ${family}`,
    );
  }

  // The shell declaration may only narrow the answer, so every key it claims
  // must be one the registry knows how to verify against the bridge.
  for (const key of SHELL_CAPABILITIES) {
    assert.ok(
      ALL_CAPABILITY_KEYS.includes(key),
      `Shell declares an unknown capability: ${key}`,
    );
  }

  console.log("Capability registry tests passed.");
}
void main();
