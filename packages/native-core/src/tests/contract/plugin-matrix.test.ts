import assert from "node:assert/strict";
import {
  pluginNameByFamily,
  familyByKey,
  CapabilityKeys,
} from "../../index";

// 1. Every capability key maps to a valid plugin family
for (const key of Object.values(CapabilityKeys)) {
  const family = familyByKey.get(key);
  assert.ok(family, `Capability key ${key} must map to a plugin family`);
  const pluginName = pluginNameByFamily[family];
  assert.ok(pluginName, `Family ${family} must map to a plugin name`);
}

// 2. Core families match expected plugin names
assert.equal(pluginNameByFamily.camera, "Camera");
assert.equal(pluginNameByFamily.push, "PushNotifications");
assert.equal(pluginNameByFamily.localNotifications, "LocalNotifications");
assert.equal(pluginNameByFamily.haptics, "Haptics");
assert.equal(pluginNameByFamily.statusBar, "StatusBar");
assert.equal(pluginNameByFamily.clipboard, "Clipboard");

console.log("✓ All plugin matrix contract tests passed.");
