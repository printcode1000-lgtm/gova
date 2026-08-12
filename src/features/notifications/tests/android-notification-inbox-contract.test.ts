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
assert.match(controller, /onStateChange/);
assert.match(controller, /syncDeliveredNotifications/);

console.log("Android notification inbox and resume-sync contract passed.");
