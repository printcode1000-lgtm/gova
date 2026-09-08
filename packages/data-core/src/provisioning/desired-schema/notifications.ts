/**
 * Desired schema for the `notifications` Turso database.
 *
 * Generated once from the verified schema of the database this repository was
 * already running against, then owned here by hand. It is the provisioning
 * SSOT: schema sync compares *this* with a live Turso read-back, and no local
 * SQLite file, migration replay, or embedded database engine takes part.
 *
 * Drizzle `sqliteTable(...)` declarations remain the application data mapping
 * and historical migrations remain history; a static parity test keeps the
 * three from drifting apart.
 */
import type { DatabaseSchema } from '../core/types';

export const notificationsDesiredSchema: DatabaseSchema = {
  "source": "notifications",
  "tables": {
    "user_notification_tokens": {
      "name": "user_notification_tokens",
      "createSql": "CREATE TABLE `user_notification_tokens` ( `id` text PRIMARY KEY NOT NULL, `uid` text NOT NULL, `platform` text NOT NULL, `provider` text NOT NULL, `device_id` text NOT NULL, `token` text NOT NULL, `locale` text DEFAULT 'ar' NOT NULL, `enabled` integer DEFAULT true NOT NULL, `last_seen_at` text, `created_at` text, `updated_at` text, `deleted_at` text )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "platform",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "provider",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "device_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "token",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "locale",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'ar'",
          "primaryKeyPosition": 0
        },
        {
          "name": "enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "true",
          "primaryKeyPosition": 0
        },
        {
          "name": "last_seen_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "created_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "updated_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "deleted_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "user_notification_preferences": {
      "name": "user_notification_preferences",
      "createSql": "CREATE TABLE `user_notification_preferences` ( `uid` text PRIMARY KEY NOT NULL, `specialty_requests_enabled` integer DEFAULT true NOT NULL, `product_conversations_enabled` integer DEFAULT true NOT NULL, `updated_at` text NOT NULL , `push_enabled` integer DEFAULT true NOT NULL)",
      "columns": [
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "specialty_requests_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "true",
          "primaryKeyPosition": 0
        },
        {
          "name": "product_conversations_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "true",
          "primaryKeyPosition": 0
        },
        {
          "name": "updated_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "push_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "true",
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    }
  },
  "indexes": {
    "user_notification_tokens_uid_idx": {
      "name": "user_notification_tokens_uid_idx",
      "tableName": "user_notification_tokens",
      "sql": "CREATE INDEX `user_notification_tokens_uid_idx` ON `user_notification_tokens` (`uid`)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "user_notification_tokens_uid_platform_unique": {
      "name": "user_notification_tokens_uid_platform_unique",
      "tableName": "user_notification_tokens",
      "sql": "CREATE UNIQUE INDEX `user_notification_tokens_uid_platform_unique` ON `user_notification_tokens` (`uid`,`platform`)",
      "unique": true,
      "columns": [
        "uid",
        "platform"
      ],
      "where": null
    },
    "user_notification_tokens_token_unique": {
      "name": "user_notification_tokens_token_unique",
      "tableName": "user_notification_tokens",
      "sql": "CREATE UNIQUE INDEX `user_notification_tokens_token_unique` ON `user_notification_tokens` (`token`)",
      "unique": true,
      "columns": [
        "token"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
