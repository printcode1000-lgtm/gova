import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
if (!existsSync(path.join(root, "android/app/src/main/AndroidManifest.xml"))) {
  console.log(
    "Skipping Android notification inbox contract: the Capacitor android shell is not present in this upload.",
  );
  process.exit(0);
}
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");
const ANDROID = existsSync(path.join(root, "packages/native-core/android/src/main/java/hgh/asol/app"))
  ? "packages/native-core/android/src/main/java/hgh/asol/app"
  : "android/app/src/main/java/hgh/asol/app";

const java = read(`${ANDROID}/AsolNotificationInboxPlugin.java`);
const activity = read("android/app/src/main/java/hgh/asol/app/MainActivity.java");
const nativeCoreJava = existsSync(path.join(root, `${ANDROID}/AsolNativeCore.java`))
  ? read(`${ANDROID}/AsolNativeCore.java`)
  : activity;
const store = read(`${ANDROID}/AsolNotificationInboxStore.java`);
const record = read(`${ANDROID}/AsolNotificationRecord.java`);
const messagingService = read(`${ANDROID}/AsolPushMessagingService.java`);
const tapProtocol = read(`${ANDROID}/AsolNotificationTapProtocol.java`);
const channels = read(`${ANDROID}/AsolNotificationChannels.java`);
const manifest = read("android/app/src/main/AndroidManifest.xml");
const appGradle = read("android/app/build.gradle");
const proguard = existsSync(path.join(root, "packages/native-core/android/proguard-rules.pro"))
  ? read("packages/native-core/android/proguard-rules.pro")
  : read("android/app/proguard-rules.pro");
const push = read("packages/native-core/src/adapters/notifications.adapter.ts");
const controller = read("src/features/notifications/presentation/NativePushController.tsx");
const capacitorPush = read(
  "src/features/notifications/infrastructure/native/native-push.service.ts",
);
const nativeInboxAdapter = read(
  "src/features/notifications/infrastructure/native/native-inbox.service.ts",
);
const inboxService = read("src/features/notifications/application/native-inbox-service.ts");
const fcmProvider = read(
  "packages/notifications-core/src/services/providers/fcm-notification-provider.server.ts",
);
const clientStorage = read("src/features/app-reset/application/client-storage.ts");

