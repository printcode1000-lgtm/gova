/**
 * Desired schema for the `profile-promotions` Turso database.
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

export const profilePromotionsDesiredSchema: DatabaseSchema = {
  "source": "profile-promotions",
  "tables": {
    "seller_discounts": {
      "name": "seller_discounts",
      "createSql": "CREATE TABLE seller_discounts (id text PRIMARY KEY NOT NULL, seller_uid text NOT NULL, type text NOT NULL, title text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active', priority integer NOT NULL DEFAULT 100, combinable integer NOT NULL DEFAULT 0, starts_at text NOT NULL DEFAULT '', ends_at text NOT NULL DEFAULT '', coupon_code text NOT NULL DEFAULT '', value_type text NOT NULL DEFAULT 'percentage', value integer NOT NULL DEFAULT 0, max_discount_minor integer NOT NULL DEFAULT 0, min_subtotal_minor integer NOT NULL DEFAULT 0, min_quantity integer NOT NULL DEFAULT 0, buy_quantity integer NOT NULL DEFAULT 0, get_quantity integer NOT NULL DEFAULT 0, usage_limit_total integer NOT NULL DEFAULT 0, usage_limit_per_buyer integer NOT NULL DEFAULT 0, first_order_only integer NOT NULL DEFAULT 0, followers_only integer NOT NULL DEFAULT 0, app_only integer NOT NULL DEFAULT 0, product_ids_json text NOT NULL DEFAULT '[]', category_ids_json text NOT NULL DEFAULT '[]', excluded_product_ids_json text NOT NULL DEFAULT '[]', bundle_product_ids_json text NOT NULL DEFAULT '[]', gift_product_id text NOT NULL DEFAULT '', metadata_json text NOT NULL DEFAULT '{}', created_at text NOT NULL, updated_at text NOT NULL)",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "seller_uid",
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
          "name": "title",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "description",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'active'",
          "primaryKeyPosition": 0
        },
        {
          "name": "priority",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "100",
          "primaryKeyPosition": 0
        },
        {
          "name": "combinable",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "starts_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "ends_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "coupon_code",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "value_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'percentage'",
          "primaryKeyPosition": 0
        },
        {
          "name": "value",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "max_discount_minor",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "min_subtotal_minor",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "min_quantity",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "buy_quantity",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "get_quantity",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "usage_limit_total",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "usage_limit_per_buyer",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "first_order_only",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "followers_only",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "app_only",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "product_ids_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'[]'",
          "primaryKeyPosition": 0
        },
        {
          "name": "category_ids_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'[]'",
          "primaryKeyPosition": 0
        },
        {
          "name": "excluded_product_ids_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'[]'",
          "primaryKeyPosition": 0
        },
        {
          "name": "bundle_product_ids_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'[]'",
          "primaryKeyPosition": 0
        },
        {
          "name": "gift_product_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "metadata_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'{}'",
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
    "seller_discount_usages": {
      "name": "seller_discount_usages",
      "createSql": "CREATE TABLE seller_discount_usages (id text PRIMARY KEY NOT NULL, discount_id text NOT NULL, seller_uid text NOT NULL, buyer_uid text NOT NULL DEFAULT '', order_id text NOT NULL DEFAULT '', discount_minor integer NOT NULL DEFAULT 0, created_at text NOT NULL)",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "discount_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "buyer_uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "order_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "discount_minor",
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
    "seller_discounts_seller_status_idx": {
      "name": "seller_discounts_seller_status_idx",
      "tableName": "seller_discounts",
      "sql": "CREATE INDEX seller_discounts_seller_status_idx ON seller_discounts(seller_uid, status)",
      "unique": false,
      "columns": [
        "seller_uid",
        "status"
      ],
      "where": null
    },
    "seller_discounts_coupon_idx": {
      "name": "seller_discounts_coupon_idx",
      "tableName": "seller_discounts",
      "sql": "CREATE INDEX seller_discounts_coupon_idx ON seller_discounts(seller_uid, coupon_code)",
      "unique": false,
      "columns": [
        "seller_uid",
        "coupon_code"
      ],
      "where": null
    },
    "seller_discounts_coupon_unique_idx": {
      "name": "seller_discounts_coupon_unique_idx",
      "tableName": "seller_discounts",
      "sql": "CREATE UNIQUE INDEX seller_discounts_coupon_unique_idx ON seller_discounts(seller_uid, coupon_code) WHERE coupon_code <> ''",
      "unique": true,
      "columns": [
        "seller_uid",
        "coupon_code"
      ],
      "where": "coupon_code <> ''"
    },
    "seller_discount_usages_discount_idx": {
      "name": "seller_discount_usages_discount_idx",
      "tableName": "seller_discount_usages",
      "sql": "CREATE INDEX seller_discount_usages_discount_idx ON seller_discount_usages(discount_id)",
      "unique": false,
      "columns": [
        "discount_id"
      ],
      "where": null
    },
    "seller_discount_usages_buyer_idx": {
      "name": "seller_discount_usages_buyer_idx",
      "tableName": "seller_discount_usages",
      "sql": "CREATE INDEX seller_discount_usages_buyer_idx ON seller_discount_usages(discount_id, buyer_uid)",
      "unique": false,
      "columns": [
        "discount_id",
        "buyer_uid"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
