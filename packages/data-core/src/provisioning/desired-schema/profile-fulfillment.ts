/**
 * Desired schema for the `profile-fulfillment` Turso database.
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

export const profileFulfillmentDesiredSchema: DatabaseSchema = {
  "source": "profile-fulfillment",
  "tables": {
    "profile_delivery_carriers": {
      "name": "profile_delivery_carriers",
      "createSql": "CREATE TABLE profile_delivery_carriers (seller_uid text NOT NULL, carrier_uid text NOT NULL, is_default integer NOT NULL DEFAULT 0, priority integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL, PRIMARY KEY(seller_uid, carrier_uid))",
      "columns": [
        {
          "name": "seller_uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "carrier_uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 2
        },
        {
          "name": "is_default",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "priority",
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
    "profile_delivery_carriers_carrier_idx": {
      "name": "profile_delivery_carriers_carrier_idx",
      "tableName": "profile_delivery_carriers",
      "sql": "CREATE INDEX profile_delivery_carriers_carrier_idx ON profile_delivery_carriers (carrier_uid)",
      "unique": false,
      "columns": [
        "carrier_uid"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