assert.ok(
  activity.includes("AsolNativeCore.onCreate(this)") ||
    activity.includes("registerPlugin(AsolNotificationInboxPlugin.class)") ||
    nativeCoreJava.includes("registerPlugin(AsolNotificationInboxPlugin.class)"),
  "Native startup must register AsolNotificationInboxPlugin.",
);
// Channels are declarations, not notifications: the activity creates them at
// startup, before the WebView exists and before any permission dialog.
assert.ok(
  activity.includes("AsolNotificationChannels.ensureCreated(this)") ||
    nativeCoreJava.includes("AsolNotificationChannels.ensureCreated(activity)"),
  "MainActivity/AsolNativeCore must create the notification channels at startup.",
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
    registerBody[1].indexOf("checkPermission"),
  "Channels must be created before the permission is checked.",
);
assert.ok(
  push.includes("if (isAndroid())") && push.includes("ensureChannels()"),
  "The Native Core notifications adapter must ensure channels on Android.",
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
// The activity/NativeCore startup attempt is logged at error level rather than swallowed.
assert.ok(
  activity.includes('Log.e(') ||
    nativeCoreJava.includes('Log.e(') ||
    channels.includes('Log.e('),
  "A startup channel failure must be observable in logcat.",
);

// 1. Android delivery must be data-only, so our service always receives it.
assert.match(
  fcmProvider,
  /notification:\s*dataOnly \|\| android \?\s*undefined/,
  "An Android token must not receive an auto-displayed notification block.",
);
assert.match(
  fcmProvider,
  /token\.platform === "android"/,
  "The Android/Apple split must be decided per token platform.",
);
// iOS must keep its alert payload; removing it would silence Apple.
assert.match(
  fcmProvider,
  /"apns-push-type": "alert"/,
  "Apple delivery must keep its alert payload.",
);
assert.match(
  fcmProvider,
  /androidChannelId: channelId\(input\)/,
  "The resolved Android channel must travel in the data map.",
);

// 2. Exactly one FirebaseMessagingService may claim MESSAGING_EVENT.
assert.match(
  manifest,
  /com\.capacitorjs\.plugins\.pushnotifications\.MessagingService"\s*\n?\s*tools:node="remove"/,
  "The Capacitor messaging service must be removed, or delivery depends on manifest merge order.",
);
assert.match(
  manifest,
  /android:name="\.AsolPushMessagingService"/,
  "The application-owned messaging service must be declared.",
);
assert.match(
  manifest,
  /<action android:name="com\.google\.firebase\.MESSAGING_EVENT" \/>/,
);
assert.match(
  messagingService,
  /extends FirebaseMessagingService/,
  "AsolPushMessagingService must be a FirebaseMessagingService.",
);
assert.match(
  appGradle,
  /com\.google\.firebase:firebase-messaging:\$firebaseMessagingVersion/,
  "The app module needs Firebase Messaging on its own compile classpath.",
);
assert.match(
  proguard,
  /-keep class hgh\.asol\.app\.AsolPushMessagingService/,
  "R8 must not be able to remove the messaging service.",
);

// 3. Persist before display. This is the entire durability argument: everything
//    after the write can fail and the notification is still recoverable.
const receiveBody = /public void onMessageReceived\(([\s\S]*?)\n    \}/.exec(messagingService);
assert.ok(receiveBody, "AsolPushMessagingService.onMessageReceived is missing.");
assert.ok(
  receiveBody[1].indexOf("AsolNotificationInboxStore.enqueue(") <
    receiveBody[1].indexOf("post(context, record)"),
  "The payload must be persisted before the notification is posted.",
);
// The live JavaScript listener must still fire, or a foreground push would only
// reach the centre at the next import.
assert.match(messagingService, /PushNotificationsPlugin\.sendRemoteMessage\(remoteMessage\)/);
assert.match(
  messagingService,
  /PushNotificationsPlugin\.onNewToken\(token\)/,
  "Token refresh must still reach the web layer, which owns token cardinality.",
);

// 4. The posted notification keeps the existing channels, sound, and identity.
assert.match(
  messagingService,
  /new NotificationCompat\.Builder\(context, record\.channelId\)/,
  "The notification must be posted on the resolved ASOL channel.",
);
assert.match(
  messagingService,
  /AsolNotificationChannels\.customSoundUri\(context\)/,
  "The custom sound must be preserved for devices below Android 8.",
);
assert.match(
  messagingService,
  /manager\.notify\(record\.systemTag, record\.systemNotificationId, notification\)/,
  "Notifications must be posted with a stable tag and id.",
);
assert.match(
  messagingService,
  /PendingIntent\.FLAG_UPDATE_CURRENT/,
  "The tap intent must update in place rather than stack.",
);
assert.match(
  messagingService,
  /flags \|= PendingIntent\.FLAG_IMMUTABLE/,
  "The tap intent must be immutable.",
);
assert.match(
  messagingService,
  /launch\.putExtras\(record\.toIntentExtras\(\)\)/,
  "The launch intent must carry the stable inbox record id.",
);
// The native channel resolution must mirror the domain rule, in the same order.
assert.match(channels, /public static String resolveChannelId\(/);
for (const [condition, channel] of [
  ['"silent".equals(sound)', "SILENT"],
  ['"critical".equals(priority)', "URGENT"],
  ["SUPER_ADMIN_BROADCAST_SOURCE.equals(metadataSource)", "UPDATES"],
  ['"orders".equals(category)', "ORDERS"],
  ['"chat".equals(category)', "CHAT"],
] as const) {
  assert.ok(
    channels.includes(condition),
    `The native channel resolver is missing the ${channel} rule.`,
  );
}

// 5. The record keeps the complete original payload, not a reconstruction.
assert.match(
  record,
  /public final Map<String, String> data;/,
  "The record must retain the complete original FCM data map.",
);
for (const field of [
  "recordId",
  "uid",
  "notificationId",
  "dedupeKey",
  "title",
  "body",
  "routeHref",
  "routeLabel",
  "category",
  "priority",
  "sound",
  "groupKey",
  "templateId",
  "channelId",
  "createdAt",
  "receivedAt",
]) {
  assert.ok(
    new RegExp(`json\\.put\\("${field}"`).test(record),
    `The stored record drops "${field}".`,
  );
}

// 6. Storage is device-local, application-private, encrypted, and bounded.
assert.match(store, /context\.getFilesDir\(\)/, "The inbox must live in app-private storage.");
assert.match(store, /AES\/GCM\/NoPadding/, "The inbox must be encrypted.");
assert.match(store, /AndroidKeyStore/, "The encryption key must never leave the keystore.");
assert.match(store, /new AtomicFile\(target\)/, "Inbox writes must use Android AtomicFile.");
assert.match(
  store,
  /file\.openRead\(\)/,
  "Inbox reads must invoke AtomicFile recovery after an interrupted write.",
);
assert.match(store, /MAX_RECORDS = 200/, "The inbox must have a documented count limit.");
assert.match(store, /MAX_AGE_MS = 14L/, "The inbox must have a documented age limit.");
// Expiry first, then oldest-first eviction: an eviction must never drop a fresh
// unacknowledged record in order to keep a stale one.
const retentionBody = /static List<AsolNotificationRecord> applyRetention\(([\s\S]*?)\n    \}/.exec(
  store,
);
assert.ok(retentionBody, "The retention policy is missing.");
assert.ok(
  retentionBody[1].indexOf("MAX_AGE_MS") < retentionBody[1].indexOf("MAX_RECORDS"),
  "Retention must apply the age limit before the count limit.",
);
// Nothing leaves the device, and nothing sensitive reaches a log.
assert.doesNotMatch(
  store,
  /https?:\/\/|HttpURLConnection|OkHttp|getExternalStorage/,
  "The notification inbox must never leave the device.",
);
// Content is never interpolated into a log line. Matching on concatenation
// rather than on the words themselves, so a log message that merely *mentions*
// "token" in prose is not mistaken for one that prints a token.
for (const source of [store, record, messagingService, java]) {
  assert.doesNotMatch(
    source,
    /Log\.[a-z]+\([^;]*\+\s*(?:\w+\.)?(?:title|body|uid|token|metadata|routeHref|dedupeKey|notificationId)\b/,
    "Notification content must never be logged.",
  );
}

// 7. Every read and every acknowledgement is scoped to one user.
assert.match(store, /public static List<AsolNotificationRecord> listForUid\(Context context, String uid\)/);
assert.match(
  store,
  /if \(owner\.equals\(record\.uid\) && recordIds\.contains\(record\.recordId\)\)/,
  "An acknowledgement must be valid only for the user it was produced for.",
);
assert.match(java, /public void listPending\(PluginCall call\)/);
assert.match(java, /public void acknowledge\(PluginCall call\)/);
assert.match(java, /public void clearPending\(PluginCall call\)/);

// 8. The tap is a durable pointer into the inbox, read before JavaScript exists.
assert.match(tapProtocol, /EXTRA_RECORD_ID = "asol_notification_record_id"/);
assert.match(tapProtocol, /EXTRA_UID = "asol_notification_uid"/);
assert.match(
  tapProtocol,
  /EXTRA_NOTIFICATION_ID = "asol_notification_id"/,
  "The tap must identify the notification even after its record was acknowledged.",
);
assert.ok(
  activity.includes("AsolNotificationTapProtocol.capture(this, getIntent())") ||
    nativeCoreJava.includes("AsolNotificationTapProtocol.capture(activity, intent)"),
  "A cold-start tap must be captured from the launch intent.",
);
assert.match(
  java,
  /AsolNotificationTapProtocol\.capture\(getContext\(\), getActivity\(\)\.getIntent\(\)\)/,
  "The plugin must capture the launch tap when it loads.",
);
// The pointer itself has to outlive the process, not just the Activity: Android
// can kill the app while the WebView is still booting, and a tap held only in
// static memory would be gone. Committed synchronously, because `apply()` is
// asynchronous and is exactly what that kill would lose.
assert.match(
  tapProtocol,
  /getSharedPreferences\(PREFERENCES, Context\.MODE_PRIVATE\)/,
  "The pending tap must be persisted, not held in memory.",
);
assert.match(
  tapProtocol,
  /\.commit\(\);/,
  "The pending tap must be committed synchronously, not applied.",
);
assert.doesNotMatch(
  tapProtocol,
  /\.apply\(\)/,
  "An asynchronous write can lose the tap if the process is killed.",
);
assert.ok(
  activity.includes("onNewIntentReceived(intent)") ||
    nativeCoreJava.includes("onNewIntentReceived(intent)"),
  "A warm tap must reach the inbox plugin.",
);
// The tap is read, not consumed: it is cleared only after the notification is
// stored and marked read, so an interrupted start replays it.
assert.match(java, /public void getPendingTap\(PluginCall call\)/);
assert.match(java, /public void clearPendingTap\(PluginCall call\)/);

// 9. Foreground display stays with the WebView; the service must not duplicate it.
assert.match(
  messagingService,
  /if \(persisted && !AsolAppLifecycle\.isForeground\(\)\)/,
  "The native service must not post a banner the WebView is about to post — and must never post one it could not persist.",
);
// The live callback is for a genuinely foreground Activity only. Forwarding a
// background delivery makes Capacitor retain it as `lastMessage` and replay it
// after the next launch as though it had just arrived, which posts a second
// banner. Every non-foreground delivery goes through the durable inbox alone.
assert.match(
  messagingService,
  /if \(record != null && AsolAppLifecycle\.isForeground\(\)\) \{\s*try \{\s*PushNotificationsPlugin\.sendRemoteMessage/,
  "Only a foreground delivery may be forwarded to the web layer.",
);
assert.match(
  capacitorPush,
  /payloadUid && payloadUid !== this\.currentUid/,
  "A delayed push for a previous account must not enter the current user's IndexedDB partition.",
);
assert.ok(
  activity.includes("AsolAppLifecycle.setForeground(true)") ||
    nativeCoreJava.includes("AsolAppLifecycle.setForeground(true)"),
  "Foreground state must be set true on resume.",
);
assert.ok(
  activity.includes("AsolAppLifecycle.setForeground(false)") ||
    nativeCoreJava.includes("AsolAppLifecycle.setForeground(false)"),
  "Foreground state must be set false on pause.",
);

// 10. Save first, acknowledge second — in the web layer too.
const drainBody = /private async drain\(uid: string\)([\s\S]*?)\n  \}/.exec(inboxService);
assert.ok(drainBody, "The inbox drain is missing.");
assert.ok(
  drainBody[1].indexOf("notificationReceiver.receiveBatch") <
    drainBody[1].indexOf(".acknowledge"),
  "Records must be stored before they are acknowledged.",
);
assert.match(
  inboxService,
  /return \{ imported: \[\], acknowledged: 0, retained: records\.length \};/,
  "A storage failure must acknowledge nothing at all.",
);
assert.match(
  nativeInboxAdapter,
  /record\.uid === uid/,
  "A record for another user must never be imported.",
);
// The tapped notification is the only one marked read.
assert.match(inboxService, /if \(target\) await notificationLifecycleService\.markRead/);
assert.match(
  inboxService,
  /await this\.importPending\(uid\)/,
  "A tap must import every pending record, not only the tapped one.",
);
assert.doesNotMatch(
  nativeInboxAdapter,
  /clearInboxTap\(\);\s*\} catch/,
  "A tap-clear failure must propagate so navigation cannot report a durable consume prematurely.",
);

// 11. The tap opens the centre; the business route stays on the notification.
assert.match(
  controller,
  /onOpened: \(\) => \{\s*router\.push\("\/notifications"\);/,
  "A notification tap must open the notification centre.",
);
assert.doesNotMatch(
  controller,
  /router\.push\(notification\.route/,
  "A tap must not follow the business deep link directly.",
);

// 12. An explicit local-data wipe clears the native inbox; a sign-out does not.
assert.match(clientStorage, /notifications\.clearLocalInbox\(\)/);
const clearAllBody = /export async function clearAllClientStorage\(\): Promise<void> \{([\s\S]*?)\n\}/.exec(
  clientStorage,
);
assert.ok(clearAllBody, "clearAllClientStorage is missing.");
assert.ok(
  clearAllBody[1].indexOf("await clearNativeNotificationInbox()") <
    clearAllBody[1].indexOf("clearCookies()"),
  "A native clear failure must abort before browser state is partially erased.",
);
assert.doesNotMatch(
  capacitorPush,
  /clearLocalInbox|clearInbox/,
  "Signing out must not discard another account's pending notifications.",
);

// 13. The tray sweep must not re-import what the inbox already owns.
//     Android truncates a long notification tag, so a tray-derived record can
//     carry a different — and lossier — identity than the one the inbox holds.
//     Marking our own notifications and skipping them is what keeps the legacy
//     fallback from manufacturing a second centre item.
assert.match(
  messagingService,
  /\.addExtras\(inboxIdentity\)/,
  "A notification owned by the inbox must be marked as such.",
);
assert.match(
  java,
  /notification\.extras\.containsKey\(AsolNotificationTapProtocol\.EXTRA_RECORD_ID\)/,
  "The tray sweep must skip notifications the durable inbox already owns.",
);

// 14. A record with no owning uid is never persisted or displayed: it could
//     never be imported safely, and an orphan is exactly what would later be
//     mistaken for the next authenticated account's notification.
assert.match(
  record,
  /if \(uid\.isEmpty\(\)\) return null;/,
  "A record without an owning uid must be rejected outright.",
);

// 15. An unreadable inbox must fail closed on write.
//     Treating a decode failure as an empty inbox would overwrite every pending
//     record with just the newly arrived one.
assert.match(
  store,
  /readStrictUnlocked\(context\)/,
  "enqueue must not treat an unreadable inbox as an empty one.",
);

// 16. Import must not clear the Android tray.
const importBody = /private async importDelivered\(\)([\s\S]*?)\r?\n  \}\r?\n\}/.exec(
  capacitorPush,
);
assert.ok(importBody, "CapacitorPushService.importDelivered is missing.");
assert.doesNotMatch(
  importBody[1],
  /removeAllDelivered/,
  "An import must never clear the notification tray.",
);

// The connected-device verification of the startup sequence must exist.
const startupTestPath = existsSync(
  path.join(
    root,
    "packages/native-core/android/src/androidTest/java/hgh/asol/app/NotificationChannelStartupInstrumentedTest.java",
  ),
)
  ? path.join(
      root,
      "packages/native-core/android/src/androidTest/java/hgh/asol/app/NotificationChannelStartupInstrumentedTest.java",
    )
  : path.join(
      root,
      "android/app/src/androidTest/java/hgh/asol/app/NotificationChannelStartupInstrumentedTest.java",
    );
const startupTest = readFileSync(startupTestPath, "utf8");
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
assert.match(controller, /onAppStateChange|onStateChange/);
assert.match(controller, /importDelivered/);
// The controller drives the module through its facade, never a service beneath
// it, so the tray import cannot be reached around the public API.
assert.match(controller, /notificationsFacade/);
assert.doesNotMatch(controller, /application\/device-token-service/);

console.log("Android notification inbox and resume-sync contract passed.");
