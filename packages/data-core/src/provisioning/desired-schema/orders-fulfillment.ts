/**
 * Desired schema for the `orders-fulfillment` Turso database.
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

export const ordersFulfillmentDesiredSchema: DatabaseSchema = {
  "source": "orders-fulfillment",
  "tables": {
    "shipments": {
      "name": "shipments",
      "createSql": "CREATE TABLE shipments (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'outbound' CHECK(direction IN ('outbound','return','replacement')), carrier_id TEXT, carrier_company_name TEXT, tracking_number TEXT, shipping_method TEXT NOT NULL, pickup_address_snapshot_json TEXT NOT NULL, delivery_address_snapshot_json TEXT NOT NULL, expected_delivery_at TEXT, contains_special_vehicle_items INTEGER NOT NULL DEFAULT 0, required_vehicle_type TEXT, total_weight INTEGER CHECK(total_weight IS NULL OR total_weight>=0), dimensions_json TEXT, requires_refrigeration INTEGER NOT NULL DEFAULT 0, requires_special_loading INTEGER NOT NULL DEFAULT 0, carrier_notes TEXT, base_shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(base_shipping_price>=0), extra_handling_fee INTEGER NOT NULL DEFAULT 0 CHECK(extra_handling_fee>=0), special_vehicle_fee INTEGER NOT NULL DEFAULT 0 CHECK(special_vehicle_fee>=0), insurance_fee INTEGER NOT NULL DEFAULT 0 CHECK(insurance_fee>=0), shipping_discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(shipping_discount_amount>=0), tax_amount INTEGER NOT NULL DEFAULT 0 CHECK(tax_amount>=0), final_shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(final_shipping_price>=0), status TEXT NOT NULL DEFAULT 'waiting_for_carrier_pickup', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT)",
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
          "name": "direction",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'outbound'",
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
          "name": "carrier_company_name",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "tracking_number",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_method",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "pickup_address_snapshot_json",
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
          "name": "expected_delivery_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "contains_special_vehicle_items",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "required_vehicle_type",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "total_weight",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "dimensions_json",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "requires_refrigeration",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "requires_special_loading",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "carrier_notes",
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
          "name": "extra_handling_fee",
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
          "name": "insurance_fee",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_discount_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "tax_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "final_shipping_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'waiting_for_carrier_pickup'",
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
        "checks": [
          "base_shipping_price>=0",
          "direction IN ('outbound','return','replacement')",
          "extra_handling_fee>=0",
          "final_shipping_price>=0",
          "insurance_fee>=0",
          "shipping_discount_amount>=0",
          "special_vehicle_fee>=0",
          "tax_amount>=0",
          "total_weight IS NULL OR total_weight>=0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "shipment_items": {
      "name": "shipment_items",
      "createSql": "CREATE TABLE shipment_items (id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, order_id TEXT NOT NULL, seller_order_id TEXT NOT NULL, seller_id TEXT, service_provider_id TEXT, item_type TEXT NOT NULL CHECK(item_type IN ('order_item','custom_request_item')), order_item_id TEXT, custom_request_item_id TEXT, quantity INTEGER NOT NULL CHECK(quantity>0), status TEXT NOT NULL DEFAULT 'assigned', carrier_received_at TEXT, delivered_at TEXT, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK((item_type='order_item' AND order_item_id IS NOT NULL AND custom_request_item_id IS NULL) OR (item_type='custom_request_item' AND custom_request_item_id IS NOT NULL AND order_item_id IS NULL)))",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "shipment_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
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
          "notNull": false,
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
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'assigned'",
          "primaryKeyPosition": 0
        },
        {
          "name": "carrier_received_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "delivered_at",
          "type": "TEXT",
          "notNull": false,
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
    }
  },
  "indexes": {
    "shipments_lookup_idx": {
      "name": "shipments_lookup_idx",
      "tableName": "shipments",
      "sql": "CREATE INDEX shipments_lookup_idx ON shipments(order_id,carrier_id,status,tracking_number,created_at)",
      "unique": false,
      "columns": [
        "order_id",
        "carrier_id",
        "status",
        "tracking_number",
        "created_at"
      ],
      "where": null
    },
    "shipments_order_id_idx": {
      "name": "shipments_order_id_idx",
      "tableName": "shipments",
      "sql": "CREATE INDEX shipments_order_id_idx ON shipments(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "shipments_carrier_id_idx": {
      "name": "shipments_carrier_id_idx",
      "tableName": "shipments",
      "sql": "CREATE INDEX shipments_carrier_id_idx ON shipments(carrier_id)",
      "unique": false,
      "columns": [
        "carrier_id"
      ],
      "where": null
    },
    "shipments_status_idx": {
      "name": "shipments_status_idx",
      "tableName": "shipments",
      "sql": "CREATE INDEX shipments_status_idx ON shipments(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "shipments_tracking_number_idx": {
      "name": "shipments_tracking_number_idx",
      "tableName": "shipments",
      "sql": "CREATE INDEX shipments_tracking_number_idx ON shipments(tracking_number)",
      "unique": false,
      "columns": [
        "tracking_number"
      ],
      "where": null
    },
    "shipments_created_at_idx": {
      "name": "shipments_created_at_idx",
      "tableName": "shipments",
      "sql": "CREATE INDEX shipments_created_at_idx ON shipments(created_at)",
      "unique": false,
      "columns": [
        "created_at"
      ],
      "where": null
    },
    "shipment_items_active_order_item_uq": {
      "name": "shipment_items_active_order_item_uq",
      "tableName": "shipment_items",
      "sql": "CREATE UNIQUE INDEX shipment_items_active_order_item_uq ON shipment_items(order_item_id) WHERE order_item_id IS NOT NULL AND status NOT IN ('rejected_by_carrier','delivered','delivery_rejected','delivery_failed','returned','closed')",
      "unique": true,
      "columns": [
        "order_item_id"
      ],
      "where": "order_item_id IS NOT NULL AND status NOT IN ('rejected_by_carrier','delivered','delivery_rejected','delivery_failed','returned','closed')"
    },
    "shipment_items_active_custom_item_uq": {
      "name": "shipment_items_active_custom_item_uq",
      "tableName": "shipment_items",
      "sql": "CREATE UNIQUE INDEX shipment_items_active_custom_item_uq ON shipment_items(custom_request_item_id) WHERE custom_request_item_id IS NOT NULL AND status NOT IN ('rejected_by_carrier','delivered','delivery_rejected','delivery_failed','returned','closed')",
      "unique": true,
      "columns": [
        "custom_request_item_id"
      ],
      "where": "custom_request_item_id IS NOT NULL AND status NOT IN ('rejected_by_carrier','delivered','delivery_rejected','delivery_failed','returned','closed')"
    },
    "shipment_items_lookup_idx": {
      "name": "shipment_items_lookup_idx",
      "tableName": "shipment_items",
      "sql": "CREATE INDEX shipment_items_lookup_idx ON shipment_items(shipment_id,order_id,seller_order_id,item_type,status)",
      "unique": false,
      "columns": [
        "shipment_id",
        "order_id",
        "seller_order_id",
        "item_type",
        "status"
      ],
      "where": null
    },
    "shipment_items_shipment_id_idx": {
      "name": "shipment_items_shipment_id_idx",
      "tableName": "shipment_items",
      "sql": "CREATE INDEX shipment_items_shipment_id_idx ON shipment_items(shipment_id)",
      "unique": false,
      "columns": [
        "shipment_id"
      ],
      "where": null
    },
    "shipment_items_order_id_idx": {
      "name": "shipment_items_order_id_idx",
      "tableName": "shipment_items",
      "sql": "CREATE INDEX shipment_items_order_id_idx ON shipment_items(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "shipment_items_seller_order_id_idx": {
      "name": "shipment_items_seller_order_id_idx",
      "tableName": "shipment_items",
      "sql": "CREATE INDEX shipment_items_seller_order_id_idx ON shipment_items(seller_order_id)",
      "unique": false,
      "columns": [
        "seller_order_id"
      ],
      "where": null
    },
    "shipment_items_order_item_id_idx": {
      "name": "shipment_items_order_item_id_idx",
      "tableName": "shipment_items",
      "sql": "CREATE INDEX shipment_items_order_item_id_idx ON shipment_items(order_item_id)",
      "unique": false,
      "columns": [
        "order_item_id"
      ],
      "where": null
    },
    "shipment_items_custom_item_id_idx": {
      "name": "shipment_items_custom_item_id_idx",
      "tableName": "shipment_items",
      "sql": "CREATE INDEX shipment_items_custom_item_id_idx ON shipment_items(custom_request_item_id)",
      "unique": false,
      "columns": [
        "custom_request_item_id"
      ],
      "where": null
    },
    "shipment_items_item_type_idx": {
      "name": "shipment_items_item_type_idx",
      "tableName": "shipment_items",
      "sql": "CREATE INDEX shipment_items_item_type_idx ON shipment_items(item_type)",
      "unique": false,
      "columns": [
        "item_type"
      ],
      "where": null
    },
    "shipment_items_status_idx": {
      "name": "shipment_items_status_idx",
      "tableName": "shipment_items",
      "sql": "CREATE INDEX shipment_items_status_idx ON shipment_items(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {
    "shipments_status_guard": {
      "name": "shipments_status_guard",
      "sql": "CREATE TRIGGER shipments_status_guard BEFORE INSERT ON shipments WHEN NEW.status NOT IN ('waiting_for_carrier_pickup','partially_received_by_carrier','partially_rejected_by_carrier','fully_received_by_carrier','in_transit','arrived_at_distribution_center','out_for_delivery','partially_delivered','fully_delivered','customer_rejected_delivery','delivery_failed','returned','closed') BEGIN SELECT RAISE(ABORT,'invalid shipment status'); END"
    },
    "shipments_status_update_guard": {
      "name": "shipments_status_update_guard",
      "sql": "CREATE TRIGGER shipments_status_update_guard BEFORE UPDATE OF status ON shipments WHEN NEW.status NOT IN ('waiting_for_carrier_pickup','partially_received_by_carrier','partially_rejected_by_carrier','fully_received_by_carrier','in_transit','arrived_at_distribution_center','out_for_delivery','partially_delivered','fully_delivered','customer_rejected_delivery','delivery_failed','returned','closed') BEGIN SELECT RAISE(ABORT,'invalid shipment status'); END"
    },
    "shipment_money_guard": {
      "name": "shipment_money_guard",
      "sql": "CREATE TRIGGER shipment_money_guard BEFORE INSERT ON shipments WHEN typeof(NEW.base_shipping_price)<>'integer' OR typeof(NEW.extra_handling_fee)<>'integer' OR typeof(NEW.special_vehicle_fee)<>'integer' OR typeof(NEW.insurance_fee)<>'integer' OR typeof(NEW.shipping_discount_amount)<>'integer' OR typeof(NEW.tax_amount)<>'integer' OR typeof(NEW.final_shipping_price)<>'integer' BEGIN SELECT RAISE(ABORT,'shipment money must use integer minor units'); END"
    },
    "shipment_money_update_guard": {
      "name": "shipment_money_update_guard",
      "sql": "CREATE TRIGGER shipment_money_update_guard BEFORE UPDATE ON shipments WHEN typeof(NEW.base_shipping_price)<>'integer' OR typeof(NEW.extra_handling_fee)<>'integer' OR typeof(NEW.special_vehicle_fee)<>'integer' OR typeof(NEW.insurance_fee)<>'integer' OR typeof(NEW.shipping_discount_amount)<>'integer' OR typeof(NEW.tax_amount)<>'integer' OR typeof(NEW.final_shipping_price)<>'integer' BEGIN SELECT RAISE(ABORT,'shipment money must use integer minor units'); END"
    },
    "shipment_items_status_guard": {
      "name": "shipment_items_status_guard",
      "sql": "CREATE TRIGGER shipment_items_status_guard BEFORE INSERT ON shipment_items WHEN NEW.status NOT IN ('assigned','received_by_carrier','rejected_by_carrier','in_transit','at_distribution_center','out_for_delivery','delivered','delivery_rejected','delivery_failed','returned','closed') BEGIN SELECT RAISE(ABORT,'invalid shipment item status'); END"
    },
    "shipment_items_status_update_guard": {
      "name": "shipment_items_status_update_guard",
      "sql": "CREATE TRIGGER shipment_items_status_update_guard BEFORE UPDATE OF status ON shipment_items WHEN NEW.status NOT IN ('assigned','received_by_carrier','rejected_by_carrier','in_transit','at_distribution_center','out_for_delivery','delivered','delivery_rejected','delivery_failed','returned','closed') BEGIN SELECT RAISE(ABORT,'invalid shipment item status'); END"
    }
  }
};
