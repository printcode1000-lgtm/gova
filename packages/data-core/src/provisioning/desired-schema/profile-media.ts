/**
 * Desired schema for the `profile-media` Turso database.
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

export const profileMediaDesiredSchema: DatabaseSchema = {
  "source": "profile-media",
  "tables": {
    "profile_images": {
      "name": "profile_images",
      "createSql": "CREATE TABLE profile_images (id text PRIMARY KEY NOT NULL, uid text NOT NULL, image_key text NOT NULL, image_type text NOT NULL, is_primary integer NOT NULL DEFAULT 0, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL)",
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
          "name": "image_key",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "image_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "is_primary",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "sort_order",
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
    }
  },
  "indexes": {
    "profile_images_uid_type_idx": {
      "name": "profile_images_uid_type_idx",
      "tableName": "profile_images",
      "sql": "CREATE INDEX profile_images_uid_type_idx ON profile_images (uid, image_type)",
      "unique": false,
      "columns": [
        "uid",
        "image_type"
      ],
      "where": null
    },
    "profile_images_uid_key_unique": {
      "name": "profile_images_uid_key_unique",
      "tableName": "profile_images",
      "sql": "CREATE UNIQUE INDEX profile_images_uid_key_unique ON profile_images (uid, image_key, image_type)",
      "unique": true,
      "columns": [
        "uid",
        "image_key",
        "image_type"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
