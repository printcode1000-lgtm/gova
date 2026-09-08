/**
 * Desired schema for the `users` Turso database.
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

export const usersDesiredSchema: DatabaseSchema = {
  "source": "users",
  "tables": {
    "users": {
      "name": "users",
      "createSql": "CREATE TABLE \"users\" ( `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `uid` text NOT NULL, `phone` text NOT NULL, `email` text, `password` text NOT NULL, `last_login_at` text, `created_at` text, `updated_at` text, `deleted_at` text , `provider_account_enabled` integer DEFAULT false NOT NULL)",
      "columns": [
        {
          "name": "id",
          "type": "INTEGER",
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
          "name": "phone",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "email",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "password",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "last_login_at",
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
        },
        {
          "name": "provider_account_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "false",
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": true,
        "uniqueConstraints": []
      }
    },
    "ota_release_audit": {
      "name": "ota_release_audit",
      "createSql": "CREATE TABLE `ota_release_audit` ( `id` text PRIMARY KEY NOT NULL, `release_id` text NOT NULL, `version` text NOT NULL, `action` text NOT NULL, `actor_uid` text, `created_at` text NOT NULL )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "release_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "version",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "action",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "actor_uid",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "created_at",
          "type": "TEXT",
          "notNull": true,
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
    "ota_releases": {
      "name": "ota_releases",
      "createSql": "CREATE TABLE `ota_releases` ( `release_id` text PRIMARY KEY NOT NULL, `version` text NOT NULL, `manifest_created_at` text NOT NULL, `base_url` text NOT NULL, `size` integer NOT NULL, `file_count` integer NOT NULL, `minimum_native_version` text NOT NULL, `mandatory` integer DEFAULT false NOT NULL, `notes` text DEFAULT '' NOT NULL, `signature` text NOT NULL, `manifest_json` text NOT NULL, `approved` integer DEFAULT false NOT NULL, `approved_at` text, `approved_by_uid` text, `revoked_at` text, `revoked_by_uid` text, `discovered_at` text NOT NULL, `last_seen_at` text NOT NULL , `rollout_percentage` integer DEFAULT 100 NOT NULL)",
      "columns": [
        {
          "name": "release_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "version",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "manifest_created_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "base_url",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "size",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "file_count",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "minimum_native_version",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "mandatory",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "false",
          "primaryKeyPosition": 0
        },
        {
          "name": "notes",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "signature",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "manifest_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "approved",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "false",
          "primaryKeyPosition": 0
        },
        {
          "name": "approved_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "approved_by_uid",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "revoked_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "revoked_by_uid",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "discovered_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "last_seen_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "rollout_percentage",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "100",
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
    "password_recovery_challenges": {
      "name": "password_recovery_challenges",
      "createSql": "CREATE TABLE `password_recovery_challenges` ( `id` text PRIMARY KEY NOT NULL, `phone_hash` text NOT NULL, `uid` text, `code_hash` text NOT NULL, `reset_token_hash` text, `request_ip_hash` text NOT NULL, `expires_at` text NOT NULL, `verified_at` text, `consumed_at` text, `attempts` integer DEFAULT 0 NOT NULL, `created_at` text NOT NULL, `last_attempt_at` text )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "phone_hash",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "code_hash",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "reset_token_hash",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "request_ip_hash",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "expires_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "verified_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "consumed_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "attempts",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "created_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "last_attempt_at",
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
    "feature_flags": {
      "name": "feature_flags",
      "createSql": "CREATE TABLE `feature_flags` ( `key` text PRIMARY KEY NOT NULL, `enabled` integer DEFAULT false NOT NULL, `notes` text DEFAULT '' NOT NULL, `updated_at` text NOT NULL, `updated_by_uid` text )",
      "columns": [
        {
          "name": "key",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "false",
          "primaryKeyPosition": 0
        },
        {
          "name": "notes",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
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
          "name": "updated_by_uid",
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
    }
  },
  "indexes": {
    "users_uid_unique": {
      "name": "users_uid_unique",
      "tableName": "users",
      "sql": "CREATE UNIQUE INDEX `users_uid_unique` ON `users` (`uid`)",
      "unique": true,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "users_phone_unique": {
      "name": "users_phone_unique",
      "tableName": "users",
      "sql": "CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`)",
      "unique": true,
      "columns": [
        "phone"
      ],
      "where": null
    },
    "ota_release_audit_release_idx": {
      "name": "ota_release_audit_release_idx",
      "tableName": "ota_release_audit",
      "sql": "CREATE INDEX `ota_release_audit_release_idx` ON `ota_release_audit` (`release_id`)",
      "unique": false,
      "columns": [
        "release_id"
      ],
      "where": null
    },
    "ota_release_audit_created_at_idx": {
      "name": "ota_release_audit_created_at_idx",
      "tableName": "ota_release_audit",
      "sql": "CREATE INDEX `ota_release_audit_created_at_idx` ON `ota_release_audit` (`created_at`)",
      "unique": false,
      "columns": [
        "created_at"
      ],
      "where": null
    },
    "ota_releases_version_idx": {
      "name": "ota_releases_version_idx",
      "tableName": "ota_releases",
      "sql": "CREATE INDEX `ota_releases_version_idx` ON `ota_releases` (`version`)",
      "unique": false,
      "columns": [
        "version"
      ],
      "where": null
    },
    "ota_releases_approved_idx": {
      "name": "ota_releases_approved_idx",
      "tableName": "ota_releases",
      "sql": "CREATE INDEX `ota_releases_approved_idx` ON `ota_releases` (`approved`)",
      "unique": false,
      "columns": [
        "approved"
      ],
      "where": null
    },
    "password_recovery_phone_created_idx": {
      "name": "password_recovery_phone_created_idx",
      "tableName": "password_recovery_challenges",
      "sql": "CREATE INDEX `password_recovery_phone_created_idx` ON `password_recovery_challenges` (`phone_hash`,`created_at`)",
      "unique": false,
      "columns": [
        "phone_hash",
        "created_at"
      ],
      "where": null
    },
    "password_recovery_ip_created_idx": {
      "name": "password_recovery_ip_created_idx",
      "tableName": "password_recovery_challenges",
      "sql": "CREATE INDEX `password_recovery_ip_created_idx` ON `password_recovery_challenges` (`request_ip_hash`,`created_at`)",
      "unique": false,
      "columns": [
        "request_ip_hash",
        "created_at"
      ],
      "where": null
    },
    "password_recovery_reset_token_idx": {
      "name": "password_recovery_reset_token_idx",
      "tableName": "password_recovery_challenges",
      "sql": "CREATE INDEX `password_recovery_reset_token_idx` ON `password_recovery_challenges` (`reset_token_hash`)",
      "unique": false,
      "columns": [
        "reset_token_hash"
      ],
      "where": null
    },
    "feature_flags_enabled_idx": {
      "name": "feature_flags_enabled_idx",
      "tableName": "feature_flags",
      "sql": "CREATE INDEX `feature_flags_enabled_idx` ON `feature_flags` (`enabled`)",
      "unique": false,
      "columns": [
        "enabled"
      ],
      "where": null
    },
    "users_email_unique": {
      "name": "users_email_unique",
      "tableName": "users",
      "sql": "CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`)",
      "unique": true,
      "columns": [
        "email"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
