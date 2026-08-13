import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const java = readFileSync(path.join(root, "android/app/src/main/java/hgh/asol/app/AsolNotificationInboxPlugin.java"), "utf8");
const activity = readFileSync(path.join(root, "android/app/src/main/java/hgh/asol/app/MainActivity.java"), "utf8");
const push = readFileSync(path.join(root, "src/native-platform/notifications/push-notifications.ts"), "utf8");
const controller = readFileSync(path.join(root, "src/features/notifications/presentation/NativePushController.tsx"), "utf8");
const capacitorPush = readFileSync(path.join(root, "src/features/notifications/infrastructure/capacitor/capacitor-push.service.ts"), "utf8");

assert.match(activity, /registerPlugin\(AsolNotificationInboxPlugin\.class\)/);
// Channels are declarations, not notifications: the activity creates them at
// startup, before the WebView exists and before any permission dialog.
assert.match(
  activity,
  /AsolNotificationChannels\.ensureCreated\(this\)/,
  "MainActivity must create the notification channels at startup.",
);
// The adapter's channel creation must not be gated on the permission state.
const createChannelsBody = /async createChannels\(\): Promise<void> \{([\s\S]*?)\n  \}/.exec(
  capacitorPush,
);
assert.ok(createChannelsBody, "CapacitorPushService.createChannels is missing.");
assert.doesNotMatch(
  createChannelsBody[1],
  /permission/i,
  "Channel creation must not depend on the notification permission.",
);
// Initialization creates the channels before anything asks for permission.
const initializeBody = /async initialize\(([\s\S]*?)\n  \}/.exec(capacitorPush);
assert.ok(initializeBody, "CapacitorPushService.initialize is missing.");
assert.match(
  initializeBody[1],
  /await this\.createChannels\(\);/,
  "Android initialization must create the channels.",
);
// register() creates the channels before it checks the grant, so a refusal
// leaves the channel set behind.
const registerBody = /async register\(uid: string\)([\s\S]*?)\n  async isEnabled\(/.exec(
  capacitorPush,
);
assert.ok(registerBody, "CapacitorPushService.register is missing.");
assert.ok(
  registerBody[1].indexOf("await this.createChannels();") <
    registerBody[1].indexOf("pushNotifications.checkPermission()"),
  "Channels must be created before the permission is checked.",
);
assert.ok(
  push.indexOf("if (isAndroid()) await this.createChannels();") <
    push.indexOf("const permission = await this.checkPermission();"),
  "The Native Platform module must create channels before checking permission.",
);
// A channel set that could not be ensured must reject, not resolve: registration
// decides whether to hand a token to FCM from this answer.
assert.match(
  java,
  /call\.reject\(\s*"Notification channels could not be created\./,
  "ensureChannels must reject when the channel set could not be created.",
);
assert.match(
  java,
  /Log\.e\(TAG, "Notification channels could not be created\./,
  "A failed channel creation must be logged natively.",
);
// The activity's own attempt is logged at error level rather than swallowed.
assert.match(
  activity,
  /Log\.e\(\s*"AsolNotifications"/,
  "A startup channel failure must be observable in logcat.",
);
// The connected-device verification of the startup sequence must exist.
const startupTest = readFileSync(
  path.join(
    root,
    "android/app/src/androidTest/java/hgh/asol/app/NotificationChannelStartupInstrumentedTest.java",
  ),
  "utf8",
);
assert.match(startupTest, /ActivityScenario\.launch\(MainActivity\.class\)/);
assert.match(
  startupTest,
  /checkSelfPermission\(Manifest\.permission\.POST_NOTIFICATIONS\)/,
  "The device test must prove the channels exist without the grant.",
);

assert.match(java, /getActiveNotifications\(\)/);
assert.match(java, /ensureChannels\(PluginCall call\)/);
assert.match(push, /notificationInboxPlugin\.ensureChannels\(\)/);
assert.doesNotMatch(
  push,
  /plugin\s*\.createChannel\(/,
  "Android channels must use the application-owned R.raw bridge.",
);
assert.match(java, /notification\.getChannelId\(\)/);
assert.match(java, /status\.getTag\(\)/);
for (const channel of ["ORDERS", "CHAT", "UPDATES", "URGENT", "SILENT"]) {
  assert.match(java, new RegExp(`AsolNotificationChannels\\.${channel}`));
}
assert.match(push, /AsolNotificationInbox/);
assert.match(push, /registerPlugin<NotificationInboxPluginApi>/);
assert.match(
  push,
  /isAndroid\(\)\s*\?\s*await notificationInboxPlugin\.getDelivered\(\)/,
  "Android must call its application-owned inbox method explicitly.",
);
assert.doesNotMatch(
  push,
  /["']getDelivered["']\s+in\s+plugin/,
  "Capacitor plugin proxies must not be feature-detected with the in operator.",
);
assert.doesNotMatch(
  push,
  /createLazyPlugin\("AsolNotificationInbox"/,
  "The app-owned inbox must not depend on a transient dynamic-import cache.",
);
assert.match(push, /id: native\.tag \|\| native\.id/);
assert.match(push, /isNotificationWebViewForeground\(\)/);
assert.doesNotMatch(push, /toPayload\(native, true\)/);
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
