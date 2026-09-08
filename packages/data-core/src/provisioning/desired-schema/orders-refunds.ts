/**
 * Desired schema for the `orders-refunds` Turso database.
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

export const ordersRefundsDesiredSchema: DatabaseSchema = {
  "source": "orders-refunds",
  "tables": {
    "refunds": {
      "name": "refunds",
      "createSql": "CREATE TABLE refunds (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, payment_id TEXT, order_item_id TEXT, custom_request_item_id TEXT, return_request_id TEXT, amount INTEGER NOT NULL CHECK(amount>0), currency TEXT NOT NULL CHECK(length(currency)=3), reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requested', executed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
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
          "name": "payment_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "order_item_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "custom_request_item_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "return_request_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "currency",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "reason",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'requested'",
          "primaryKeyPosition": 0
        },
        {
          "name": "executed_at",
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
          "amount>0",
          "length(currency)=3"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    }
  },
  "indexes": {
    "refunds_lookup_idx": {
      "name": "refunds_lookup_idx",
      "tableName": "refunds",
      "sql": "CREATE INDEX refunds_lookup_idx ON refunds(order_id,payment_id,status)",
      "unique": false,
      "columns": [
        "order_id",
        "payment_id",
        "status"
      ],
      "where": null
    },
    "refunds_order_id_idx": {
      "name": "refunds_order_id_idx",
      "tableName": "refunds",
      "sql": "CREATE INDEX refunds_order_id_idx ON refunds(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "refunds_payment_id_idx": {
      "name": "refunds_payment_id_idx",
      "tableName": "refunds",
      "sql": "CREATE INDEX refunds_payment_id_idx ON refunds(payment_id)",
      "unique": false,
      "columns": [
        "payment_id"
      ],
      "where": null
    },
    "refunds_status_idx": {
      "name": "refunds_status_idx",
      "tableName": "refunds",
      "sql": "CREATE INDEX refunds_status_idx ON refunds(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {
    "refunds_status_guard": {
      "name": "refunds_status_guard",
      "sql": "CREATE TRIGGER refunds_status_guard BEFORE INSERT ON refunds WHEN NEW.status NOT IN ('requested','under_review','accepted','rejected','partially_refunded','fully_refunded') BEGIN SELECT RAISE(ABORT,'invalid refund status'); END"
    },
    "refunds_status_update_guard": {
      "name": "refunds_status_update_guard",
      "sql": "CREATE TRIGGER refunds_status_update_guard BEFORE UPDATE OF status ON refunds WHEN NEW.status NOT IN ('requested','under_review','accepted','rejected','partially_refunded','fully_refunded') BEGIN SELECT RAISE(ABORT,'invalid refund status'); END"
    },
    "refund_money_guard": {
      "name": "refund_money_guard",
      "sql": "CREATE TRIGGER refund_money_guard BEFORE INSERT ON refunds WHEN typeof(NEW.amount)<>'integer' BEGIN SELECT RAISE(ABORT,'refund amount must use integer minor units'); END"
    },
    "refund_money_update_guard": {
      "name": "refund_money_update_guard",
      "sql": "CREATE TRIGGER refund_money_update_guard BEFORE UPDATE OF amount ON refunds WHEN typeof(NEW.amount)<>'integer' BEGIN SELECT RAISE(ABORT,'refund amount must use integer minor units'); END"
    }
  }
};
