import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { DEFAULT_CHANNELS, FROZEN_CHANNEL_IDS } from "@asol/native-core";
import { NotificationBuilder } from "@asol/notifications-core/builder";
import {
  NotificationCategories,
  NotificationChannelIds,
  NotificationPriorities,
  NotificationSounds,
  NOTIFICATION_TEST_SCENARIOS,
  SUPER_ADMIN_BROADCAST_SOURCE,
  resolveAndroidChannelId,
} from "@asol/notifications-core";

const registered = new Set(DEFAULT_CHANNELS.map((channel) => channel.id));

function mirrorNativeResolveChannelId(input: {
  category: string;
  priority: string;
  sound: string;
  source?: string | null;
}): string {
  if (input.sound === NotificationSounds.Silent) return NotificationChannelIds.Silent;
  if (
    input.priority === NotificationPriorities.Critical ||
    input.sound === NotificationSounds.Urgent
  ) {
    return NotificationChannelIds.Urgent;
  }
  if (input.source === SUPER_ADMIN_BROADCAST_SOURCE) {
    return NotificationChannelIds.Updates;
  }
  if (input.category === NotificationCategories.Orders) {
    return NotificationChannelIds.Orders;
  }
  if (input.category === NotificationCategories.Chat) {
    return NotificationChannelIds.Chat;
  }
  return NotificationChannelIds.General;
}

const categories = Object.values(NotificationCategories);
const priorities = Object.values(NotificationPriorities);
const sounds = Object.values(NotificationSounds);
const sources = [undefined, SUPER_ADMIN_BROADCAST_SOURCE, "order_action"] as const;

for (const category of categories) {
  for (const priority of priorities) {
    for (const sound of sounds) {
      for (const source of sources) {
        const context = { category, priority, sound, source };
        const domain = resolveAndroidChannelId(context);
        const native = mirrorNativeResolveChannelId(context);
        assert.equal(
          domain,
          native,
          `Channel drift for ${JSON.stringify(context)}`,
        );
        assert.ok(registered.has(domain), `Channel ${domain} is not registered natively.`);
      }
    }
  }
}

for (const scenario of NOTIFICATION_TEST_SCENARIOS) {
  assert.equal(
    resolveAndroidChannelId({
      category: scenario.category,
      priority: scenario.priority,
      sound: scenario.sound,
      source: scenario.source,
    }),
    scenario.channelId,
    `Test scenario ${scenario.id} channel mismatch`,
  );
}

const builder = new NotificationBuilder();
for (const locale of ["ar", "en"] as const) {
  const templates = JSON.parse(
    readFileSync(
      path.resolve(
        "packages/notifications-core/src/config/templates",
        `notifications.${locale}.json`,
      ),
      "utf8",
    ),
  ) as Record<
    string,
    {
      category: string;
      priority?: string;
      sound?: string;
      channels?: string[];
    }
  >;

  for (const [templateId, template] of Object.entries(templates)) {
    if (!template.channels?.includes("android_push")) continue;
    const built = builder.fromTemplate({
      uid: "parity",
      templateId,
      dedupeKey: `parity:${templateId}`,
      locale,
    });
    const channel = resolveAndroidChannelId({
      category: built.category,
      priority: built.priority,
      sound: built.sound,
      source: built.metadata?.source,
    });
    assert.ok(
      registered.has(channel),
      `${locale}:${templateId} resolves to unregistered channel ${channel}`,
    );
  }
}

const androidChannels = readFileSync(
  path.resolve(
    existsSync(
      path.join(
        "packages/native-core/android/src/main/java/hgh/asol/app/AsolNotificationChannels.java",
      ),
    )
      ? "packages/native-core/android/src/main/java/hgh/asol/app/AsolNotificationChannels.java"
      : "android/app/src/main/java/hgh/asol/app/AsolNotificationChannels.java",
  ),
  "utf8",
);

for (const id of FROZEN_CHANNEL_IDS) {
  assert.ok(
    androidChannels.includes(`"${id}"`),
    `Native Java bootstrap missing channel ${id}`,
  );
  assert.equal(
    Object.values(NotificationChannelIds).includes(id as never),
    true,
    `notifications-core missing channel id ${id}`,
  );
}

console.log("notification-channel-parity.test: ok");
