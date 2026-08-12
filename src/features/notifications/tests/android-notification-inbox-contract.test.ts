import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const java = readFileSync(path.join(root, "android/app/src/main/java/hgh/asol/app/AsolNotificationInboxPlugin.java"), "utf8");
const activity = readFileSync(path.join(root, "android/app/src/main/java/hgh/asol/app/MainActivity.java"), "utf8");
const push = readFileSync(path.join(root, "src/native-platform/notifications/push-notifications.ts"), "utf8");
const controller = readFileSync(path.join(root, "src/features/notifications/presentation/NativePushController.tsx"), "utf8");

assert.match(activity, /registerPlugin\(AsolNotificationInboxPlugin\.class\)/);
assert.match(java, /getActiveNotifications\(\)/);
assert.match(java, /notification\.getChannelId\(\)/);
assert.match(java, /status\.getTag\(\)/);
for (const channel of ["ORDERS", "CHAT", "UPDATES", "URGENT", "SILENT"]) {
  assert.match(java, new RegExp(`AsolNotificationChannels\\.${channel}`));
}
assert.match(push, /AsolNotificationInbox/);
assert.match(push, /id: native\.tag \|\| native\.id/);
// Resume-sync: a notification delivered while the app was backgrounded or
// terminated reaches the centre only because the controller re-imports the tray
// when the app becomes active again.
assert.match(controller, /onStateChange/);
assert.match(controller, /importDelivered/);
// The controller drives the module through its facade, never a service beneath
// it, so the tray import cannot be reached around the public API.
assert.match(controller, /notificationsFacade/);
assert.doesNotMatch(controller, /application\/device-token-service/);

console.log("Android notification inbox and resume-sync contract passed.");
