/**
 * Desired schema for the `orders-delivery-plans` Turso database.
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

export const ordersDeliveryPlansDesiredSchema: DatabaseSchema = {
  "source": "orders-delivery-plans",
  "tables": {
    "delivery_plans": {
      "name": "delivery_plans",
      "createSql": "CREATE TABLE delivery_plans ( id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, buyer_id TEXT NOT NULL, strategy TEXT NOT NULL DEFAULT 'unified' CHECK(strategy IN ('unified','hybrid','separate')), status TEXT NOT NULL DEFAULT 'collecting_quotes' CHECK(status IN ('collecting_quotes','pending_buyer','accepted','reprice_required','separate_selected','cancelled','completed')), selected_quote_id TEXT, fallback_confirmed_price INTEGER NOT NULL DEFAULT 0 CHECK(fallback_confirmed_price >= 0), fallback_has_pending_quotes INTEGER NOT NULL DEFAULT 0 CHECK(fallback_has_pending_quotes IN (0,1)), fallback_available INTEGER NOT NULL DEFAULT 1 CHECK(fallback_available IN (0,1)), special_vehicle_required INTEGER NOT NULL DEFAULT 0 CHECK(special_vehicle_required IN (0,1)), seller_count INTEGER NOT NULL CHECK(seller_count >= 0), currency TEXT NOT NULL CHECK(length(currency)=3), created_at TEXT NOT NULL, updated_at TEXT NOT NULL )",
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
          "name": "strategy",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'unified'",
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'collecting_quotes'",
          "primaryKeyPosition": 0
        },
        {
          "name": "selected_quote_id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "fallback_confirmed_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "fallback_has_pending_quotes",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "fallback_available",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "special_vehicle_required",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "seller_count",
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
          "fallback_available IN (0,1)",
          "fallback_confirmed_price >= 0",
          "fallback_has_pending_quotes IN (0,1)",
          "length(currency)=3",
          "seller_count >= 0",
          "special_vehicle_required IN (0,1)",
          "status IN ('collecting_quotes','pending_buyer','accepted','reprice_required','separate_selected','cancelled','completed')",
          "strategy IN ('unified','hybrid','separate')"
        ],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "order_id"
          ]
        ]
      }
    },
    "delivery_plan_stops": {
      "name": "delivery_plan_stops",
      "createSql": "CREATE TABLE delivery_plan_stops ( id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, order_id TEXT NOT NULL, seller_order_id TEXT NOT NULL, seller_id TEXT NOT NULL, original_carrier_id TEXT, pickup_address_snapshot_json TEXT NOT NULL, requires_location_quote INTEGER NOT NULL DEFAULT 0 CHECK(requires_location_quote IN (0,1)), fallback_shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(fallback_shipping_price >= 0), fallback_special_vehicle_fee INTEGER NOT NULL DEFAULT 0 CHECK(fallback_special_vehicle_fee >= 0), pickup_sequence INTEGER NOT NULL DEFAULT 0 CHECK(pickup_sequence >= 0), status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','ready','collected','skipped','cancelled')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(plan_id, seller_order_id) )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "plan_id",
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
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "original_carrier_id",
          "type": "TEXT",
          "notNull": false,
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
          "name": "requires_location_quote",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "fallback_shipping_price",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "fallback_special_vehicle_fee",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "pickup_sequence",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'waiting'",
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
          "fallback_shipping_price >= 0",
          "fallback_special_vehicle_fee >= 0",
          "pickup_sequence >= 0",
          "requires_location_quote IN (0,1)",
          "status IN ('waiting','ready','collected','skipped','cancelled')"
        ],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "plan_id",
            "seller_order_id"
          ]
        ]
      }
    },
    "delivery_plan_candidates": {
      "name": "delivery_plan_candidates",
      "createSql": "CREATE TABLE delivery_plan_candidates ( plan_id TEXT NOT NULL, provider_id TEXT NOT NULL, source TEXT NOT NULL CHECK(source IN ('linked','qualified_network','admin')), coverage_score INTEGER NOT NULL DEFAULT 0 CHECK(coverage_score >= 0), status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','viewed','declined','quoted')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(plan_id, provider_id) )",
      "columns": [
        {
          "name": "plan_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "provider_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 2
        },
        {
          "name": "source",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "coverage_score",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "status",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'invited'",
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
          "coverage_score >= 0",
          "source IN ('linked','qualified_network','admin')",
          "status IN ('invited','viewed','declined','quoted')"
        ],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "delivery_plan_candidate_stops": {
      "name": "delivery_plan_candidate_stops",
      "createSql": "CREATE TABLE delivery_plan_candidate_stops ( plan_id TEXT NOT NULL, provider_id TEXT NOT NULL, stop_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(plan_id, provider_id, stop_id) )",
      "columns": [
        {
          "name": "plan_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "provider_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 2
        },
        {
          "name": "stop_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 3
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
    "delivery_plan_quotes": {
      "name": "delivery_plan_quotes",
      "createSql": "CREATE TABLE delivery_plan_quotes ( id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, order_id TEXT NOT NULL, provider_id TEXT NOT NULL, version INTEGER NOT NULL CHECK(version > 0), base_shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(base_shipping_price >= 0), special_vehicle_fee INTEGER NOT NULL DEFAULT 0 CHECK(special_vehicle_fee >= 0), total_shipping_price INTEGER NOT NULL DEFAULT 0 CHECK(total_shipping_price >= 0), status TEXT NOT NULL CHECK(status IN ('pending_buyer','accepted','rejected','superseded','withdrawn','expired')), notes TEXT, expires_at TEXT, responded_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(plan_id, provider_id, version) )",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "plan_id",
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
          "name": "provider_id",
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
          "special_vehicle_fee >= 0",
          "status IN ('pending_buyer','accepted','rejected','superseded','withdrawn','expired')",
          "total_shipping_price >= 0",
          "version > 0"
        ],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "plan_id",
            "provider_id",
            "version"
          ]
        ]
      }
    },
    "delivery_plan_quote_stops": {
      "name": "delivery_plan_quote_stops",
      "createSql": "CREATE TABLE delivery_plan_quote_stops ( quote_id TEXT NOT NULL, plan_id TEXT NOT NULL, stop_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(quote_id, stop_id) )",
      "columns": [
        {
          "name": "quote_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "plan_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "stop_id",
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
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "delivery_plan_shipments": {
      "name": "delivery_plan_shipments",
      "createSql": "CREATE TABLE delivery_plan_shipments ( plan_id TEXT NOT NULL, shipment_id TEXT NOT NULL UNIQUE, quote_id TEXT, created_at TEXT NOT NULL, PRIMARY KEY(plan_id, shipment_id) )",
      "columns": [
        {
          "name": "plan_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "shipment_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 2
        },
        {
          "name": "quote_id",
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
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "shipment_id"
          ]
        ]
      }
    }
  },
  "indexes": {
    "delivery_plans_order_id_idx": {
      "name": "delivery_plans_order_id_idx",
      "tableName": "delivery_plans",
      "sql": "CREATE INDEX delivery_plans_order_id_idx ON delivery_plans(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "delivery_plans_buyer_id_idx": {
      "name": "delivery_plans_buyer_id_idx",
      "tableName": "delivery_plans",
      "sql": "CREATE INDEX delivery_plans_buyer_id_idx ON delivery_plans(buyer_id)",
      "unique": false,
      "columns": [
        "buyer_id"
      ],
      "where": null
    },
    "delivery_plans_status_idx": {
      "name": "delivery_plans_status_idx",
      "tableName": "delivery_plans",
      "sql": "CREATE INDEX delivery_plans_status_idx ON delivery_plans(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "delivery_plan_stops_plan_id_idx": {
      "name": "delivery_plan_stops_plan_id_idx",
      "tableName": "delivery_plan_stops",
      "sql": "CREATE INDEX delivery_plan_stops_plan_id_idx ON delivery_plan_stops(plan_id)",
      "unique": false,
      "columns": [
        "plan_id"
      ],
      "where": null
    },
    "delivery_plan_stops_seller_order_idx": {
      "name": "delivery_plan_stops_seller_order_idx",
      "tableName": "delivery_plan_stops",
      "sql": "CREATE INDEX delivery_plan_stops_seller_order_idx ON delivery_plan_stops(seller_order_id)",
      "unique": false,
      "columns": [
        "seller_order_id"
      ],
      "where": null
    },
    "delivery_plan_candidates_provider_idx": {
      "name": "delivery_plan_candidates_provider_idx",
      "tableName": "delivery_plan_candidates",
      "sql": "CREATE INDEX delivery_plan_candidates_provider_idx ON delivery_plan_candidates(provider_id)",
      "unique": false,
      "columns": [
        "provider_id"
      ],
      "where": null
    },
    "delivery_plan_candidate_stops_stop_idx": {
      "name": "delivery_plan_candidate_stops_stop_idx",
      "tableName": "delivery_plan_candidate_stops",
      "sql": "CREATE INDEX delivery_plan_candidate_stops_stop_idx ON delivery_plan_candidate_stops(stop_id)",
      "unique": false,
      "columns": [
        "stop_id"
      ],
      "where": null
    },
    "delivery_plan_quotes_plan_id_idx": {
      "name": "delivery_plan_quotes_plan_id_idx",
      "tableName": "delivery_plan_quotes",
      "sql": "CREATE INDEX delivery_plan_quotes_plan_id_idx ON delivery_plan_quotes(plan_id)",
      "unique": false,
      "columns": [
        "plan_id"
      ],
      "where": null
    },
    "delivery_plan_quotes_provider_id_idx": {
      "name": "delivery_plan_quotes_provider_id_idx",
      "tableName": "delivery_plan_quotes",
      "sql": "CREATE INDEX delivery_plan_quotes_provider_id_idx ON delivery_plan_quotes(provider_id)",
      "unique": false,
      "columns": [
        "provider_id"
      ],
      "where": null
    },
    "delivery_plan_quotes_status_idx": {
      "name": "delivery_plan_quotes_status_idx",
      "tableName": "delivery_plan_quotes",
      "sql": "CREATE INDEX delivery_plan_quotes_status_idx ON delivery_plan_quotes(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "delivery_plan_quotes_one_pending_provider_idx": {
      "name": "delivery_plan_quotes_one_pending_provider_idx",
      "tableName": "delivery_plan_quotes",
      "sql": "CREATE UNIQUE INDEX delivery_plan_quotes_one_pending_provider_idx ON delivery_plan_quotes(plan_id,provider_id) WHERE status='pending_buyer'",
      "unique": true,
      "columns": [
        "plan_id",
        "provider_id"
      ],
      "where": "status='pending_buyer'"
    },
    "delivery_plan_quote_stops_stop_idx": {
      "name": "delivery_plan_quote_stops_stop_idx",
      "tableName": "delivery_plan_quote_stops",
      "sql": "CREATE INDEX delivery_plan_quote_stops_stop_idx ON delivery_plan_quote_stops(stop_id)",
      "unique": false,
      "columns": [
        "stop_id"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {
    "delivery_plan_money_insert_guard": {
      "name": "delivery_plan_money_insert_guard",
      "sql": "CREATE TRIGGER delivery_plan_money_insert_guard BEFORE INSERT ON delivery_plans WHEN typeof(NEW.fallback_confirmed_price)<>'integer' BEGIN SELECT RAISE(ABORT,'delivery plan money must use integer minor units'); END"
    },
    "delivery_plan_money_update_guard": {
      "name": "delivery_plan_money_update_guard",
      "sql": "CREATE TRIGGER delivery_plan_money_update_guard BEFORE UPDATE OF fallback_confirmed_price ON delivery_plans WHEN typeof(NEW.fallback_confirmed_price)<>'integer' BEGIN SELECT RAISE(ABORT,'delivery plan money must use integer minor units'); END"
    },
    "delivery_plan_stop_money_insert_guard": {
      "name": "delivery_plan_stop_money_insert_guard",
      "sql": "CREATE TRIGGER delivery_plan_stop_money_insert_guard BEFORE INSERT ON delivery_plan_stops WHEN typeof(NEW.fallback_shipping_price)<>'integer' OR typeof(NEW.fallback_special_vehicle_fee)<>'integer' BEGIN SELECT RAISE(ABORT,'delivery plan stop money must use integer minor units'); END"
    },
    "delivery_plan_quote_money_insert_guard": {
      "name": "delivery_plan_quote_money_insert_guard",
      "sql": "CREATE TRIGGER delivery_plan_quote_money_insert_guard BEFORE INSERT ON delivery_plan_quotes WHEN typeof(NEW.base_shipping_price)<>'integer' OR typeof(NEW.special_vehicle_fee)<>'integer' OR typeof(NEW.total_shipping_price)<>'integer' BEGIN SELECT RAISE(ABORT,'delivery plan quote money must use integer minor units'); END"
    },
    "delivery_plan_quote_money_update_guard": {
      "name": "delivery_plan_quote_money_update_guard",
      "sql": "CREATE TRIGGER delivery_plan_quote_money_update_guard BEFORE UPDATE OF base_shipping_price,special_vehicle_fee,total_shipping_price ON delivery_plan_quotes WHEN typeof(NEW.base_shipping_price)<>'integer' OR typeof(NEW.special_vehicle_fee)<>'integer' OR typeof(NEW.total_shipping_price)<>'integer' BEGIN SELECT RAISE(ABORT,'delivery plan quote money must use integer minor units'); END"
    }
  }
};
