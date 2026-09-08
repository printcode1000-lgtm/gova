/**
 * Desired schema for the `orders-shipping-quotes` Turso database.
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

export const ordersShippingQuotesDesiredSchema: DatabaseSchema = {
  "source": "orders-shipping-quotes",
  "tables": {
    "shipping_quotes": {
      "name": "shipping_quotes",
      "createSql": "CREATE TABLE shipping_quotes ( id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_order_id TEXT NOT NULL, seller_id TEXT NOT NULL, service_provider_id TEXT, buyer_id TEXT NOT NULL, version INTEGER NOT NULL CHECK(version > 0), proposed_by TEXT, proposed_by_role TEXT CHECK(proposed_by_role IS NULL OR proposed_by_role IN ('seller','service_provider','admin')), base_shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(base_shipping_price >= 0), special_vehicle_fee INTEGER NOT NULL DEFAULT 0 CHECK(special_vehicle_fee >= 0), total_shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(total_shipping_price >= 0), status TEXT NOT NULL CHECK(status IN ('requested','pending_buyer','accepted','rejected','superseded','expired','cancelled')), notes TEXT, expires_at TEXT, responded_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(seller_order_id, version) )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "order_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_order_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "service_provider_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "buyer_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "version",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "proposed_by",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "proposed_by_role",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "base_shipping_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "special_vehicle_fee",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "total_shipping_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "notes",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "expires_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "responded_at",
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
        "checks": [
          "base_shipping_price >= 0",
          "proposed_by_role IS NULL OR proposed_by_role IN ('seller','service_provider','admin')",
          "special_vehicle_fee >= 0",
          "status IN ('requested','pending_buyer','accepted','rejected','superseded','expired','cancelled')",
          "total_shipping_price >= 0",
          "version > 0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "seller_order_id",
            "version"
          ]
        ]
      }
    }
  },
  "indexes": {
    "shipping_quotes_order_id_idx": {
      "name": "shipping_quotes_order_id_idx",
      "tableName": "shipping_quotes",
      "sql": "CREATE INDEX shipping_quotes_order_id_idx ON shipping_quotes(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "shipping_quotes_seller_order_id_idx": {
      "name": "shipping_quotes_seller_order_id_idx",
      "tableName": "shipping_quotes",
      "sql": "CREATE INDEX shipping_quotes_seller_order_id_idx ON shipping_quotes(seller_order_id)",
      "unique": false,
      "columns": [
        "seller_order_id"
      ],
      "where": null
    },
    "shipping_quotes_buyer_id_idx": {
      "name": "shipping_quotes_buyer_id_idx",
      "tableName": "shipping_quotes",
      "sql": "CREATE INDEX shipping_quotes_buyer_id_idx ON shipping_quotes(buyer_id)",
      "unique": false,
      "columns": [
        "buyer_id"
      ],
      "where": null
    },
    "shipping_quotes_status_idx": {
      "name": "shipping_quotes_status_idx",
      "tableName": "shipping_quotes",
      "sql": "CREATE INDEX shipping_quotes_status_idx ON shipping_quotes(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "shipping_quotes_one_pending_idx": {
      "name": "shipping_quotes_one_pending_idx",
      "tableName": "shipping_quotes",
      "sql": "CREATE UNIQUE INDEX shipping_quotes_one_pending_idx ON shipping_quotes(seller_order_id) WHERE status='pending_buyer'",
      "unique": true,
      "columns": [
        "seller_order_id"
      ],
      "where": "status='pending_buyer'"
    },
    "shipping_quotes_one_accepted_idx": {
      "name": "shipping_quotes_one_accepted_idx",
      "tableName": "shipping_quotes",
      "sql": "CREATE UNIQUE INDEX shipping_quotes_one_accepted_idx ON shipping_quotes(seller_order_id) WHERE status='accepted'",
      "unique": true,
      "columns": [
        "seller_order_id"
      ],
      "where": "status='accepted'"
    }
  },
  "views": {},
  "triggers": {
    "shipping_quote_money_insert_guard": {
      "name": "shipping_quote_money_insert_guard",
      "sql": "CREATE TRIGGER shipping_quote_money_insert_guard BEFORE INSERT ON shipping_quotes WHEN typeof(NEW.base_shipping_price)<>'integer' OR typeof(NEW.special_vehicle_fee)<>'integer' OR typeof(NEW.total_shipping_price)<>'integer' BEGIN SELECT RAISE(ABORT,'shipping quote money must use integer minor units'); END"
    },
    "shipping_quote_money_update_guard": {
      "name": "shipping_quote_money_update_guard",
      "sql": "CREATE TRIGGER shipping_quote_money_update_guard BEFORE UPDATE OF base_shipping_price,special_vehicle_fee,total_shipping_price ON shipping_quotes WHEN typeof(NEW.base_shipping_price)<>'integer' OR typeof(NEW.special_vehicle_fee)<>'integer' OR typeof(NEW.total_shipping_price)<>'integer' BEGIN SELECT RAISE(ABORT,'shipping quote money must use integer minor units'); END"
    }
  }
};
