import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { DEFAULT_CHANNELS, DEFAULT_CHANNEL_ID, DEFAULT_CHANNEL_SOUND } from "@/native-platform/notifications/types";
import {
  ANDROID_SOUND_FILE,
  APPLE_SOUND_FILE,
  FCM_SOUND_RESOURCE,
  NotificationChannelIds,
  appleSoundFile,
  fcmSoundResource,
  isSilentNotification,
  localNotificationSoundFile,
  resolveAndroidChannelId,
} from "../domain/notification-sound";
import {
  NotificationCategories,
  NotificationPriorities,
  NotificationSounds,
} from "../domain/enums";
import { NOTIFICATION_TEST_SCENARIOS } from "../domain/notification-test-scenarios";

/**
 * The custom sound reaches a device through four independent things that must
 * agree: the asset on disk, the channel registered on Android, the resource
 * name put in an FCM payload, and the file name put in an Apple payload. Each
 * mismatch is silent at runtime — Android and iOS both fall back to the system
 * sound rather than reporting an error — so they are compared here instead.
 */

const audibleChannels = new Set<string>([
  NotificationChannelIds.General,
  NotificationChannelIds.Orders,
  NotificationChannelIds.Chat,
  NotificationChannelIds.Urgent,
  NotificationChannelIds.Updates,
]);

// 1. Every channel the resolver can return is actually created on the device.
const registeredIds = new Set(DEFAULT_CHANNELS.map((channel) => channel.id));
for (const id of Object.values(NotificationChannelIds)) {
  assert.ok(
    registeredIds.has(id),
    `Channel ${id} is selectable but never registered in DEFAULT_CHANNELS.`,
  );
}
assert.ok(
  registeredIds.has(DEFAULT_CHANNEL_ID),
  "The local-notification fallback channel must be registered.",
);

// 2. Audible channels carry the custom sound; the silent one carries none and
//    is below the importance at which Android plays a channel's sound at all.
for (const channel of DEFAULT_CHANNELS) {
  if (audibleChannels.has(channel.id)) {
    assert.equal(
      channel.sound,
      ANDROID_SOUND_FILE,
      `Channel ${channel.id} must carry the custom sound.`,
    );
    assert.ok(
      channel.importance >= 3,
      `Channel ${channel.id} is audible, so it must be importance 3 or higher.`,
    );
  }
  if (channel.id === NotificationChannelIds.Silent) {
    assert.equal(channel.sound, undefined, "The silent channel must define no sound.");
    assert.ok(
      channel.importance <= 2,
      "A channel is only silent below importance 3, whatever sound it declares.",
    );
    assert.equal(channel.vibration, false, "The silent channel must not vibrate.");
  }
}
assert.equal(DEFAULT_CHANNEL_SOUND, ANDROID_SOUND_FILE);

// 3. Channel selection.
const base = {
  category: NotificationCategories.System,
  priority: NotificationPriorities.Normal,
  sound: NotificationSounds.Default,
} as const;

assert.equal(resolveAndroidChannelId(base), NotificationChannelIds.General);
assert.equal(
  resolveAndroidChannelId({ ...base, category: NotificationCategories.Orders }),
  NotificationChannelIds.Orders,
);
assert.equal(
  resolveAndroidChannelId({ ...base, category: NotificationCategories.Chat }),
  NotificationChannelIds.Chat,
);
assert.equal(
  resolveAndroidChannelId({ ...base, source: "super_admin_broadcast" }),
  NotificationChannelIds.Updates,
);
assert.equal(
  resolveAndroidChannelId({ ...base, priority: NotificationPriorities.Critical }),
  NotificationChannelIds.Urgent,
);
assert.equal(
  resolveAndroidChannelId({ ...base, sound: NotificationSounds.Urgent }),
  NotificationChannelIds.Urgent,
);
// Silent outranks everything: it is the only way to deliver without a sound.
assert.equal(
  resolveAndroidChannelId({
    ...base,
    sound: NotificationSounds.Silent,
    priority: NotificationPriorities.Critical,
    category: NotificationCategories.Orders,
    source: "super_admin_broadcast",
  }),
  NotificationChannelIds.Silent,
);

// Every Super Admin diagnostic preset must resolve to the channel displayed by
// the test page. This catches a misleading green UI before it reaches a device.
for (const scenario of NOTIFICATION_TEST_SCENARIOS) {
  assert.equal(
    resolveAndroidChannelId({
      category: scenario.category,
      priority: scenario.priority,
      sound: scenario.sound,
      source: scenario.source,
    }),
    scenario.channelId,
    `Notification test scenario ${scenario.id} resolves to the wrong channel.`,
  );
  assert.equal(
    scenario.audible,
    !isSilentNotification(scenario.sound),
    `Notification test scenario ${scenario.id} has a misleading sound label.`,
  );
}

// 4. Per-transport sound values.
assert.equal(fcmSoundResource(NotificationSounds.Default), FCM_SOUND_RESOURCE);
assert.equal(fcmSoundResource(NotificationSounds.Urgent), FCM_SOUND_RESOURCE);
assert.equal(fcmSoundResource(NotificationSounds.Silent), undefined);
assert.equal(appleSoundFile(NotificationSounds.Default), APPLE_SOUND_FILE);
assert.equal(appleSoundFile(NotificationSounds.Silent), undefined);
assert.equal(
  localNotificationSoundFile("android", NotificationSounds.Default),
  ANDROID_SOUND_FILE,
);
assert.equal(
  localNotificationSoundFile("ios", NotificationSounds.Default),
  APPLE_SOUND_FILE,
);
assert.equal(
  localNotificationSoundFile("web", NotificationSounds.Default),
  undefined,
  "The browser Notification API has no sound option; claiming one hides the limit.",
);
assert.equal(
  localNotificationSoundFile("android", NotificationSounds.Silent),
  undefined,
);
assert.ok(isSilentNotification(NotificationSounds.Silent));
assert.ok(!isSilentNotification(NotificationSounds.Default));

