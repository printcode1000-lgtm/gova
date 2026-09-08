/**
 * Desired schema for the `system-ops` Turso database.
 *
 * Generated once from the verified schema of the database this repository was
 * already running against, then owned here by hand. It is the provisioning
 * SSOT: schema sync compares *this* with a live Turso read-back, and no local
 * SQLite file, migration replay, or embedded database engine takes part.
 *
 * Drizzle `sqliteTable(...)` declarations remain the application data mapping
 * and historical migrations remain history; a static parity test keeps the
 * three from drifting apart.
 *
 * Operational state the platform owns about itself: the persistent system log
 * and the control release marker. Both used to be created lazily by the
 * repositories that read them; they are declared here so provisioning owns the
 * schema and those repositories stay data-only.
 *
 * The removed Data Health capability owned eight `data_health_*` tables in this
 * database. They are deliberately absent. Any copy still present in a live Turso
 * database is unowned historical residue, reported as an extra and never dropped
 * by this refactor.
 */
import type { DatabaseSchema } from '../core/types';

export const systemOpsDesiredSchema: DatabaseSchema = {
  "source": "system-ops",
  "tables": {
    "system_logs": {
      "name": "system_logs",
      "createSql": "CREATE TABLE system_logs (id text PRIMARY KEY NOT NULL, fingerprint text NOT NULL UNIQUE, level text NOT NULL, source text NOT NULL, console_method text NOT NULL DEFAULT '', message text NOT NULL, page text NOT NULL DEFAULT '', platform text NOT NULL DEFAULT 'server', error_name text NOT NULL DEFAULT '', source_file text NOT NULL DEFAULT '', source_line integer, source_column integer, user_agent text NOT NULL DEFAULT '', feature text NOT NULL DEFAULT '', operation text NOT NULL DEFAULT '', stack text NOT NULL DEFAULT '', route_name text NOT NULL DEFAULT '', status_code integer, request_method text NOT NULL DEFAULT '', app_version text NOT NULL DEFAULT '', native_version text NOT NULL DEFAULT '', uid text NOT NULL DEFAULT '', occurrences integer NOT NULL DEFAULT 1, first_occurred_at text NOT NULL, last_occurred_at text NOT NULL, origin text NOT NULL DEFAULT 'client', trust_level text NOT NULL DEFAULT 'legacy', message_truncated integer NOT NULL DEFAULT 0, stack_truncated integer NOT NULL DEFAULT 0, correlation_id text NOT NULL DEFAULT '', request_flow_id text NOT NULL DEFAULT '', session_id text NOT NULL DEFAULT '', monitor_trace_id text NOT NULL DEFAULT '')",
      "columns": [
        {
          "name": "id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "fingerprint",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "level",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "source",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "console_method",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
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
          "name": "page",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "platform",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'server'",
          "primaryKeyPosition": 0
        },
        {
          "name": "error_name",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "source_file",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "source_line",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "source_column",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "user_agent",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "feature",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "operation",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "stack",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "route_name",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "status_code",
          "type": "INTEGER",
          "notNull": false,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "request_method",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "app_version",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "native_version",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "uid",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "occurrences",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "1",
          "primaryKeyPosition": 0
        },
        {
          "name": "first_occurred_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "last_occurred_at",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "origin",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'client'",
          "primaryKeyPosition": 0
        },
        {
          "name": "trust_level",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "'legacy'",
          "primaryKeyPosition": 0
        },
        {
          "name": "message_truncated",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "stack_truncated",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": "0",
          "primaryKeyPosition": 0
        },
        {
          "name": "correlation_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "request_flow_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "session_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        },
        {
          "name": "monitor_trace_id",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": "''",
          "primaryKeyPosition": 0
        }
      ],
      "foreignKeys": [],
      "constraints": {
        "checks": [],
        "autoIncrement": false,
        "uniqueConstraints": [
          [
            "fingerprint"
          ]
        ]
      }
    },
    "control_release_state": {
      "name": "control_release_state",
      "createSql": "CREATE TABLE control_release_state ( revision text PRIMARY KEY NOT NULL, version integer NOT NULL, state_json text NOT NULL, updated_at text NOT NULL )",
      "columns": [
        {
          "name": "revision",
          "type": "TEXT",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 1
        },
        {
          "name": "version",
          "type": "INTEGER",
          "notNull": true,
          "defaultValue": null,
          "primaryKeyPosition": 0
        },
        {
          "name": "state_json",
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
    "system_logs_level_time_idx": {
      "name": "system_logs_level_time_idx",
      "tableName": "system_logs",
      "sql": "CREATE INDEX system_logs_level_time_idx ON system_logs(level, last_occurred_at)",
      "unique": false,
      "columns": [
        "level",
        "last_occurred_at"
      ],
      "where": null
    },
    "system_logs_platform_time_idx": {
      "name": "system_logs_platform_time_idx",
      "tableName": "system_logs",
      "sql": "CREATE INDEX system_logs_platform_time_idx ON system_logs(platform, last_occurred_at)",
      "unique": false,
      "columns": [
        "platform",
        "last_occurred_at"
      ],
      "where": null
    },
    "system_logs_time_id_idx": {
      "name": "system_logs_time_id_idx",
      "tableName": "system_logs",
      "sql": "CREATE INDEX system_logs_time_id_idx ON system_logs(last_occurred_at, id)",
      "unique": false,
      "columns": [
        "last_occurred_at",
        "id"
      ],
      "where": null
    },
    "system_logs_origin_level_time_id_idx": {
      "name": "system_logs_origin_level_time_id_idx",
      "tableName": "system_logs",
      "sql": "CREATE INDEX system_logs_origin_level_time_id_idx ON system_logs(origin, level, last_occurred_at, id)",
      "unique": false,
      "columns": [
        "origin",
        "level",
        "last_occurred_at",
        "id"
      ],
      "where": null
    },
    "system_logs_level_occurrences_time_idx": {
      "name": "system_logs_level_occurrences_time_idx",
      "tableName": "system_logs",
      "sql": "CREATE INDEX system_logs_level_occurrences_time_idx ON system_logs(level, occurrences, last_occurred_at)",
      "unique": false,
      "columns": [
        "level",
        "occurrences",
        "last_occurred_at"
      ],
      "where": null
    },
    "system_logs_feature_idx": {
      "name": "system_logs_feature_idx",
      "tableName": "system_logs",
      "sql": "CREATE INDEX system_logs_feature_idx ON system_logs(feature, operation)",
      "unique": false,
      "columns": [
        "feature",
        "operation"
      ],
      "where": null
    },
    "system_logs_origin_time_idx": {
      "name": "system_logs_origin_time_idx",
      "tableName": "system_logs",
      "sql": "CREATE INDEX system_logs_origin_time_idx ON system_logs(origin, last_occurred_at)",
      "unique": false,
      "columns": [
        "origin",
        "last_occurred_at"
      ],
      "where": null
    },
    "system_logs_correlation_idx": {
      "name": "system_logs_correlation_idx",
      "tableName": "system_logs",
      "sql": "CREATE INDEX system_logs_correlation_idx ON system_logs(correlation_id)",
      "unique": false,
      "columns": [
        "correlation_id"
      ],
      "where": null
    },
    "control_release_state_updated_at_idx": {
      "name": "control_release_state_updated_at_idx",
      "tableName": "control_release_state",
      "sql": "CREATE INDEX control_release_state_updated_at_idx ON control_release_state(updated_at)",
      "unique": false,
      "columns": [
        "updated_at"
      ],
      "where": null
    }
  },
  "views": {},
  "triggers": {}
};
