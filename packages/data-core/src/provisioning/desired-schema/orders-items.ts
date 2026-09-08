/**
 * Desired schema for the `orders-items` Turso database.
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

export const ordersItemsDesiredSchema: DatabaseSchema = {
  "source": "orders-items",
  "tables": {
    "order_items": {
      "name": "order_items",
      "createSql": "CREATE TABLE order_items (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_order_id TEXT NOT NULL, seller_id TEXT NOT NULL, product_id TEXT NOT NULL, variant_id TEXT, product_name_snapshot TEXT NOT NULL, product_description_snapshot TEXT NOT NULL DEFAULT '', product_image_snapshot TEXT, quantity INTEGER NOT NULL CHECK(quantity>0), requires_special_vehicle INTEGER NOT NULL DEFAULT 0, required_vehicle_type TEXT, weight INTEGER CHECK(weight IS NULL OR weight>=0), dimensions_json TEXT, fragile INTEGER NOT NULL DEFAULT 0, requires_refrigeration INTEGER NOT NULL DEFAULT 0, requires_special_loading INTEGER NOT NULL DEFAULT 0, shipping_notes TEXT, unit_price INTEGER NOT NULL CHECK(unit_price>=0), subtotal_price INTEGER NOT NULL DEFAULT 0 CHECK(subtotal_price>=0), item_discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(item_discount_amount>=0), coupon_discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(coupon_discount_amount>=0), shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(shipping_price>=0), shipping_discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(shipping_discount_amount>=0), tax_amount INTEGER NOT NULL DEFAULT 0 CHECK(tax_amount>=0), service_fee_amount INTEGER NOT NULL DEFAULT 0 CHECK(service_fee_amount>=0), commission_amount INTEGER NOT NULL DEFAULT 0 CHECK(commission_amount>=0), total_price INTEGER NOT NULL DEFAULT 0 CHECK(total_price>=0), paid_amount INTEGER NOT NULL DEFAULT 0 CHECK(paid_amount>=0), refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK(refunded_amount>=0), remaining_amount INTEGER NOT NULL DEFAULT 0 CHECK(remaining_amount>=0), status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT)",
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
          "name": "product_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "variant_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "product_name_snapshot",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "product_description_snapshot",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "product_image_snapshot",
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
          "name": "requires_special_vehicle",
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
          "name": "weight",
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
          "name": "fragile",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
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
          "name": "shipping_notes",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "unit_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
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
          "name": "item_discount_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "coupon_discount_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_price",
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
          "name": "service_fee_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "commission_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "total_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "paid_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "refunded_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "remaining_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'new'",
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
          "commission_amount>=0",
          "coupon_discount_amount>=0",
          "item_discount_amount>=0",
          "paid_amount>=0",
          "quantity>0",
          "refunded_amount>=0",
          "remaining_amount>=0",
          "service_fee_amount>=0",
          "shipping_discount_amount>=0",
          "shipping_price>=0",
          "subtotal_price>=0",
          "tax_amount>=0",
          "total_price>=0",
          "unit_price>=0",
          "weight IS NULL OR weight>=0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "custom_request_items": {
      "name": "custom_request_items",
      "createSql": "CREATE TABLE custom_request_items (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_order_id TEXT NOT NULL, seller_id TEXT, service_provider_id TEXT, title TEXT NOT NULL, buyer_description TEXT NOT NULL, buyer_notes TEXT, requested_quantity INTEGER CHECK(requested_quantity IS NULL OR requested_quantity>0), request_type TEXT NOT NULL CHECK(request_type IN ('pharmacy','supermarket','service','custom_purchase','other')), requires_seller_review_before_pricing INTEGER NOT NULL DEFAULT 1, seller_accepted INTEGER, seller_notes TEXT, seller_provided_description TEXT, available_quantity INTEGER CHECK(available_quantity IS NULL OR available_quantity>=0), suggested_alternatives_json TEXT, requires_buyer_price_approval INTEGER NOT NULL DEFAULT 1, price_offer_expires_at TEXT, requires_special_vehicle INTEGER NOT NULL DEFAULT 0, required_vehicle_type TEXT, estimated_weight INTEGER CHECK(estimated_weight IS NULL OR estimated_weight>=0), estimated_dimensions_json TEXT, fragile INTEGER NOT NULL DEFAULT 0, requires_refrigeration INTEGER NOT NULL DEFAULT 0, requires_special_loading INTEGER NOT NULL DEFAULT 0, shipping_notes TEXT, estimated_price INTEGER CHECK(estimated_price IS NULL OR estimated_price>=0), final_unit_price INTEGER CHECK(final_unit_price IS NULL OR final_unit_price>=0), quantity INTEGER CHECK(quantity IS NULL OR quantity>0), subtotal_price INTEGER NOT NULL DEFAULT 0 CHECK(subtotal_price>=0), discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(discount_amount>=0), shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(shipping_price>=0), shipping_discount_amount INTEGER NOT NULL DEFAULT 0 CHECK(shipping_discount_amount>=0), special_vehicle_fee INTEGER NOT NULL DEFAULT 0 CHECK(special_vehicle_fee>=0), handling_fee INTEGER NOT NULL DEFAULT 0 CHECK(handling_fee>=0), tax_amount INTEGER NOT NULL DEFAULT 0 CHECK(tax_amount>=0), service_fee_amount INTEGER NOT NULL DEFAULT 0 CHECK(service_fee_amount>=0), commission_amount INTEGER NOT NULL DEFAULT 0 CHECK(commission_amount>=0), total_price INTEGER NOT NULL DEFAULT 0 CHECK(total_price>=0), paid_amount INTEGER NOT NULL DEFAULT 0 CHECK(paid_amount>=0), refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK(refunded_amount>=0), remaining_amount INTEGER NOT NULL DEFAULT 0 CHECK(remaining_amount>=0), status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, closed_at TEXT)",
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
          "name": "title",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "buyer_description",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "buyer_notes",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "requested_quantity",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "request_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "requires_seller_review_before_pricing",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_accepted",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_notes",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_provided_description",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "available_quantity",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "suggested_alternatives_json",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "requires_buyer_price_approval",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "price_offer_expires_at",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "requires_special_vehicle",
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
          "name": "estimated_weight",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "estimated_dimensions_json",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "fragile",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
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
          "name": "shipping_notes",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "estimated_price",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "final_unit_price",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "quantity",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
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
          "name": "discount_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "shipping_price",
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
          "name": "special_vehicle_fee",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "handling_fee",
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
          "name": "service_fee_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "commission_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "total_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "paid_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "refunded_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "remaining_amount",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'new'",
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
          "available_quantity IS NULL OR available_quantity>=0",
          "commission_amount>=0",
          "discount_amount>=0",
          "estimated_price IS NULL OR estimated_price>=0",
          "estimated_weight IS NULL OR estimated_weight>=0",
          "final_unit_price IS NULL OR final_unit_price>=0",
          "handling_fee>=0",
          "paid_amount>=0",
          "quantity IS NULL OR quantity>0",
          "refunded_amount>=0",
          "remaining_amount>=0",
          "request_type IN ('pharmacy','supermarket','service','custom_purchase','other')",
          "requested_quantity IS NULL OR requested_quantity>0",
          "service_fee_amount>=0",
          "shipping_discount_amount>=0",
          "shipping_price>=0",
          "special_vehicle_fee>=0",
          "subtotal_price>=0",
          "tax_amount>=0",
          "total_price>=0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "custom_request_images": {
      "name": "custom_request_images",
      "createSql": "CREATE TABLE custom_request_images (id TEXT PRIMARY KEY, custom_request_item_id TEXT NOT NULL, order_id TEXT NOT NULL, uploaded_by TEXT NOT NULL, storage_profile_id TEXT NOT NULL DEFAULT 'spicialOrder' CHECK(storage_profile_id='spicialOrder'), image_url TEXT NOT NULL, image_key TEXT NOT NULL, file_name TEXT, file_size INTEGER NOT NULL CHECK(file_size>0 AND file_size<=512000), mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp','image/heic','image/heif')), width INTEGER CHECK(width IS NULL OR width>0), height INTEGER CHECK(height IS NULL OR height>0), image_description TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "custom_request_item_id",
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
          "name": "uploaded_by",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "storage_profile_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'spicialOrder'",
          "primaryKeyPosition": 0
        },
        {
          "name": "image_url",
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
          "name": "file_name",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "file_size",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "mime_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "width",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "height",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "image_description",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
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
        "checks": [
          "file_size>0 AND file_size<=512000",
          "height IS NULL OR height>0",
          "mime_type IN ('image/jpeg','image/png','image/webp','image/heic','image/heif')",
          "storage_profile_id='spicialOrder'",
          "width IS NULL OR width>0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    }
  },
  "indexes": {
    "order_items_lookup_idx": {
      "name": "order_items_lookup_idx",
      "tableName": "order_items",
      "sql": "CREATE INDEX order_items_lookup_idx ON order_items(order_id,seller_order_id,seller_id,product_id,status,created_at)",
      "unique": false,
      "columns": [
        "order_id",
        "seller_order_id",
        "seller_id",
        "product_id",
        "status",
        "created_at"
      ],
      "where": null
    },
    "order_items_order_id_idx": {
      "name": "order_items_order_id_idx",
      "tableName": "order_items",
      "sql": "CREATE INDEX order_items_order_id_idx ON order_items(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "order_items_seller_order_id_idx": {
      "name": "order_items_seller_order_id_idx",
      "tableName": "order_items",
      "sql": "CREATE INDEX order_items_seller_order_id_idx ON order_items(seller_order_id)",
      "unique": false,
      "columns": [
        "seller_order_id"
      ],
      "where": null
    },
    "order_items_seller_id_idx": {
      "name": "order_items_seller_id_idx",
      "tableName": "order_items",
      "sql": "CREATE INDEX order_items_seller_id_idx ON order_items(seller_id)",
      "unique": false,
      "columns": [
        "seller_id"
      ],
      "where": null
    },
    "order_items_product_id_idx": {
      "name": "order_items_product_id_idx",
      "tableName": "order_items",
      "sql": "CREATE INDEX order_items_product_id_idx ON order_items(product_id)",
      "unique": false,
      "columns": [
        "product_id"
      ],
      "where": null
    },
    "order_items_status_idx": {
      "name": "order_items_status_idx",
      "tableName": "order_items",
      "sql": "CREATE INDEX order_items_status_idx ON order_items(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "order_items_created_at_idx": {
      "name": "order_items_created_at_idx",
      "tableName": "order_items",
      "sql": "CREATE INDEX order_items_created_at_idx ON order_items(created_at)",
      "unique": false,
      "columns": [
        "created_at"
      ],
      "where": null
    },
    "custom_items_lookup_idx": {
      "name": "custom_items_lookup_idx",
      "tableName": "custom_request_items",
      "sql": "CREATE INDEX custom_items_lookup_idx ON custom_request_items(order_id,seller_order_id,seller_id,service_provider_id,request_type,status,created_at)",
      "unique": false,
      "columns": [
        "order_id",
        "seller_order_id",
        "seller_id",
        "service_provider_id",
        "request_type",
        "status",
        "created_at"
      ],
      "where": null
    },
    "custom_request_items_order_id_idx": {
      "name": "custom_request_items_order_id_idx",
      "tableName": "custom_request_items",
      "sql": "CREATE INDEX custom_request_items_order_id_idx ON custom_request_items(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "custom_request_items_seller_order_id_idx": {
      "name": "custom_request_items_seller_order_id_idx",
      "tableName": "custom_request_items",
      "sql": "CREATE INDEX custom_request_items_seller_order_id_idx ON custom_request_items(seller_order_id)",
      "unique": false,
      "columns": [
        "seller_order_id"
      ],
      "where": null
    },
    "custom_request_items_seller_id_idx": {
      "name": "custom_request_items_seller_id_idx",
      "tableName": "custom_request_items",
      "sql": "CREATE INDEX custom_request_items_seller_id_idx ON custom_request_items(seller_id)",
      "unique": false,
      "columns": [
        "seller_id"
      ],
      "where": null
    },
    "custom_request_items_service_provider_id_idx": {
      "name": "custom_request_items_service_provider_id_idx",
      "tableName": "custom_request_items",
      "sql": "CREATE INDEX custom_request_items_service_provider_id_idx ON custom_request_items(service_provider_id)",
      "unique": false,
      "columns": [
        "service_provider_id"
      ],
      "where": null
    },
    "custom_request_items_request_type_idx": {
      "name": "custom_request_items_request_type_idx",
      "tableName": "custom_request_items",
      "sql": "CREATE INDEX custom_request_items_request_type_idx ON custom_request_items(request_type)",
      "unique": false,
      "columns": [
        "request_type"
      ],
      "where": null
    },
    "custom_request_items_status_idx": {
      "name": "custom_request_items_status_idx",
      "tableName": "custom_request_items",
      "sql": "CREATE INDEX custom_request_items_status_idx ON custom_request_items(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "custom_request_items_created_at_idx": {
      "name": "custom_request_items_created_at_idx",
      "tableName": "custom_request_items",
      "sql": "CREATE INDEX custom_request_items_created_at_idx ON custom_request_items(created_at)",
      "unique": false,
      "columns": [
        "created_at"
      ],
      "where": null
    },
    "custom_images_lookup_idx": {
      "name": "custom_images_lookup_idx",
      "tableName": "custom_request_images",
      "sql": "CREATE INDEX custom_images_lookup_idx ON custom_request_images(custom_request_item_id,order_id)",
      "unique": false,
      "columns": [
        "custom_request_item_id",
        "order_id"
      ],
      "where": null
    },
    "custom_request_images_item_idx": {
      "name": "custom_request_images_item_idx",
      "tableName": "custom_request_images",
      "sql": "CREATE INDEX custom_request_images_item_idx ON custom_request_images(custom_request_item_id)",
      "unique": false,
      "columns": [
        "custom_request_item_id"
      ],
      "where": null
    },
    "custom_request_images_order_idx": {
      "name": "custom_request_images_order_idx",
      "tableName": "custom_request_images",
      "sql": "CREATE INDEX custom_request_images_order_idx ON custom_request_images(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {
    "order_items_status_guard": {
      "name": "order_items_status_guard",
      "sql": "CREATE TRIGGER order_items_status_guard BEFORE INSERT ON order_items WHEN NEW.status NOT IN ('new','seller_accepted','seller_rejected','buyer_cancelled','admin_cancelled','preparing','ready_for_shipping','assigned_to_shipment','in_transit','delivered','delivery_rejected','return_requested','replacement_requested','returned','refunded','replaced','closed') BEGIN SELECT RAISE(ABORT,'invalid order item status'); END"
    },
    "order_items_status_update_guard": {
      "name": "order_items_status_update_guard",
      "sql": "CREATE TRIGGER order_items_status_update_guard BEFORE UPDATE OF status ON order_items WHEN NEW.status NOT IN ('new','seller_accepted','seller_rejected','buyer_cancelled','admin_cancelled','preparing','ready_for_shipping','assigned_to_shipment','in_transit','delivered','delivery_rejected','return_requested','replacement_requested','returned','refunded','replaced','closed') BEGIN SELECT RAISE(ABORT,'invalid order item status'); END"
    },
    "order_item_money_guard": {
      "name": "order_item_money_guard",
      "sql": "CREATE TRIGGER order_item_money_guard BEFORE INSERT ON order_items WHEN typeof(NEW.unit_price)<>'integer' OR typeof(NEW.subtotal_price)<>'integer' OR typeof(NEW.item_discount_amount)<>'integer' OR typeof(NEW.coupon_discount_amount)<>'integer' OR typeof(NEW.shipping_price)<>'integer' OR typeof(NEW.shipping_discount_amount)<>'integer' OR typeof(NEW.tax_amount)<>'integer' OR typeof(NEW.service_fee_amount)<>'integer' OR typeof(NEW.commission_amount)<>'integer' OR typeof(NEW.total_price)<>'integer' OR typeof(NEW.paid_amount)<>'integer' OR typeof(NEW.refunded_amount)<>'integer' OR typeof(NEW.remaining_amount)<>'integer' BEGIN SELECT RAISE(ABORT,'item money must use integer minor units'); END"
    },
    "order_item_money_update_guard": {
      "name": "order_item_money_update_guard",
      "sql": "CREATE TRIGGER order_item_money_update_guard BEFORE UPDATE ON order_items WHEN typeof(NEW.unit_price)<>'integer' OR typeof(NEW.subtotal_price)<>'integer' OR typeof(NEW.item_discount_amount)<>'integer' OR typeof(NEW.coupon_discount_amount)<>'integer' OR typeof(NEW.shipping_price)<>'integer' OR typeof(NEW.shipping_discount_amount)<>'integer' OR typeof(NEW.tax_amount)<>'integer' OR typeof(NEW.service_fee_amount)<>'integer' OR typeof(NEW.commission_amount)<>'integer' OR typeof(NEW.total_price)<>'integer' OR typeof(NEW.paid_amount)<>'integer' OR typeof(NEW.refunded_amount)<>'integer' OR typeof(NEW.remaining_amount)<>'integer' BEGIN SELECT RAISE(ABORT,'item money must use integer minor units'); END"
    },
    "custom_items_status_guard": {
      "name": "custom_items_status_guard",
      "sql": "CREATE TRIGGER custom_items_status_guard BEFORE INSERT ON custom_request_items WHEN NEW.status NOT IN ('new','waiting_for_seller_response','waiting_for_pricing','price_offer_sent','buyer_accepted_price','buyer_rejected_price','seller_accepted','seller_rejected','buyer_cancelled','admin_cancelled','preparing','ready_for_shipping','assigned_to_shipment','in_transit','delivered','delivery_rejected','return_requested','replacement_requested','returned','refunded','replaced','closed') BEGIN SELECT RAISE(ABORT,'invalid custom item status'); END"
    },
    "custom_items_status_update_guard": {
      "name": "custom_items_status_update_guard",
      "sql": "CREATE TRIGGER custom_items_status_update_guard BEFORE UPDATE OF status ON custom_request_items WHEN NEW.status NOT IN ('new','waiting_for_seller_response','waiting_for_pricing','price_offer_sent','buyer_accepted_price','buyer_rejected_price','seller_accepted','seller_rejected','buyer_cancelled','admin_cancelled','preparing','ready_for_shipping','assigned_to_shipment','in_transit','delivered','delivery_rejected','return_requested','replacement_requested','returned','refunded','replaced','closed') BEGIN SELECT RAISE(ABORT,'invalid custom item status'); END"
    },
    "custom_item_money_guard": {
      "name": "custom_item_money_guard",
      "sql": "CREATE TRIGGER custom_item_money_guard BEFORE INSERT ON custom_request_items WHEN (NEW.estimated_price IS NOT NULL AND typeof(NEW.estimated_price)<>'integer') OR (NEW.final_unit_price IS NOT NULL AND typeof(NEW.final_unit_price)<>'integer') OR typeof(NEW.subtotal_price)<>'integer' OR typeof(NEW.discount_amount)<>'integer' OR typeof(NEW.shipping_price)<>'integer' OR typeof(NEW.shipping_discount_amount)<>'integer' OR typeof(NEW.special_vehicle_fee)<>'integer' OR typeof(NEW.handling_fee)<>'integer' OR typeof(NEW.tax_amount)<>'integer' OR typeof(NEW.service_fee_amount)<>'integer' OR typeof(NEW.commission_amount)<>'integer' OR typeof(NEW.total_price)<>'integer' OR typeof(NEW.paid_amount)<>'integer' OR typeof(NEW.refunded_amount)<>'integer' OR typeof(NEW.remaining_amount)<>'integer' BEGIN SELECT RAISE(ABORT,'custom item money must use integer minor units'); END"
    },
    "custom_item_money_update_guard": {
      "name": "custom_item_money_update_guard",
      "sql": "CREATE TRIGGER custom_item_money_update_guard BEFORE UPDATE ON custom_request_items WHEN (NEW.estimated_price IS NOT NULL AND typeof(NEW.estimated_price)<>'integer') OR (NEW.final_unit_price IS NOT NULL AND typeof(NEW.final_unit_price)<>'integer') OR typeof(NEW.subtotal_price)<>'integer' OR typeof(NEW.discount_amount)<>'integer' OR typeof(NEW.shipping_price)<>'integer' OR typeof(NEW.shipping_discount_amount)<>'integer' OR typeof(NEW.special_vehicle_fee)<>'integer' OR typeof(NEW.handling_fee)<>'integer' OR typeof(NEW.tax_amount)<>'integer' OR typeof(NEW.service_fee_amount)<>'integer' OR typeof(NEW.commission_amount)<>'integer' OR typeof(NEW.total_price)<>'integer' OR typeof(NEW.paid_amount)<>'integer' OR typeof(NEW.refunded_amount)<>'integer' OR typeof(NEW.remaining_amount)<>'integer' BEGIN SELECT RAISE(ABORT,'custom item money must use integer minor units'); END"
    },
    "custom_request_requires_image_guard": {
      "name": "custom_request_requires_image_guard",
      "sql": "CREATE TRIGGER custom_request_requires_image_guard BEFORE UPDATE OF status ON custom_request_items WHEN NEW.status IN ('waiting_for_pricing','price_offer_sent','buyer_accepted_price','seller_accepted','preparing','ready_for_shipping','assigned_to_shipment','in_transit','delivered','return_requested','replacement_requested','returned','refunded','replaced','closed') AND NOT EXISTS (SELECT 1 FROM custom_request_images WHERE custom_request_item_id=NEW.id) BEGIN SELECT RAISE(ABORT,'custom request requires at least one image'); END"
    },
    "custom_image_order_guard": {
      "name": "custom_image_order_guard",
      "sql": "CREATE TRIGGER custom_image_order_guard BEFORE INSERT ON custom_request_images WHEN NOT EXISTS (SELECT 1 FROM custom_request_items WHERE id=NEW.custom_request_item_id AND order_id=NEW.order_id) BEGIN SELECT RAISE(ABORT,'custom image order mismatch'); END"
    }
  }
};
