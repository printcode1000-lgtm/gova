/**
 * Desired schema for the `orders-disputes-audit` Turso database.
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

export const ordersDisputesAuditDesiredSchema: DatabaseSchema = {
  "source": "orders-disputes-audit",
  "tables": {
    "disputes": {
      "name": "disputes",
      "createSql": "CREATE TABLE disputes (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_order_id TEXT, order_item_id TEXT, custom_request_item_id TEXT, shipment_id TEXT, return_request_id TEXT, opened_by TEXT NOT NULL, opened_by_role TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'opened', admin_decision TEXT, closed_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
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
          "name": "shipment_id",
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
          "name": "opened_by",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "opened_by_role",
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
          "defaultValue": "'opened'",
          "primaryKeyPosition": 0
        },
        {
          "name": "admin_decision",
          "type": "TEXT",
          "notNull": false,
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
    "dispute_messages": {
      "name": "dispute_messages",
      "createSql": "CREATE TABLE dispute_messages (id TEXT PRIMARY KEY, dispute_id TEXT NOT NULL, sender_id TEXT NOT NULL, sender_role TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "dispute_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "sender_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "sender_role",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "message",
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
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    },
    "audit_trail": {
      "name": "audit_trail",
      "createSql": "CREATE TABLE audit_trail (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, old_status TEXT, new_status TEXT, old_value_json TEXT, new_value_json TEXT, performed_by TEXT NOT NULL, performed_by_role TEXT NOT NULL, reason TEXT, source TEXT, ip_address TEXT, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
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
          "name": "entity_type",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "entity_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "action",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "old_status",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "new_status",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "old_value_json",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "new_value_json",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "performed_by",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "performed_by_role",
          "type": "TEXT",
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
          "name": "source",
          "type": "TEXT",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "ip_address",
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
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": []
      }
    }
  },
  "indexes": {
    "disputes_lookup_idx": {
      "name": "disputes_lookup_idx",
      "tableName": "disputes",
      "sql": "CREATE INDEX disputes_lookup_idx ON disputes(order_id,status)",
      "unique": false,
      "columns": [
        "order_id",
        "status"
      ],
      "where": null
    },
    "disputes_order_id_idx": {
      "name": "disputes_order_id_idx",
      "tableName": "disputes",
      "sql": "CREATE INDEX disputes_order_id_idx ON disputes(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "disputes_status_idx": {
      "name": "disputes_status_idx",
      "tableName": "disputes",
      "sql": "CREATE INDEX disputes_status_idx ON disputes(status)",
      "unique": false,
      "columns": [
        "status"
      ],
      "where": null
    },
    "audit_lookup_idx": {
      "name": "audit_lookup_idx",
      "tableName": "audit_trail",
      "sql": "CREATE INDEX audit_lookup_idx ON audit_trail(order_id,entity_type,entity_id,performed_by,created_at)",
      "unique": false,
      "columns": [
        "order_id",
        "entity_type",
        "entity_id",
        "performed_by",
        "created_at"
      ],
      "where": null
    },
    "audit_trail_order_id_idx": {
      "name": "audit_trail_order_id_idx",
      "tableName": "audit_trail",
      "sql": "CREATE INDEX audit_trail_order_id_idx ON audit_trail(order_id)",
      "unique": false,
      "columns": [
        "order_id"
      ],
      "where": null
    },
    "audit_trail_entity_type_idx": {
      "name": "audit_trail_entity_type_idx",
      "tableName": "audit_trail",
      "sql": "CREATE INDEX audit_trail_entity_type_idx ON audit_trail(entity_type)",
      "unique": false,
      "columns": [
        "entity_type"
      ],
      "where": null
    },
    "audit_trail_entity_id_idx": {
      "name": "audit_trail_entity_id_idx",
      "tableName": "audit_trail",
      "sql": "CREATE INDEX audit_trail_entity_id_idx ON audit_trail(entity_id)",
      "unique": false,
      "columns": [
        "entity_id"
      ],
      "where": null
    },
    "audit_trail_performed_by_idx": {
      "name": "audit_trail_performed_by_idx",
      "tableName": "audit_trail",
      "sql": "CREATE INDEX audit_trail_performed_by_idx ON audit_trail(performed_by)",
      "unique": false,
      "columns": [
        "performed_by"
      ],
      "where": null
    },
    "audit_trail_created_at_idx": {
      "name": "audit_trail_created_at_idx",
      "tableName": "audit_trail",
      "sql": "CREATE INDEX audit_trail_created_at_idx ON audit_trail(created_at)",
      "unique": false,
      "columns": [
        "created_at"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {
    "disputes_status_guard": {
      "name": "disputes_status_guard",
      "sql": "CREATE TRIGGER disputes_status_guard BEFORE INSERT ON disputes WHEN NEW.status NOT IN ('opened','buyer_replied','seller_replied','carrier_replied','admin_intervened','admin_decision_issued','closed') BEGIN SELECT RAISE(ABORT,'invalid dispute status'); END"
    },
    "disputes_status_update_guard": {
      "name": "disputes_status_update_guard",
      "sql": "CREATE TRIGGER disputes_status_update_guard BEFORE UPDATE OF status ON disputes WHEN NEW.status NOT IN ('opened','buyer_replied','seller_replied','carrier_replied','admin_intervened','admin_decision_issued','closed') BEGIN SELECT RAISE(ABORT,'invalid dispute status'); END"
    },
    "dispute_actor_role_guard": {
      "name": "dispute_actor_role_guard",
      "sql": "CREATE TRIGGER dispute_actor_role_guard BEFORE INSERT ON disputes WHEN NEW.opened_by_role NOT IN ('buyer','seller','service_provider','carrier','admin','system') BEGIN SELECT RAISE(ABORT,'invalid dispute actor role'); END"
    },
    "dispute_message_role_guard": {
      "name": "dispute_message_role_guard",
      "sql": "CREATE TRIGGER dispute_message_role_guard BEFORE INSERT ON dispute_messages WHEN NEW.sender_role NOT IN ('buyer','seller','service_provider','carrier','admin','system') BEGIN SELECT RAISE(ABORT,'invalid dispute message role'); END"
    },
    "audit_role_guard": {
      "name": "audit_role_guard",
      "sql": "CREATE TRIGGER audit_role_guard BEFORE INSERT ON audit_trail WHEN NEW.performed_by_role NOT IN ('buyer','seller','service_provider','carrier','admin','system') BEGIN SELECT RAISE(ABORT,'invalid audit actor role'); END"
    },
    "audit_action_guard": {
      "name": "audit_action_guard",
      "sql": "CREATE TRIGGER audit_action_guard BEFORE INSERT ON audit_trail WHEN NEW.action NOT IN ('created','updated','status_changed','price_changed','shipping_fee_changed','tracking_updated','accepted','rejected','cancelled','assigned','received','delivered','delivery_rejected','payment_created','refund_requested','refund_executed','return_requested','replacement_requested','dispute_opened','dispute_replied','admin_decision','admin_change','image_uploaded') BEGIN SELECT RAISE(ABORT,'invalid audit action'); END"
    }
  }
};
