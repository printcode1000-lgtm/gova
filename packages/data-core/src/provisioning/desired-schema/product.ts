/**
 * Desired schema for the `product` Turso database.
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

export const productDesiredSchema: DatabaseSchema = {
  "source": "product",
  "tables": {
    "products": {
      "name": "products",
      "createSql": "CREATE TABLE `products` ( `id` text PRIMARY KEY NOT NULL, `uid` text NOT NULL, `main_category_id` text NOT NULL, `subcategory_id` text NOT NULL, `status` text NOT NULL DEFAULT 'active' CHECK (`status` IN ('draft', 'active', 'archived')), `created_at` text NOT NULL, `updated_at` text NOT NULL , `main_name` text NOT NULL DEFAULT '', `main_brand` text NOT NULL DEFAULT '', `main_manufacturer` text NOT NULL DEFAULT '', `main_available` integer NOT NULL DEFAULT 1, `main_description` text NOT NULL DEFAULT '', `price_current` text NOT NULL DEFAULT '', `price_before_discount` text NOT NULL DEFAULT '', `price_label` text NOT NULL DEFAULT '', `price_needs_car` integer NOT NULL DEFAULT 0, `spec_color` text NOT NULL DEFAULT '', `spec_dimensions` text NOT NULL DEFAULT '', `spec_condition` text NOT NULL DEFAULT '', `spec_size` text NOT NULL DEFAULT '', `spec_weight` text NOT NULL DEFAULT '', `spec_year` text NOT NULL DEFAULT '', `vehicle_brand` text NOT NULL DEFAULT '', `vehicle_body_type` text NOT NULL DEFAULT '', `vehicle_fuel` text NOT NULL DEFAULT '', `vehicle_transmission` text NOT NULL DEFAULT '', `vehicle_special` text NOT NULL DEFAULT '', `property_area` text NOT NULL DEFAULT '', `property_rooms` text NOT NULL DEFAULT '', `property_bathrooms` text NOT NULL DEFAULT '', `property_type` text NOT NULL DEFAULT '', `property_address` text NOT NULL DEFAULT '', `property_latitude` text NOT NULL DEFAULT '', `property_longitude` text NOT NULL DEFAULT '', `property_finishing` text NOT NULL DEFAULT '', `pharmacy_catalog_kind` text NOT NULL DEFAULT '', `pharmacy_catalog_category_id` text NOT NULL DEFAULT '', `pharmacy_catalog_category_name_ar` text NOT NULL DEFAULT '', `pharmacy_catalog_category_name_en` text NOT NULL DEFAULT '', `pharmacy_catalog_subcategory_id` text NOT NULL DEFAULT '', `pharmacy_catalog_subcategory_name_ar` text NOT NULL DEFAULT '', `pharmacy_catalog_subcategory_name_en` text NOT NULL DEFAULT '', `pharmacy_catalog_fixed_product_id` text NOT NULL DEFAULT '', `pharmacy_category_id` text NOT NULL DEFAULT '', `pharmacy_category` text NOT NULL DEFAULT '', `pharmacy_subcategory_id` text NOT NULL DEFAULT '', `pharmacy_subcategory` text NOT NULL DEFAULT '', `pharmacy_active_ingredient_id` text NOT NULL DEFAULT '', `pharmacy_active_ingredient` text NOT NULL DEFAULT '', `pharmacy_name_ar` text NOT NULL DEFAULT '', `pharmacy_name_en` text NOT NULL DEFAULT '', `pharmacy_form_id` text NOT NULL DEFAULT '', `pharmacy_form` text NOT NULL DEFAULT '', `pharmacy_concentration_id` text NOT NULL DEFAULT '', `pharmacy_concentration` text NOT NULL DEFAULT '', `pharmacy_prescription_required` integer NOT NULL DEFAULT 0, `rating_value` text NOT NULL DEFAULT '', `rating_comment` text NOT NULL DEFAULT '', `rating_enabled` integer NOT NULL DEFAULT 1, `rating_target_enabled` integer NOT NULL DEFAULT 1, `rating_mode` text NOT NULL DEFAULT '', `images_json` text NOT NULL DEFAULT '[]')",
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
          "name": "main_category_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "subcategory_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
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
          "name": "main_name",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "main_brand",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "main_manufacturer",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "main_available",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "main_description",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "price_current",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "price_before_discount",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "price_label",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "price_needs_car",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "spec_color",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "spec_dimensions",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "spec_condition",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "spec_size",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "spec_weight",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "spec_year",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "vehicle_brand",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "vehicle_body_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "vehicle_fuel",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "vehicle_transmission",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "vehicle_special",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "property_area",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "property_rooms",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "property_bathrooms",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "property_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "property_address",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "property_latitude",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "property_longitude",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "property_finishing",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_catalog_kind",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_catalog_category_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_catalog_category_name_ar",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_catalog_category_name_en",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_catalog_subcategory_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_catalog_subcategory_name_ar",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_catalog_subcategory_name_en",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_catalog_fixed_product_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_category_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_category",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_subcategory_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_subcategory",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_active_ingredient_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_active_ingredient",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_name_ar",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_name_en",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_form_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_form",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_concentration_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_concentration",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "pharmacy_prescription_required",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_value",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_comment",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_target_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "rating_mode",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "images_json",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'[]'",
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [
          "`status` IN ('draft', 'active', 'archived')"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "product_reviews": {
      "name": "product_reviews",
      "createSql": "CREATE TABLE `product_reviews` ( `id` text PRIMARY KEY NOT NULL, `product_id` text NOT NULL, `uid` text NOT NULL, `reviewer_name` text NOT NULL, `reviewer_avatar_url` text, `rating` integer NOT NULL CHECK (`rating` BETWEEN 1 AND 5), `comment` text NOT NULL DEFAULT '', `verified_purchase` integer NOT NULL DEFAULT 0 CHECK (`verified_purchase` IN (0, 1)), `helpful_count` integer NOT NULL DEFAULT 0, `created_at` text NOT NULL, `updated_at` text NOT NULL, FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade, UNIQUE (`product_id`, `uid`) )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "product_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "reviewer_name",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "reviewer_avatar_url",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "rating",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "comment",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "verified_purchase",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "helpful_count",
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
      "foreignKeys": [
        {
          "columns": [
            "product_id"
          ],
          "referencesTable": "products",
          "referencesColumns": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "CASCADE"
        }
      ],
      "constraints": {
        "checks": [
          "`rating` BETWEEN 1 AND 5",
          "`verified_purchase` IN (0, 1)"
        ],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "product_id",
            "uid"
          ]
        ]
      }
    },
    "product_review_helpful": {
      "name": "product_review_helpful",
      "createSql": "CREATE TABLE `product_review_helpful` ( `review_id` text NOT NULL, `uid` text NOT NULL, `created_at` text NOT NULL, PRIMARY KEY (`review_id`, `uid`), FOREIGN KEY (`review_id`) REFERENCES `product_reviews`(`id`) ON DELETE cascade )",
      "columns": [
        {
          "name": "review_id",
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
          "primaryKeyPosition": 2
        },
        {
          "name": "created_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [
        {
          "columns": [
            "review_id"
          ],
          "referencesTable": "product_reviews",
          "referencesColumns": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "CASCADE"
        }
      ],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "product_review_replies": {
      "name": "product_review_replies",
      "createSql": "CREATE TABLE `product_review_replies` ( `id` text PRIMARY KEY NOT NULL, `review_id` text NOT NULL UNIQUE, `seller_uid` text NOT NULL, `reply_text` text NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL, FOREIGN KEY (`review_id`) REFERENCES `product_reviews`(`id`) ON DELETE cascade )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "review_id",
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
          "name": "reply_text",
          "type": "TEXT",
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
      "foreignKeys": [
        {
          "columns": [
            "review_id"
          ],
          "referencesTable": "product_reviews",
          "referencesColumns": [
            "id"
          ],
          "onUpdate": "NO ACTION",
          "onDelete": "CASCADE"
        }
      ],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "review_id"
          ]
        ]
      }
    },
    "pharmacy_profile_category_overrides": {
      "name": "pharmacy_profile_category_overrides",
      "createSql": "CREATE TABLE `pharmacy_profile_category_overrides` ( `id` text PRIMARY KEY NOT NULL, `uid` text NOT NULL, `fixed_category_id` integer, `name_ar` text, `name_en` text, `icon` text, `status` text NOT NULL DEFAULT 'visible' CHECK (`status` IN ('visible', 'hidden', 'custom')), `sort_order` integer, `created_at` text NOT NULL, `updated_at` text NOT NULL )",
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
          "name": "fixed_category_id",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "name_ar",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "name_en",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "icon",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'visible'",
          "primaryKeyPosition": 0
        },
        {
          "name": "sort_order",
          "type": "INTEGER",
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
          "`status` IN ('visible', 'hidden', 'custom')"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "pharmacy_profile_subcategory_overrides": {
      "name": "pharmacy_profile_subcategory_overrides",
      "createSql": "CREATE TABLE `pharmacy_profile_subcategory_overrides` ( `id` text PRIMARY KEY NOT NULL, `uid` text NOT NULL, `fixed_subcategory_id` integer, `parent_category_id` text NOT NULL, `name_ar` text, `name_en` text, `status` text NOT NULL DEFAULT 'visible' CHECK (`status` IN ('visible', 'hidden', 'custom')), `sort_order` integer, `created_at` text NOT NULL, `updated_at` text NOT NULL )",
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
          "name": "fixed_subcategory_id",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "parent_category_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "name_ar",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "name_en",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'visible'",
          "primaryKeyPosition": 0
        },
        {
          "name": "sort_order",
          "type": "INTEGER",
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
          "`status` IN ('visible', 'hidden', 'custom')"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "pharmacy_profile_product_overrides": {
      "name": "pharmacy_profile_product_overrides",
      "createSql": "CREATE TABLE `pharmacy_profile_product_overrides` ( `id` text PRIMARY KEY NOT NULL, `uid` text NOT NULL, `fixed_product_id` integer, `parent_subcategory_id` text NOT NULL, `name_ar` text, `name_en` text, `description` text, `image_url` text, `image_key` text, `form_id` text, `form_name_ar` text, `strength_id` text, `strength_value` text, `prescription_required` integer, `price_text` text, `price_minor` integer, `status` text NOT NULL DEFAULT 'visible' CHECK (`status` IN ('visible', 'hidden', 'custom')), `sort_order` integer, `created_at` text NOT NULL, `updated_at` text NOT NULL )",
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
          "name": "fixed_product_id",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "parent_subcategory_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "name_ar",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "name_en",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "description",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "image_url",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "image_key",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "form_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "form_name_ar",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "strength_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "strength_value",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "prescription_required",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "price_text",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "price_minor",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'visible'",
          "primaryKeyPosition": 0
        },
        {
          "name": "sort_order",
          "type": "INTEGER",
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
          "`status` IN ('visible', 'hidden', 'custom')"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    }
  },
  "indexes": {
    "products_uid_idx": {
      "name": "products_uid_idx",
      "tableName": "products",
      "sql": "CREATE INDEX `products_uid_idx` ON `products` (`uid`)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "products_category_idx": {
      "name": "products_category_idx",
      "tableName": "products",
      "sql": "CREATE INDEX `products_category_idx` ON `products` (`main_category_id`, `subcategory_id`)",
      "unique": false,
      "columns": [
        "main_category_id",
        "subcategory_id"
      ],
      "where": null
    },
    "product_reviews_product_idx": {
      "name": "product_reviews_product_idx",
      "tableName": "product_reviews",
      "sql": "CREATE INDEX `product_reviews_product_idx` ON `product_reviews` (`product_id`, `created_at`)",
      "unique": false,
      "columns": [
        "product_id",
        "created_at"
      ],
      "where": null
    },
    "pharmacy_profile_category_uid_idx": {
      "name": "pharmacy_profile_category_uid_idx",
      "tableName": "pharmacy_profile_category_overrides",
      "sql": "CREATE INDEX `pharmacy_profile_category_uid_idx` ON `pharmacy_profile_category_overrides` (`uid`)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "pharmacy_profile_category_fixed_uid_idx": {
      "name": "pharmacy_profile_category_fixed_uid_idx",
      "tableName": "pharmacy_profile_category_overrides",
      "sql": "CREATE UNIQUE INDEX `pharmacy_profile_category_fixed_uid_idx` ON `pharmacy_profile_category_overrides` (`uid`, `fixed_category_id`) WHERE `fixed_category_id` IS NOT NULL",
      "unique": true,
      "columns": [
        "uid",
        "fixed_category_id"
      ],
      "where": "`fixed_category_id` IS NOT NULL"
    },
    "pharmacy_profile_subcategory_uid_idx": {
      "name": "pharmacy_profile_subcategory_uid_idx",
      "tableName": "pharmacy_profile_subcategory_overrides",
      "sql": "CREATE INDEX `pharmacy_profile_subcategory_uid_idx` ON `pharmacy_profile_subcategory_overrides` (`uid`)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "pharmacy_profile_subcategory_fixed_uid_idx": {
      "name": "pharmacy_profile_subcategory_fixed_uid_idx",
      "tableName": "pharmacy_profile_subcategory_overrides",
      "sql": "CREATE UNIQUE INDEX `pharmacy_profile_subcategory_fixed_uid_idx` ON `pharmacy_profile_subcategory_overrides` (`uid`, `fixed_subcategory_id`) WHERE `fixed_subcategory_id` IS NOT NULL",
      "unique": true,
      "columns": [
        "uid",
        "fixed_subcategory_id"
      ],
      "where": "`fixed_subcategory_id` IS NOT NULL"
    },
    "pharmacy_profile_product_uid_idx": {
      "name": "pharmacy_profile_product_uid_idx",
      "tableName": "pharmacy_profile_product_overrides",
      "sql": "CREATE INDEX `pharmacy_profile_product_uid_idx` ON `pharmacy_profile_product_overrides` (`uid`)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "pharmacy_profile_product_fixed_uid_idx": {
      "name": "pharmacy_profile_product_fixed_uid_idx",
      "tableName": "pharmacy_profile_product_overrides",
      "sql": "CREATE UNIQUE INDEX `pharmacy_profile_product_fixed_uid_idx` ON `pharmacy_profile_product_overrides` (`uid`, `fixed_product_id`) WHERE `fixed_product_id` IS NOT NULL",
      "unique": true,
      "columns": [
        "uid",
        "fixed_product_id"
      ],
      "where": "`fixed_product_id` IS NOT NULL"
    }
  },
  "views": {},
  "triggers": {}
};
