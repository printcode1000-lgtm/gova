/**
 * Desired schema for the `orders-core` Turso database.
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

export const ordersCoreDesiredSchema: DatabaseSchema = {
  "source": "orders-core",
  "tables": {
    "orders": {
      "name": "orders",
      "createSql": "CREATE TABLE orders (id TEXT PRIMARY KEY, order_number TEXT NOT NULL UNIQUE, buyer_id TEXT NOT NULL, order_type TEXT NOT NULL CHECK(order_type IN ('product_order','custom_request_order','mixed_order')), delivery_address_snapshot_json TEXT NOT NULL, currency TEXT NOT NULL CHECK(length(currency)=3), notes TEXT, source TEXT, calculated_status TEXT NOT NULL DEFAULT 'new', subtotal_price INTEGER NOT NULL DEFAULT 0 CHECK(subtotal_price>=0), items_discount_total INTEGER NOT NULL DEFAULT 0 CHECK(items_discount_total>=0), order_discount_total INTEGER NOT NULL DEFAULT 0 CHECK(order_discount_total>=0), shipping_total INTEGER NOT NULL DEFAULT 0 CHECK(shipping_total>=0), shipping_discount_total INTEGER NOT NULL DEFAULT 0 CHECK(shipping_discount_total>=0), tax_total INTEGER NOT NULL DEFAULT 0 CHECK(tax_total>=0), service_fee_total INTEGER NOT NULL DEFAULT 0 CHECK(service_fee_total>=0), platform_fee_total INTEGER NOT NULL DEFAULT 0 CHECK(platform_fee_total>=0), grand_total INTEGER NOT NULL DEFAULT 0 CHECK(grand_total>=0), paid_total INTEGER NOT NULL DEFAULT 0 CHECK(paid_total>=0), refunded_total INTEGER NOT NULL DEFAULT 0 CHECK(refunded_total>=0), remaining_total INTEGER NOT NULL DEFAULT 0 CHECK(remaining_total>=0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT, archived_at TEXT)",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "order_number",
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
          "name": "order_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "delivery_address_snapshot_json",
          "type": "TEXT",
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
          "name": "notes",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "source",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "calculated_status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'new'",
          "primaryKeyPosition": 0
        },
        {
          "name": "subtotal_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "items_discount_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "order_discount_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_discount_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "tax_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "service_fee_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "platform_fee_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "grand_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "paid_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "refunded_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "remaining_total",
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
        },
        {
          "name": "closed_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "archived_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [
          "grand_total>=0",
          "items_discount_total>=0",
          "length(currency)=3",
          "order_discount_total>=0",
          "order_type IN ('product_order','custom_request_order','mixed_order')",
          "paid_total>=0",
          "platform_fee_total>=0",
          "refunded_total>=0",
          "remaining_total>=0",
          "service_fee_total>=0",
          "shipping_discount_total>=0",
          "shipping_total>=0",
          "subtotal_price>=0",
          "tax_total>=0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "order_number"
          ]
        ]
      }
    },
    "seller_orders": {
      "name": "seller_orders",
      "createSql": "CREATE TABLE seller_orders (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_id TEXT NOT NULL, service_provider_id TEXT, seller_order_type TEXT NOT NULL CHECK(seller_order_type IN ('product_items','custom_request','mixed')), status TEXT NOT NULL DEFAULT 'waiting_for_response', seller_subtotal INTEGER NOT NULL DEFAULT 0 CHECK(seller_subtotal>=0), seller_discount_total INTEGER NOT NULL DEFAULT 0 CHECK(seller_discount_total>=0), seller_shipping_total INTEGER NOT NULL DEFAULT 0 CHECK(seller_shipping_total>=0), seller_tax_total INTEGER NOT NULL DEFAULT 0 CHECK(seller_tax_total>=0), seller_commission_total INTEGER NOT NULL DEFAULT 0 CHECK(seller_commission_total>=0), seller_grand_total INTEGER NOT NULL DEFAULT 0 CHECK(seller_grand_total>=0), seller_payout_total INTEGER NOT NULL DEFAULT 0 CHECK(seller_payout_total>=0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT, fulfillment_snapshot_json TEXT NOT NULL DEFAULT '{}', UNIQUE(order_id,seller_id,service_provider_id))",
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
          "name": "seller_order_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'waiting_for_response'",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_subtotal",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_discount_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_shipping_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_tax_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_commission_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_grand_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_payout_total",
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
        },
        {
          "name": "closed_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "fulfillment_snapshot_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'{}'",
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [
          "seller_commission_total>=0",
          "seller_discount_total>=0",
          "seller_grand_total>=0",
          "seller_order_type IN ('product_items','custom_request','mixed')",
          "seller_payout_total>=0",
          "seller_shipping_total>=0",
          "seller_subtotal>=0",
          "seller_tax_total>=0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "order_id",
            "seller_id",
            "service_provider_id"
          ]
        ]
      }
    }
  },
  "indexes": {
    "orders_buyer_type_status_created_idx": {
      "name": "orders_buyer_type_status_created_idx",
      "tableName": "orders",
      "sql": "CREATE INDEX orders_buyer_type_status_created_idx ON orders(buyer_id,order_type,calculated_status,created_at)",
      "unique": false,
      "columns": [
        "buyer_id",
        "order_type",
        "calculated_status",
        "created_at"
      ],
      "where": null
    },
    "orders_order_number_idx": {
      "name": "orders_order_number_idx",
      "tableName": "orders",
      "sql": "CREATE INDEX orders_order_number_idx ON orders(order_number)",
      "unique": false,
      "columns": [
        "order_number"
      ],
      "where": null
    },
    "orders_buyer_id_idx": {
      "name": "orders_buyer_id_idx",
      "tableName": "orders",
      "sql": "CREATE INDEX orders_buyer_id_idx ON orders(buyer_id)",
      "unique": false,
      "columns": [
        "buyer_id"
      ],
      "where": null
    },
    "orders_order_type_idx": {
      "name": "orders_order_type_idx",
      "tableName": "orders",
      "sql": "CREATE INDEX orders_order_type_idx ON orders(order_type)",
      "unique": false,
      "columns": [
        "order_type"
      ],
      "where": null
    },
    "orders_calculated_status_idx": {
      "name": "orders_calculated_status_idx",
      "tableName": "orders",
      "sql": "CREATE INDEX orders_calculated_status_idx ON orders(calculated_status)",
      "unique": false,
      "columns": [
        "calculated_status"
      ],
      "where": null
    },
    "orders_created_at_idx": {
      "name": "orders_created_at_idx",
      "tableName": "orders",
      "sql": "CREATE INDEX orders_created_at_idx ON orders(created_at)",
      "unique": false,
      "columns": [
        "created_at"
      ],
      "where": null
    },
    "seller_orders_party_uq": {
      "name": "seller_orders_party_uq",
      "tableName": "seller_orders",
      "sql": "CREATE UNIQUE INDEX seller_orders_party_uq ON seller_orders(order_id,seller_id,COALESCE(service_provider_id,''))",
      "unique": true,
      "columns": [
        "order_id",
        "seller_id"
      ],
      "where": null
    },
    "seller_orders_lookup_idx": {
      "name": "seller_orders_lookup_idx",
      "tableName": "seller_orders",
      "sql": "CREATE INDEX seller_orders_lookup_idx ON seller_orders(order_id,seller_id,service_provider_id,status)",
      "unique": false,
      "columns": [
        "order_id",
        "seller_id",
        "service_provider_id",
        "status"
      ],
      "where": null
    },
    "seller_orders_order_id_idx": {
      "name": "seller_orders_order_id_idx",
      "tableName": "seller_orders",
      "sql": "CREATE INDEX seller_orders_order_id_idx ON seller_orders(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "seller_orders_seller_id_idx": {
      "name": "seller_orders_seller_id_idx",
      "tableName": "seller_orders",
      "sql": "CREATE INDEX seller_orders_seller_id_idx ON seller_orders(seller_id)",
      "unique": false,
      "columns": [
        "seller_id"
      ],
      "where": null
    },
    "seller_orders_service_provider_id_idx": {
      "name": "seller_orders_service_provider_id_idx",
      "tableName": "seller_orders",
      "sql": "CREATE INDEX seller_orders_service_provider_id_idx ON seller_orders(service_provider_id)",
      "unique": false,
      "columns": [
        "service_provider_id"
      ],
      "where": null
    },
    "seller_orders_status_idx": {
      "name": "seller_orders_status_idx",
      "tableName": "seller_orders",
      "sql": "CREATE INDEX seller_orders_status_idx ON seller_orders(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {
    "orders_status_insert_guard": {
      "name": "orders_status_insert_guard",
      "sql": "CREATE TRIGGER orders_status_insert_guard BEFORE INSERT ON orders WHEN NEW.calculated_status NOT IN ('new','waiting_for_seller_response','waiting_for_pricing','processing','partially_fulfilled','fully_fulfilled','partially_cancelled','fully_cancelled','waiting_for_return','waiting_for_replacement','closed','archived') BEGIN SELECT RAISE(ABORT,'invalid order status'); END"
    },
    "orders_status_update_guard": {
      "name": "orders_status_update_guard",
      "sql": "CREATE TRIGGER orders_status_update_guard BEFORE UPDATE OF calculated_status ON orders WHEN NEW.calculated_status NOT IN ('new','waiting_for_seller_response','waiting_for_pricing','processing','partially_fulfilled','fully_fulfilled','partially_cancelled','fully_cancelled','waiting_for_return','waiting_for_replacement','closed','archived') BEGIN SELECT RAISE(ABORT,'invalid order status'); END"
    },
    "orders_money_insert_guard": {
      "name": "orders_money_insert_guard",
      "sql": "CREATE TRIGGER orders_money_insert_guard BEFORE INSERT ON orders WHEN typeof(NEW.subtotal_price)<>'integer' OR typeof(NEW.items_discount_total)<>'integer' OR typeof(NEW.order_discount_total)<>'integer' OR typeof(NEW.shipping_total)<>'integer' OR typeof(NEW.shipping_discount_total)<>'integer' OR typeof(NEW.tax_total)<>'integer' OR typeof(NEW.service_fee_total)<>'integer' OR typeof(NEW.platform_fee_total)<>'integer' OR typeof(NEW.grand_total)<>'integer' OR typeof(NEW.paid_total)<>'integer' OR typeof(NEW.refunded_total)<>'integer' OR typeof(NEW.remaining_total)<>'integer' BEGIN SELECT RAISE(ABORT,'order money must use integer minor units'); END"
    },
    "orders_money_update_guard": {
      "name": "orders_money_update_guard",
      "sql": "CREATE TRIGGER orders_money_update_guard BEFORE UPDATE ON orders WHEN typeof(NEW.subtotal_price)<>'integer' OR typeof(NEW.items_discount_total)<>'integer' OR typeof(NEW.order_discount_total)<>'integer' OR typeof(NEW.shipping_total)<>'integer' OR typeof(NEW.shipping_discount_total)<>'integer' OR typeof(NEW.tax_total)<>'integer' OR typeof(NEW.service_fee_total)<>'integer' OR typeof(NEW.platform_fee_total)<>'integer' OR typeof(NEW.grand_total)<>'integer' OR typeof(NEW.paid_total)<>'integer' OR typeof(NEW.refunded_total)<>'integer' OR typeof(NEW.remaining_total)<>'integer' BEGIN SELECT RAISE(ABORT,'order money must use integer minor units'); END"
    },
    "seller_orders_status_guard": {
      "name": "seller_orders_status_guard",
      "sql": "CREATE TRIGGER seller_orders_status_guard BEFORE INSERT ON seller_orders WHEN NEW.status NOT IN ('waiting_for_response','waiting_for_pricing','price_offer_sent','buyer_accepted_price','buyer_rejected_price','fully_accepted','partially_accepted','fully_rejected','preparing','ready_for_shipping','handed_to_shipping','partially_fulfilled','fully_fulfilled','cancelled','closed') BEGIN SELECT RAISE(ABORT,'invalid seller order status'); END"
    },
    "seller_orders_status_update_guard": {
      "name": "seller_orders_status_update_guard",
      "sql": "CREATE TRIGGER seller_orders_status_update_guard BEFORE UPDATE OF status ON seller_orders WHEN NEW.status NOT IN ('waiting_for_response','waiting_for_pricing','price_offer_sent','buyer_accepted_price','buyer_rejected_price','fully_accepted','partially_accepted','fully_rejected','preparing','ready_for_shipping','handed_to_shipping','partially_fulfilled','fully_fulfilled','cancelled','closed') BEGIN SELECT RAISE(ABORT,'invalid seller order status'); END"
    },
    "seller_money_guard": {
      "name": "seller_money_guard",
      "sql": "CREATE TRIGGER seller_money_guard BEFORE INSERT ON seller_orders WHEN typeof(NEW.seller_subtotal)<>'integer' OR typeof(NEW.seller_discount_total)<>'integer' OR typeof(NEW.seller_shipping_total)<>'integer' OR typeof(NEW.seller_tax_total)<>'integer' OR typeof(NEW.seller_commission_total)<>'integer' OR typeof(NEW.seller_grand_total)<>'integer' OR typeof(NEW.seller_payout_total)<>'integer' BEGIN SELECT RAISE(ABORT,'seller money must use integer minor units'); END"
    },
    "seller_money_update_guard": {
      "name": "seller_money_update_guard",
      "sql": "CREATE TRIGGER seller_money_update_guard BEFORE UPDATE ON seller_orders WHEN typeof(NEW.seller_subtotal)<>'integer' OR typeof(NEW.seller_discount_total)<>'integer' OR typeof(NEW.seller_shipping_total)<>'integer' OR typeof(NEW.seller_tax_total)<>'integer' OR typeof(NEW.seller_commission_total)<>'integer' OR typeof(NEW.seller_grand_total)<>'integer' OR typeof(NEW.seller_payout_total)<>'integer' BEGIN SELECT RAISE(ABORT,'seller money must use integer minor units'); END"
    }
  }
};
