/**
 * Desired schema for the `orders-payments` Turso database.
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

export const ordersPaymentsDesiredSchema: DatabaseSchema = {
  "source": "orders-payments",
  "tables": {
    "payments": {
      "name": "payments",
      "createSql": "CREATE TABLE payments (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, buyer_id TEXT NOT NULL, payment_method TEXT NOT NULL CHECK(payment_method IN ('electronic_payment','cash_on_delivery','wallet','bank_transfer')), amount INTEGER NOT NULL CHECK(amount>=0), currency TEXT NOT NULL CHECK(length(currency)=3), status TEXT NOT NULL DEFAULT 'pending', provider TEXT, provider_transaction_id TEXT, transaction_data_json TEXT, paid_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
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
          "name": "buyer_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "payment_method",
          "type": "TEXT",
          "notNull": true,
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
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'pending'",
          "primaryKeyPosition": 0
        },
        {
          "name": "provider",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "provider_transaction_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "transaction_data_json",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "paid_at",
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
          "amount>=0",
          "length(currency)=3",
          "payment_method IN ('electronic_payment','cash_on_delivery','wallet','bank_transfer')"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    }
  },
  "indexes": {
    "payments_lookup_idx": {
      "name": "payments_lookup_idx",
      "tableName": "payments",
      "sql": "CREATE INDEX payments_lookup_idx ON payments(order_id,buyer_id,status)",
      "unique": false,
      "columns": [
        "order_id",
        "buyer_id",
        "status"
      ],
      "where": null
    },
    "payments_order_id_idx": {
      "name": "payments_order_id_idx",
      "tableName": "payments",
      "sql": "CREATE INDEX payments_order_id_idx ON payments(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "payments_buyer_id_idx": {
      "name": "payments_buyer_id_idx",
      "tableName": "payments",
      "sql": "CREATE INDEX payments_buyer_id_idx ON payments(buyer_id)",
      "unique": false,
      "columns": [
        "buyer_id"
      ],
      "where": null
    },
    "payments_status_idx": {
      "name": "payments_status_idx",
      "tableName": "payments",
      "sql": "CREATE INDEX payments_status_idx ON payments(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {
    "payments_status_guard": {
      "name": "payments_status_guard",
      "sql": "CREATE TRIGGER payments_status_guard BEFORE INSERT ON payments WHEN NEW.status NOT IN ('pending','partially_paid','fully_paid','failed','cancelled','refunded') BEGIN SELECT RAISE(ABORT,'invalid payment status'); END"
    },
    "payments_status_update_guard": {
      "name": "payments_status_update_guard",
      "sql": "CREATE TRIGGER payments_status_update_guard BEFORE UPDATE OF status ON payments WHEN NEW.status NOT IN ('pending','partially_paid','fully_paid','failed','cancelled','refunded') BEGIN SELECT RAISE(ABORT,'invalid payment status'); END"
    },
    "payment_money_guard": {
      "name": "payment_money_guard",
      "sql": "CREATE TRIGGER payment_money_guard BEFORE INSERT ON payments WHEN typeof(NEW.amount)<>'integer' BEGIN SELECT RAISE(ABORT,'payment amount must use integer minor units'); END"
    },
    "payment_money_update_guard": {
      "name": "payment_money_update_guard",
      "sql": "CREATE TRIGGER payment_money_update_guard BEFORE UPDATE OF amount ON payments WHEN typeof(NEW.amount)<>'integer' BEGIN SELECT RAISE(ABORT,'payment amount must use integer minor units'); END"
    }
  }
};
