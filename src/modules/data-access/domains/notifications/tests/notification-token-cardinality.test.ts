import assert from "node:assert/strict";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import type { IDatabaseClient } from "@/modules/data-access/core/database/database-client.interface";
import { UserNotificationTokenRepository } from "@/modules/data-access/domains/notifications/repositories/user-notification-token-repository";

const sqlite = new Database(":memory:");
sqlite.exec(`
  CREATE TABLE user_notification_tokens (
    id TEXT PRIMARY KEY NOT NULL,
    uid TEXT NOT NULL,
    platform TEXT NOT NULL,
    provider TEXT NOT NULL,
    device_id TEXT NOT NULL,
    token TEXT NOT NULL,
    locale TEXT DEFAULT 'ar' NOT NULL,
    enabled INTEGER DEFAULT 1 NOT NULL,
    last_seen_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    deleted_at TEXT
  );
  CREATE UNIQUE INDEX user_notification_tokens_uid_platform_unique
    ON user_notification_tokens(uid, platform);
  CREATE UNIQUE INDEX user_notification_tokens_token_unique
    ON user_notification_tokens(token);
  CREATE TABLE user_notification_preferences (
    uid TEXT PRIMARY KEY NOT NULL,
    specialty_requests_enabled INTEGER DEFAULT 1 NOT NULL,
    product_conversations_enabled INTEGER DEFAULT 1 NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const database = {
  db: drizzle(sqlite),
  execute: async (sql: string, params: unknown[] = []) => {
    sqlite.prepare(sql).run(...params);
    return [];
  },
} as IDatabaseClient;
const repository = new UserNotificationTokenRepository(database);

const base = {
  uid: "user-1",
  phone: "+201000000000",
  platform: "android" as const,
  provider: "fcm",
  deviceId: "android-device-1",
  token: "fcm-token-aaaaaaaaaaaaaaaaaaaaaaaa",
  locale: "ar" as const,
};

async function main(): Promise<void> {
  try {
    await repository.upsert(base);
    await repository.upsert({
      ...base,
      deviceId: "android-device-2",
      token: "fcm-token-bbbbbbbbbbbbbbbbbbbbbbbb",
      locale: "en",
    });

    let rows = await repository.listByUid(base.uid);
    assert.equal(
      rows.length,
      1,
      "a second Android registration must replace the first",
    );
    assert.equal(rows[0]?.deviceId, "android-device-2");
    assert.equal(rows[0]?.token, "fcm-token-bbbbbbbbbbbbbbbbbbbbbbbb");

    await repository.disable({ uid: base.uid, deviceId: "android-device-1" });
    rows = await repository.listByUid(base.uid);
    assert.equal(
      rows.length,
      1,
      "an old device must not disable its replacement",
    );

    await Promise.all([
      repository.upsert({
        ...base,
        platform: "web",
        provider: "web_push",
        deviceId: "browser-1",
        token: "web-token-cccccccccccccccccccccccc",
      }),
      repository.upsert({
        ...base,
        platform: "web",
        provider: "web_push",
        deviceId: "browser-2",
        token: "web-token-dddddddddddddddddddddddd",
      }),
    ]);

    rows = await repository.listByUid(base.uid);
    assert.equal(
      rows.length,
      2,
      "one Android and one Web registration may coexist",
    );
    assert.equal(rows.filter((row) => row.platform === "android").length, 1);
    assert.equal(rows.filter((row) => row.platform === "web").length, 1);

    await repository.upsert({
      ...base,
      uid: "user-2",
      platform: "web",
      provider: "web_push",
      deviceId: "browser-2",
      token: "web-token-dddddddddddddddddddddddd",
    });
    assert.equal(
      (await repository.listByUid(base.uid)).filter(
        (row) => row.platform === "web",
      ).length,
      0,
      "the same browser subscription must leave its previous account",
    );
    assert.equal(
      (await repository.listByUid("user-2")).filter(
        (row) => row.platform === "web",
      ).length,
      1,
    );

    const duplicateGroups = sqlite
      .prepare(
        "SELECT COUNT(*) count FROM (SELECT uid, platform FROM user_notification_tokens GROUP BY uid, platform HAVING COUNT(*) > 1)",
      )
      .get() as { count: number };
    assert.equal(duplicateGroups.count, 0);

    assert.deepEqual(await repository.chatPreferences(base.uid), {
      specialtyRequestsEnabled: true,
      productConversationsEnabled: true,
    });
    await repository.setChatPreferences(base.uid, {
      productConversationsEnabled: false,
    });
    assert.deepEqual(
      await repository.chatPreferences(base.uid),
      {
        specialtyRequestsEnabled: true,
        productConversationsEnabled: false,
      },
      "product chat opt-out must not disable specialty requests",
    );
    await repository.setChatPreferences(base.uid, {
      specialtyRequestsEnabled: false,
    });
    assert.deepEqual(
      await repository.chatPreferences(base.uid),
      {
        specialtyRequestsEnabled: false,
        productConversationsEnabled: false,
      },
      "specialty request changes must not overwrite product chat preference",
    );
  } finally {
    sqlite.close();
  }

  console.log("Notification token cardinality tests passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
