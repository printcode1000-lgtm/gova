/**
 * Desired schema for the `profile-social` Turso database.
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

export const profileSocialDesiredSchema: DatabaseSchema = {
  "source": "profile-social",
  "tables": {
    "follows": {
      "name": "follows",
      "createSql": "CREATE TABLE follows ( id text PRIMARY KEY NOT NULL, follower_uid text NOT NULL, target_type text NOT NULL, target_id text NOT NULL, target_owner_uid text NOT NULL DEFAULT '', created_at text NOT NULL )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "follower_uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "target_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "target_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "target_owner_uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
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
    "profile_reviews": {
      "name": "profile_reviews",
      "createSql": "CREATE TABLE `profile_reviews` ( `id` text PRIMARY KEY NOT NULL, `target_uid` text NOT NULL, `uid` text NOT NULL, `reviewer_name` text NOT NULL, `reviewer_avatar_url` text, `rating` integer NOT NULL, `comment` text NOT NULL DEFAULT '', `helpful_count` integer NOT NULL DEFAULT 0, `created_at` text NOT NULL, `updated_at` text NOT NULL )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "target_uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "reviewer_name",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "reviewer_avatar_url",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "rating",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "comment",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "helpful_count",
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
          "name": "updated_at",
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
    "profile_review_helpful": {
      "name": "profile_review_helpful",
      "createSql": "CREATE TABLE `profile_review_helpful` ( `review_id` text NOT NULL, `uid` text NOT NULL, `created_at` text NOT NULL, PRIMARY KEY (`review_id`, `uid`), FOREIGN KEY (`review_id`) REFERENCES `profile_reviews`(`id`) ON UPDATE no action ON DELETE cascade )",
      "columns": [
        {
          "name": "review_id",
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
          "primaryKeyPosition": 2
        },
        {
          "name": "created_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [
        {
          "columns": [
            "review_id"
          ],
          "referencesTable": "profile_reviews",
          "referencesColumns": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "CASCADE"
        }
      ],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "profile_review_replies": {
      "name": "profile_review_replies",
      "createSql": "CREATE TABLE `profile_review_replies` ( `id` text PRIMARY KEY NOT NULL, `review_id` text NOT NULL UNIQUE, `seller_uid` text NOT NULL, `reply_text` text NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL, FOREIGN KEY (`review_id`) REFERENCES `profile_reviews`(`id`) ON UPDATE no action ON DELETE cascade )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "review_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "reply_text",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
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
          "name": "updated_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [
        {
          "columns": [
            "review_id"
          ],
          "referencesTable": "profile_reviews",
          "referencesColumns": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "CASCADE"
        }
      ],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "review_id"
          ]
        ]
      }
    }
  },
  "indexes": {
    "follows_follower_idx": {
      "name": "follows_follower_idx",
      "tableName": "follows",
      "sql": "CREATE INDEX follows_follower_idx ON follows (follower_uid, target_type)",
      "unique": false,
      "columns": [
        "follower_uid",
        "target_type"
      ],
      "where": null
    },
    "follows_target_idx": {
      "name": "follows_target_idx",
      "tableName": "follows",
      "sql": "CREATE INDEX follows_target_idx ON follows (target_type, target_id)",
      "unique": false,
      "columns": [
        "target_type",
        "target_id"
      ],
      "where": null
    },
    "follows_target_owner_idx": {
      "name": "follows_target_owner_idx",
      "tableName": "follows",
      "sql": "CREATE INDEX follows_target_owner_idx ON follows (target_owner_uid, target_type)",
      "unique": false,
      "columns": [
        "target_owner_uid",
        "target_type"
      ],
      "where": null
    },
    "follows_unique_target": {
      "name": "follows_unique_target",
      "tableName": "follows",
      "sql": "CREATE UNIQUE INDEX follows_unique_target ON follows (follower_uid, target_type, target_id)",
      "unique": true,
      "columns": [
        "follower_uid",
        "target_type",
        "target_id"
      ],
      "where": null
    },
    "profile_reviews_target_idx": {
      "name": "profile_reviews_target_idx",
      "tableName": "profile_reviews",
      "sql": "CREATE INDEX `profile_reviews_target_idx` ON `profile_reviews` (`target_uid`, `created_at`)",
      "unique": false,
      "columns": [
        "target_uid",
        "created_at"
      ],
      "where": null
    },
    "profile_reviews_target_uid_unique": {
      "name": "profile_reviews_target_uid_unique",
      "tableName": "profile_reviews",
      "sql": "CREATE UNIQUE INDEX `profile_reviews_target_uid_unique` ON `profile_reviews` (`target_uid`, `uid`)",
      "unique": true,
      "columns": [
        "target_uid",
        "uid"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
