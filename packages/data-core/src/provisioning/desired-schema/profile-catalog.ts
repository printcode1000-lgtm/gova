/**
 * Desired schema for the `profile-catalog` Turso database.
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

export const profileCatalogDesiredSchema: DatabaseSchema = {
  "source": "profile-catalog",
  "tables": {
    "profile_featured_products": {
      "name": "profile_featured_products",
      "createSql": "CREATE TABLE profile_featured_products (uid text NOT NULL, product_id text NOT NULL, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, PRIMARY KEY(uid, product_id))",
      "columns": [
        {
          "name": "uid",
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
          "primaryKeyPosition": 2
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
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "profile_trending_items": {
      "name": "profile_trending_items",
      "createSql": "CREATE TABLE profile_trending_items (id text PRIMARY KEY NOT NULL, uid text NOT NULL, label text NOT NULL, sort_order integer NOT NULL DEFAULT 0, created_at text NOT NULL, updated_at text NOT NULL)",
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
          "name": "label",
          "type": "TEXT",
          "notNull": true,
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
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "profile_search_categories": {
      "name": "profile_search_categories",
      "createSql": "CREATE TABLE profile_search_categories (uid text NOT NULL, category_id integer NOT NULL, subcategory_id integer NOT NULL, specialty_column text NOT NULL, source text NOT NULL DEFAULT 'profile', is_enabled integer NOT NULL DEFAULT 1, updated_at text NOT NULL, PRIMARY KEY(uid, category_id, subcategory_id, source))",
      "columns": [
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "category_id",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 2
        },
        {
          "name": "subcategory_id",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 3
        },
        {
          "name": "specialty_column",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "source",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'profile'",
          "primaryKeyPosition": 4
        },
        {
          "name": "is_enabled",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
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
    "profile_category_product_counts": {
      "name": "profile_category_product_counts",
      "createSql": "CREATE TABLE profile_category_product_counts (uid text NOT NULL, category_id text NOT NULL, subcategory_id text NOT NULL, active_product_count integer NOT NULL DEFAULT 0, draft_product_count integer NOT NULL DEFAULT 0, archived_product_count integer NOT NULL DEFAULT 0, updated_at text NOT NULL, PRIMARY KEY(uid, category_id, subcategory_id))",
      "columns": [
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "category_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 2
        },
        {
          "name": "subcategory_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 3
        },
        {
          "name": "active_product_count",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "draft_product_count",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "archived_product_count",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
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
    "profile_trending_items_uid_idx": {
      "name": "profile_trending_items_uid_idx",
      "tableName": "profile_trending_items",
      "sql": "CREATE INDEX profile_trending_items_uid_idx ON profile_trending_items (uid)",
      "unique": false,
      "columns": [
        "uid"
      ],
      "where": null
    },
    "profile_search_categories_lookup_idx": {
      "name": "profile_search_categories_lookup_idx",
      "tableName": "profile_search_categories",
      "sql": "CREATE INDEX profile_search_categories_lookup_idx ON profile_search_categories (category_id, subcategory_id, is_enabled)",
      "unique": false,
      "columns": [
        "category_id",
        "subcategory_id",
        "is_enabled"
      ],
      "where": null
    },
    "profile_category_product_counts_lookup_idx": {
      "name": "profile_category_product_counts_lookup_idx",
      "tableName": "profile_category_product_counts",
      "sql": "CREATE INDEX profile_category_product_counts_lookup_idx ON profile_category_product_counts (category_id, subcategory_id)",
      "unique": false,
      "columns": [
        "category_id",
        "subcategory_id"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
