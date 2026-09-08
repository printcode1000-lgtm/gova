/**
 * Desired schema for the `advertisements` Turso database.
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

export const advertisementsDesiredSchema: DatabaseSchema = {
  "source": "advertisements",
  "tables": {
    "hero_slider": {
      "name": "hero_slider",
      "createSql": "CREATE TABLE `hero_slider` ( `id` text PRIMARY KEY NOT NULL, `config_json` text NOT NULL, `version` integer DEFAULT 1 NOT NULL, `check_interval_minutes` integer DEFAULT 15 NOT NULL, `updated_at` text NOT NULL, `updated_by` text )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "config_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "version",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "check_interval_minutes",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "15",
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
          "name": "updated_by",
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
    "featured_marquee": {
      "name": "featured_marquee",
      "createSql": "CREATE TABLE `featured_marquee` ( `id` text PRIMARY KEY NOT NULL, `product_ids_json` text DEFAULT '[]' NOT NULL, `version` integer DEFAULT 1 NOT NULL, `updated_at` text NOT NULL, `updated_by` text , `check_interval_minutes` integer DEFAULT 15 NOT NULL)",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "product_ids_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'[]'",
          "primaryKeyPosition": 0
        },
        {
          "name": "version",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
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
          "name": "updated_by",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "check_interval_minutes",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "15",
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
    "trending_ribbon": {
      "name": "trending_ribbon",
      "createSql": "CREATE TABLE `trending_ribbon` ( `id` text PRIMARY KEY NOT NULL, `config_json` text DEFAULT '{}' NOT NULL, `version` integer DEFAULT 1 NOT NULL, `check_interval_minutes` integer DEFAULT 15 NOT NULL, `updated_at` text NOT NULL, `updated_by` text )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "config_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'{}'",
          "primaryKeyPosition": 0
        },
        {
          "name": "version",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "check_interval_minutes",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "15",
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
          "name": "updated_by",
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
  "indexes": {},
  "views": {},
  "triggers": {}
};