// 5. FCM and the Android channel API resolve a raw resource by base name.
//    Sending the extension makes the lookup fail and Android falls back to the
//    system sound with no error anywhere.
assert.ok(
  !FCM_SOUND_RESOURCE.includes("."),
  "The FCM sound resource name must not carry a file extension.",
);
assert.equal(
  ANDROID_SOUND_FILE,
  `${FCM_SOUND_RESOURCE}.mp3`,
  "The Android asset and the FCM resource name must be the same file.",
);

// 6. The assets themselves exist, under exactly the names the payloads use.
const androidSource = path.resolve("assets", "google-play", ANDROID_SOUND_FILE);
assert.ok(
  existsSync(androidSource),
  `The Android sound source ${ANDROID_SOUND_FILE} is missing; cap:sync copies it into res/raw.`,
);
const androidBootstrap = readFileSync(
  path.resolve(
    "android",
    "app",
    "src",
    "main",
    "java",
    "hgh",
    "asol",
    "app",
    "AsolNotificationChannels.java",
  ),
  "utf8",
);
for (const id of audibleChannels) {
  assert.ok(
    androidBootstrap.includes(`\"${id}\"`),
    `The native startup bootstrap must create audible channel ${id}.`,
  );
}
assert.ok(
  androidBootstrap.includes("R.raw.custom_notification"),
  "Release resource shrinking must see a native reference to the custom sound.",
);
assert.ok(
  androidBootstrap.includes("/raw/\" + SOUND_RESOURCE_NAME"),
  "The startup channel sound URI must address the bundled raw resource.",
);

const appleSound = path.resolve("ios", "App", "App", APPLE_SOUND_FILE);
assert.ok(existsSync(appleSound), `The Apple sound ${APPLE_SOUND_FILE} is missing.`);
assert.equal(
  readFileSync(appleSound).subarray(0, 4).toString("ascii"),
  "caff",
  "The Apple sound must be a real CAF file; iOS silently ignores anything else.",
);

// 7. iOS refuses a custom sound longer than 30 seconds and substitutes the
//    system sound, which would look exactly like a payload bug.
const caf = readFileSync(appleSound);
let offset = 8;
let bytesPerPacket = 0;
let framesPerPacket = 0;
let sampleRate = 0;
let seconds = 0;
while (offset < caf.length - 12) {
  const chunkType = caf.subarray(offset, offset + 4).toString("ascii");
  const chunkSize = Number(caf.readBigInt64BE(offset + 4));
  if (chunkType === "desc") {
    sampleRate = caf.readDoubleBE(offset + 12);
    bytesPerPacket = caf.readUInt32BE(offset + 28);
    framesPerPacket = caf.readUInt32BE(offset + 32);
  }
  if (chunkType === "data" && bytesPerPacket > 0 && sampleRate > 0) {
    seconds = (chunkSize / bytesPerPacket) * (framesPerPacket / sampleRate);
    break;
  }
  if (chunkSize < 0 || chunkSize > caf.length) break;
  offset += 12 + chunkSize;
}
assert.ok(seconds > 0, "Could not read the Apple sound duration.");
assert.ok(
  seconds <= 30,
  `The Apple sound is ${seconds.toFixed(2)}s; iOS ignores custom sounds over 30s.`,
);

// 8. The Android manifest fallback must name a channel that exists, or a push
//    arriving before the app has created its channels lands on a system
//    "Miscellaneous" channel with the default sound.
const manifest = readFileSync(
  path.resolve("android", "app", "src", "main", "AndroidManifest.xml"),
  "utf8",
);
assert.ok(
  manifest.includes("com.google.firebase.messaging.default_notification_channel_id"),
  "The manifest must declare a default FCM notification channel.",
);
const strings = readFileSync(
  path.resolve("android", "app", "src", "main", "res", "values", "strings.xml"),
  "utf8",
);
const declared = /<string name="default_notification_channel_id">([^<]+)<\/string>/.exec(
  strings,
);
assert.ok(declared, "default_notification_channel_id is not declared in strings.xml.");
assert.ok(
  audibleChannels.has(declared[1]),
  `The manifest default channel ${declared[1]} must be one of the audible ASOL channels.`,
);

// 9. Every template that can reach Android is audible. Data-only receipts are
// intentionally not templates and never become a visible notification.
for (const locale of ["ar", "en"] as const) {
  const templates = JSON.parse(
    readFileSync(
      path.resolve(
        "src",
        "features",
        "notifications",
        "config",
        "templates",
        `notifications.${locale}.json`,
      ),
      "utf8",
    ),
  ) as Record<string, { channels?: string[]; sound?: string }>;
  for (const [templateId, template] of Object.entries(templates)) {
    if (template.channels?.includes("android_push")) {
      assert.notEqual(
        template.sound,
        NotificationSounds.Silent,
        `${locale}:${templateId} reaches Android and must use the custom sound.`,
      );
    }
  }
}

console.log("Notification sound contract passed.");
