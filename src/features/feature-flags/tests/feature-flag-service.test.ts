/** Single responsibility: verify remote feature flags remain capability-safe and isolated. */
import assert from "node:assert/strict";
import { CapabilityKeys, type CapabilityKey } from "@/native-platform";
import { FeatureFlagService } from "../feature-flag-service";

async function main(): Promise<void> {
  const available = new Set<CapabilityKey>();
  const flags = new FeatureFlagService(async (key) => available.has(key));

  assert.equal(await flags.isEnabled({ key: "unknown" }), false);
  assert.equal(
    await flags.isEnabled({ key: "default-on", defaultEnabled: true }),
    true,
  );

  flags.setRemoteValues({ "default-on": false });
  assert.equal(
    await flags.isEnabled({ key: "default-on", defaultEnabled: true }),
    false,
  );

  flags.setRemoteValues({ guarded: true });
  const guarded = {
    key: "guarded",
    capability: CapabilityKeys.BarcodeScan,
  } as const;
  assert.equal(await flags.isEnabled(guarded), false);
  available.add(CapabilityKeys.BarcodeScan);
  assert.equal(await flags.isEnabled(guarded), true);

  flags.configureRemoteProvider(async () => ({ refreshed: true }));
  await flags.refresh();
  assert.equal(await flags.isEnabled({ key: "refreshed" }), true);

  flags.setRemoteValues({ retained: true });
  flags.configureRemoteProvider(async () => {
    throw new Error("provider unavailable");
  });
  await assert.rejects(flags.refresh(), /provider unavailable/);
  assert.equal(await flags.isEnabled({ key: "retained" }), true);

  flags.reset();
  assert.equal(await flags.isEnabled({ key: "retained" }), false);
  await flags.refresh();

  console.log("Feature flag service tests passed.");
}

void main();
