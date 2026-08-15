import assert from "node:assert/strict";
import {
  ALL_CAPABILITY_KEYS,
  CapabilityKeys,
  CapabilityRegistry,
  shellCapabilitiesFor,
  SHELL_CAPABILITIES_BY_PLATFORM,
} from "../../index";

// 1. All keys defined
assert.ok(ALL_CAPABILITY_KEYS.length > 20);
for (const key of Object.values(CapabilityKeys)) {
  assert.ok(ALL_CAPABILITY_KEYS.includes(key), `Key ${key} must be present in ALL_CAPABILITY_KEYS`);
}

// 2. Shell capabilities by platform
assert.ok(Array.isArray(SHELL_CAPABILITIES_BY_PLATFORM.android));
assert.ok(Array.isArray(SHELL_CAPABILITIES_BY_PLATFORM.ios));
assert.ok(SHELL_CAPABILITIES_BY_PLATFORM.android.length > 10);
assert.ok(SHELL_CAPABILITIES_BY_PLATFORM.ios.length > 10);

// 3. shellCapabilitiesFor function
const androidCaps = shellCapabilitiesFor("android");
assert.ok(androidCaps.includes(CapabilityKeys.NotificationsPush));
assert.ok(androidCaps.includes(CapabilityKeys.CameraTakePhoto));

const iosCaps = shellCapabilitiesFor("ios");
assert.ok(iosCaps.includes(CapabilityKeys.NotificationsPush));
assert.ok(iosCaps.includes(CapabilityKeys.CameraTakePhoto));

const webCaps = shellCapabilitiesFor("web");
assert.ok(Array.isArray(webCaps));

// 4. Registry methods
const registry = new CapabilityRegistry();
assert.ok(typeof registry.has === "function");
assert.ok(typeof registry.hasAll === "function");
assert.ok(typeof registry.missing === "function");
assert.ok(typeof registry.snapshot === "function");

console.log("✓ All capability registry contract tests passed.");
