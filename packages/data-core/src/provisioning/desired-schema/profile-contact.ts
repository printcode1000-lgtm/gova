/**
 * Desired schema for the `profile-contact` Turso database.
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

export const profileContactDesiredSchema: DatabaseSchema = {
  "source": "profile-contact",
  "tables": {
    "profile_contact_points": {
      "name": "profile_contact_points",
      "createSql": "CREATE TABLE profile_contact_points (id text PRIMARY KEY NOT NULL, uid text NOT NULL, type text NOT NULL, platform text NOT NULL DEFAULT '', label text NOT NULL DEFAULT '', value text NOT NULL, normalized_value text NOT NULL DEFAULT '', handle text NOT NULL DEFAULT '', is_primary integer NOT NULL DEFAULT 0, is_public integer NOT NULL DEFAULT 1, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL)",
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
          "name": "type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "platform",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "label",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "value",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "normalized_value",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "handle",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
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
          "name": "is_public",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
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
    },
    "profile_locations": {
      "name": "profile_locations",
      "createSql": "CREATE TABLE profile_locations (id text PRIMARY KEY NOT NULL, uid text NOT NULL, label text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '', governorate text NOT NULL DEFAULT '', city text NOT NULL DEFAULT '', area text NOT NULL DEFAULT '', latitude text NOT NULL DEFAULT '', longitude text NOT NULL DEFAULT '', is_primary integer NOT NULL DEFAULT 0, is_public integer NOT NULL DEFAULT 1, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL)",
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
          "name": "label",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "address",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "governorate",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "city",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "area",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "latitude",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "longitude",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
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
          "name": "is_public",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
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
    },
    "profile_working_hours": {
      "name": "profile_working_hours",
      "createSql": "CREATE TABLE profile_working_hours (id text PRIMARY KEY NOT NULL, uid text NOT NULL, day_of_week integer NOT NULL, period_index integer NOT NULL DEFAULT 0, is_open integer NOT NULL DEFAULT 0, open_time text NOT NULL DEFAULT '', close_time text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', created_at text NOT NULL, updated_at text NOT NULL)",
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
          "name": "day_of_week",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "period_index",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "is_open",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "open_time",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "close_time",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "note",
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
    "profile_contact_points_uid_idx": {
      "name": "profile_contact_points_uid_idx",
      "tableName": "profile_contact_points",
      "sql": "CREATE INDEX profile_contact_points_uid_idx ON profile_contact_points (uid)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "profile_contact_points_lookup_idx": {
      "name": "profile_contact_points_lookup_idx",
      "tableName": "profile_contact_points",
      "sql": "CREATE INDEX profile_contact_points_lookup_idx ON profile_contact_points (type, normalized_value)",
      "unique": false,
      "columns": [
        "type",
        "normalized_value"
      ],
      "where": null
    },
    "profile_locations_uid_idx": {
      "name": "profile_locations_uid_idx",
      "tableName": "profile_locations",
      "sql": "CREATE INDEX profile_locations_uid_idx ON profile_locations (uid)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "profile_locations_geo_idx": {
      "name": "profile_locations_geo_idx",
      "tableName": "profile_locations",
      "sql": "CREATE INDEX profile_locations_geo_idx ON profile_locations (latitude, longitude)",
      "unique": false,
      "columns": [
        "latitude",
        "longitude"
      ],
      "where": null
    },
    "profile_working_hours_uid_idx": {
      "name": "profile_working_hours_uid_idx",
      "tableName": "profile_working_hours",
      "sql": "CREATE INDEX profile_working_hours_uid_idx ON profile_working_hours (uid)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "profile_working_hours_period_unique": {
      "name": "profile_working_hours_period_unique",
      "tableName": "profile_working_hours",
      "sql": "CREATE UNIQUE INDEX profile_working_hours_period_unique ON profile_working_hours (uid, day_of_week, period_index)",
      "unique": true,
      "columns": [
        "uid",
        "day_of_week",
        "period_index"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
