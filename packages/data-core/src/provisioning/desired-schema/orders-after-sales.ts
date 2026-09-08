/**
 * Desired schema for the `orders-after-sales` Turso database.
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

export const ordersAfterSalesDesiredSchema: DatabaseSchema = {
  "source": "orders-after-sales",
  "tables": {
    "cancellations": {
      "name": "cancellations",
      "createSql": "CREATE TABLE cancellations (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_order_id TEXT, order_item_id TEXT, custom_request_item_id TEXT, cancelled_by TEXT NOT NULL, cancelled_by_role TEXT NOT NULL CHECK(cancelled_by_role IN ('buyer','seller','service_provider','carrier','admin','system')), reason TEXT NOT NULL, affected_amount INTEGER NOT NULL DEFAULT 0 CHECK(affected_amount>=0), currency TEXT NOT NULL CHECK(length(currency)=3), requires_refund INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'requested', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
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
          "name": "cancelled_by",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "cancelled_by_role",
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
          "name": "affected_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
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
          "name": "requires_refund",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
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
          "affected_amount>=0",
          "cancelled_by_role IN ('buyer','seller','service_provider','carrier','admin','system')",
          "length(currency)=3"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "cancellation_items": {
      "name": "cancellation_items",
      "createSql": "CREATE TABLE cancellation_items (id TEXT PRIMARY KEY, cancellation_id TEXT NOT NULL, order_item_id TEXT, custom_request_item_id TEXT, amount INTEGER NOT NULL CHECK(amount>=0), created_at TEXT NOT NULL, CHECK((order_item_id IS NULL) != (custom_request_item_id IS NULL)))",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "cancellation_id",
          "type": "TEXT",
          "notNull": true,
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
          "name": "amount",
          "type": "INTEGER",
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
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [
          "(order_item_id IS NULL) != (custom_request_item_id IS NULL)",
          "amount>=0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "return_requests": {
      "name": "return_requests",
      "createSql": "CREATE TABLE return_requests (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, buyer_id TEXT NOT NULL, seller_order_id TEXT, reason TEXT NOT NULL, seller_approved INTEGER, seller_rejection_reason TEXT, carrier_id TEXT, return_shipment_id TEXT, inspection_status TEXT, inspection_notes TEXT, refund_id TEXT, status TEXT NOT NULL DEFAULT 'requested', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT)",
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
          "name": "seller_order_id",
          "type": "TEXT",
          "notNull": false,
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
          "name": "seller_approved",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_rejection_reason",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "carrier_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "return_shipment_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "inspection_status",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "inspection_notes",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "refund_id",
          "type": "TEXT",
          "notNull": false,
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
        },
        {
          "name": "closed_at",
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
    "return_request_items": {
      "name": "return_request_items",
      "createSql": "CREATE TABLE return_request_items (id TEXT PRIMARY KEY, return_request_id TEXT NOT NULL, item_type TEXT NOT NULL CHECK(item_type IN ('order_item','custom_request_item')), order_item_id TEXT, custom_request_item_id TEXT, quantity INTEGER NOT NULL CHECK(quantity>0), reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK((item_type='order_item' AND order_item_id IS NOT NULL AND custom_request_item_id IS NULL) OR (item_type='custom_request_item' AND custom_request_item_id IS NOT NULL AND order_item_id IS NULL)))",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "return_request_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "item_type",
          "type": "TEXT",
          "notNull": true,
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
          "name": "quantity",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "reason",
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
          "(item_type='order_item' AND order_item_id IS NOT NULL AND custom_request_item_id IS NULL) OR (item_type='custom_request_item' AND custom_request_item_id IS NOT NULL AND order_item_id IS NULL)",
          "item_type IN ('order_item','custom_request_item')",
          "quantity>0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "replacement_requests": {
      "name": "replacement_requests",
      "createSql": "CREATE TABLE replacement_requests (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, buyer_id TEXT NOT NULL, seller_order_id TEXT, reason TEXT NOT NULL, seller_approved INTEGER, seller_rejection_reason TEXT, return_shipment_id TEXT, replacement_shipment_id TEXT, status TEXT NOT NULL DEFAULT 'requested', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT)",
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
          "name": "seller_order_id",
          "type": "TEXT",
          "notNull": false,
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
          "name": "seller_approved",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_rejection_reason",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "return_shipment_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "replacement_shipment_id",
          "type": "TEXT",
          "notNull": false,
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
        },
        {
          "name": "closed_at",
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
    "replacement_request_items": {
      "name": "replacement_request_items",
      "createSql": "CREATE TABLE replacement_request_items (id TEXT PRIMARY KEY, replacement_request_id TEXT NOT NULL, old_item_type TEXT NOT NULL CHECK(old_item_type IN ('order_item','custom_request_item')), old_order_item_id TEXT, old_custom_request_item_id TEXT, replacement_description TEXT, replacement_product_id TEXT, replacement_variant_id TEXT, quantity INTEGER NOT NULL CHECK(quantity>0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK((old_item_type='order_item' AND old_order_item_id IS NOT NULL AND old_custom_request_item_id IS NULL) OR (old_item_type='custom_request_item' AND old_custom_request_item_id IS NOT NULL AND old_order_item_id IS NULL)))",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "replacement_request_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "old_item_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "old_order_item_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "old_custom_request_item_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "replacement_description",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "replacement_product_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "replacement_variant_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "quantity",
          "type": "INTEGER",
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
      "foreignKeys": [],
      "constraints": {
        "checks": [
          "(old_item_type='order_item' AND old_order_item_id IS NOT NULL AND old_custom_request_item_id IS NULL) OR (old_item_type='custom_request_item' AND old_custom_request_item_id IS NOT NULL AND old_order_item_id IS NULL)",
          "old_item_type IN ('order_item','custom_request_item')",
          "quantity>0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    }
  },
  "indexes": {
    "cancellations_lookup_idx": {
      "name": "cancellations_lookup_idx",
      "tableName": "cancellations",
      "sql": "CREATE INDEX cancellations_lookup_idx ON cancellations(order_id,seller_order_id,status)",
      "unique": false,
      "columns": [
        "order_id",
        "seller_order_id",
        "status"
      ],
      "where": null
    },
    "cancellations_order_id_idx": {
      "name": "cancellations_order_id_idx",
      "tableName": "cancellations",
      "sql": "CREATE INDEX cancellations_order_id_idx ON cancellations(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "cancellations_seller_order_id_idx": {
      "name": "cancellations_seller_order_id_idx",
      "tableName": "cancellations",
      "sql": "CREATE INDEX cancellations_seller_order_id_idx ON cancellations(seller_order_id)",
      "unique": false,
      "columns": [
        "seller_order_id"
      ],
      "where": null
    },
    "cancellations_status_idx": {
      "name": "cancellations_status_idx",
      "tableName": "cancellations",
      "sql": "CREATE INDEX cancellations_status_idx ON cancellations(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "returns_lookup_idx": {
      "name": "returns_lookup_idx",
      "tableName": "return_requests",
      "sql": "CREATE INDEX returns_lookup_idx ON return_requests(order_id,buyer_id,status)",
      "unique": false,
      "columns": [
        "order_id",
        "buyer_id",
        "status"
      ],
      "where": null
    },
    "return_requests_order_id_idx": {
      "name": "return_requests_order_id_idx",
      "tableName": "return_requests",
      "sql": "CREATE INDEX return_requests_order_id_idx ON return_requests(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "return_requests_buyer_id_idx": {
      "name": "return_requests_buyer_id_idx",
      "tableName": "return_requests",
      "sql": "CREATE INDEX return_requests_buyer_id_idx ON return_requests(buyer_id)",
      "unique": false,
      "columns": [
        "buyer_id"
      ],
      "where": null
    },
    "return_requests_status_idx": {
      "name": "return_requests_status_idx",
      "tableName": "return_requests",
      "sql": "CREATE INDEX return_requests_status_idx ON return_requests(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "replacements_lookup_idx": {
      "name": "replacements_lookup_idx",
      "tableName": "replacement_requests",
      "sql": "CREATE INDEX replacements_lookup_idx ON replacement_requests(order_id,buyer_id,status)",
      "unique": false,
      "columns": [
        "order_id",
        "buyer_id",
        "status"
      ],
      "where": null
    },
    "replacement_requests_order_id_idx": {
      "name": "replacement_requests_order_id_idx",
      "tableName": "replacement_requests",
      "sql": "CREATE INDEX replacement_requests_order_id_idx ON replacement_requests(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "replacement_requests_buyer_id_idx": {
      "name": "replacement_requests_buyer_id_idx",
      "tableName": "replacement_requests",
      "sql": "CREATE INDEX replacement_requests_buyer_id_idx ON replacement_requests(buyer_id)",
      "unique": false,
      "columns": [
        "buyer_id"
      ],
      "where": null
    },
    "replacement_requests_status_idx": {
      "name": "replacement_requests_status_idx",
      "tableName": "replacement_requests",
      "sql": "CREATE INDEX replacement_requests_status_idx ON replacement_requests(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {
    "cancellations_status_guard": {
      "name": "cancellations_status_guard",
      "sql": "CREATE TRIGGER cancellations_status_guard BEFORE INSERT ON cancellations WHEN NEW.status NOT IN ('requested','accepted','rejected','executed') BEGIN SELECT RAISE(ABORT,'invalid cancellation status'); END"
    },
    "cancellations_status_update_guard": {
      "name": "cancellations_status_update_guard",
      "sql": "CREATE TRIGGER cancellations_status_update_guard BEFORE UPDATE OF status ON cancellations WHEN NEW.status NOT IN ('requested','accepted','rejected','executed') BEGIN SELECT RAISE(ABORT,'invalid cancellation status'); END"
    },
    "cancellation_money_guard": {
      "name": "cancellation_money_guard",
      "sql": "CREATE TRIGGER cancellation_money_guard BEFORE INSERT ON cancellations WHEN typeof(NEW.affected_amount)<>'integer' BEGIN SELECT RAISE(ABORT,'cancellation amount must use integer minor units'); END"
    },
    "cancellation_money_update_guard": {
      "name": "cancellation_money_update_guard",
      "sql": "CREATE TRIGGER cancellation_money_update_guard BEFORE UPDATE OF affected_amount ON cancellations WHEN typeof(NEW.affected_amount)<>'integer' BEGIN SELECT RAISE(ABORT,'cancellation amount must use integer minor units'); END"
    },
    "cancellation_item_money_guard": {
      "name": "cancellation_item_money_guard",
      "sql": "CREATE TRIGGER cancellation_item_money_guard BEFORE INSERT ON cancellation_items WHEN typeof(NEW.amount)<>'integer' BEGIN SELECT RAISE(ABORT,'cancellation item amount must use integer minor units'); END"
    },
    "cancellation_item_money_update_guard": {
      "name": "cancellation_item_money_update_guard",
      "sql": "CREATE TRIGGER cancellation_item_money_update_guard BEFORE UPDATE OF amount ON cancellation_items WHEN typeof(NEW.amount)<>'integer' BEGIN SELECT RAISE(ABORT,'cancellation item amount must use integer minor units'); END"
    },
    "returns_status_guard": {
      "name": "returns_status_guard",
      "sql": "CREATE TRIGGER returns_status_guard BEFORE INSERT ON return_requests WHEN NEW.status NOT IN ('requested','seller_approved','seller_rejected','waiting_for_pickup','picked_up','received','under_inspection','inspection_accepted','inspection_rejected','refund_pending','refunded','closed') BEGIN SELECT RAISE(ABORT,'invalid return status'); END"
    },
    "returns_status_update_guard": {
      "name": "returns_status_update_guard",
      "sql": "CREATE TRIGGER returns_status_update_guard BEFORE UPDATE OF status ON return_requests WHEN NEW.status NOT IN ('requested','seller_approved','seller_rejected','waiting_for_pickup','picked_up','received','under_inspection','inspection_accepted','inspection_rejected','refund_pending','refunded','closed') BEGIN SELECT RAISE(ABORT,'invalid return status'); END"
    },
    "replacements_status_guard": {
      "name": "replacements_status_guard",
      "sql": "CREATE TRIGGER replacements_status_guard BEFORE INSERT ON replacement_requests WHEN NEW.status NOT IN ('requested','accepted','rejected','waiting_for_return','return_in_transit','replacement_preparing','replacement_in_transit','replaced','closed') BEGIN SELECT RAISE(ABORT,'invalid replacement status'); END"
    },
    "replacements_status_update_guard": {
      "name": "replacements_status_update_guard",
      "sql": "CREATE TRIGGER replacements_status_update_guard BEFORE UPDATE OF status ON replacement_requests WHEN NEW.status NOT IN ('requested','accepted','rejected','waiting_for_return','return_in_transit','replacement_preparing','replacement_in_transit','replaced','closed') BEGIN SELECT RAISE(ABORT,'invalid replacement status'); END"
    }
  }
};
