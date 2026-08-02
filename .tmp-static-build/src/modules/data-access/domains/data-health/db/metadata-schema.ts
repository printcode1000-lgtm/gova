export const DATA_HEALTH_METADATA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS data_health_runs (
    id text PRIMARY KEY NOT NULL, environment text NOT NULL, status text NOT NULL,
    started_at text NOT NULL, completed_at text, duration_ms integer NOT NULL DEFAULT 0,
    scanned_records integer NOT NULL DEFAULT 0, issue_count integer NOT NULL DEFAULT 0,
    critical_count integer NOT NULL DEFAULT 0, warning_count integer NOT NULL DEFAULT 0,
    info_count integer NOT NULL DEFAULT 0, cleanable_count integer NOT NULL DEFAULT 0,
    summary_json text NOT NULL DEFAULT '{}', error_message text NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_runs_time_idx ON data_health_runs(started_at)`,
  `CREATE TABLE IF NOT EXISTS data_health_findings (
    id text PRIMARY KEY NOT NULL, run_id text NOT NULL REFERENCES data_health_runs(id) ON DELETE CASCADE,
    fingerprint text NOT NULL, category text NOT NULL, severity text NOT NULL,
    database_name text NOT NULL, table_name text NOT NULL, record_id text NOT NULL,
    owner_uid text NOT NULL DEFAULT '', title text NOT NULL, details text NOT NULL,
    evidence_json text NOT NULL DEFAULT '{}', cleanup_action text NOT NULL DEFAULT 'none',
    cleanup_mode text NOT NULL DEFAULT 'manual', snapshot_hash text NOT NULL,
    state text NOT NULL DEFAULT 'new', related_id text NOT NULL DEFAULT '',
    record_created_at text NOT NULL DEFAULT '', record_updated_at text NOT NULL DEFAULT '',
    first_seen_at text NOT NULL, last_seen_at text NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_findings_run_idx ON data_health_findings(run_id, severity, category)`,
  `CREATE INDEX IF NOT EXISTS data_health_findings_fingerprint_idx ON data_health_findings(fingerprint, last_seen_at)`,
  `CREATE TABLE IF NOT EXISTS data_health_cleanup_plans (
    id text PRIMARY KEY NOT NULL, admin_uid text NOT NULL, environment text NOT NULL,
    run_id text NOT NULL, issue_ids_json text NOT NULL, snapshots_json text NOT NULL,
    created_at text NOT NULL, expires_at text NOT NULL, consumed_at text NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_cleanup_plans_expiry_idx ON data_health_cleanup_plans(expires_at, consumed_at)`,
  `CREATE TABLE IF NOT EXISTS data_health_cleanup_audit (
    id text PRIMARY KEY NOT NULL, plan_id text NOT NULL, run_id text NOT NULL,
    admin_uid text NOT NULL, environment text NOT NULL, issue_id text NOT NULL,
    fingerprint text NOT NULL, action text NOT NULL, record_id text NOT NULL,
    before_json text NOT NULL DEFAULT '{}', after_json text NOT NULL DEFAULT '{}',
    status text NOT NULL, reason text NOT NULL DEFAULT '', created_at text NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_cleanup_audit_time_idx ON data_health_cleanup_audit(created_at, admin_uid)`,
  `CREATE TABLE IF NOT EXISTS data_health_quarantine (
    id text PRIMARY KEY NOT NULL, fingerprint text NOT NULL UNIQUE,
    resource_type text NOT NULL, storage_profile_id text NOT NULL DEFAULT '',
    resource_key text NOT NULL DEFAULT '', database_name text NOT NULL DEFAULT '',
    table_name text NOT NULL DEFAULT '', record_id text NOT NULL DEFAULT '',
    reason text NOT NULL, quarantined_by text NOT NULL, quarantined_at text NOT NULL,
    eligible_for_deletion_at text NOT NULL, last_verified_at text NOT NULL,
    released_at text NOT NULL DEFAULT '', deleted_at text NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_quarantine_eligible_idx ON data_health_quarantine(eligible_for_deletion_at, released_at, deleted_at)`,
  `CREATE TABLE IF NOT EXISTS data_health_locks (
    id text PRIMARY KEY NOT NULL, token text NOT NULL, owner_uid text NOT NULL,
    locked_until text NOT NULL, created_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS data_health_order_purge_plans (
    id text PRIMARY KEY NOT NULL, admin_uid text NOT NULL, environment text NOT NULL,
    order_count integer NOT NULL, table_counts_json text NOT NULL,
    images_json text NOT NULL, snapshot_hash text NOT NULL,
    confirmation_text text NOT NULL, created_at text NOT NULL,
    expires_at text NOT NULL, consumed_at text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'planned', error_message text NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_order_purge_plans_expiry_idx
    ON data_health_order_purge_plans(expires_at, consumed_at, status)`,
  `CREATE TABLE IF NOT EXISTS data_health_storage_deletion_tasks (
    id text PRIMARY KEY NOT NULL, purge_id text NOT NULL,
    storage_profile_id text NOT NULL, image_key text NOT NULL,
    status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
    last_error text NOT NULL DEFAULT '', created_at text NOT NULL,
    updated_at text NOT NULL, deleted_at text NOT NULL DEFAULT '',
    UNIQUE(purge_id, storage_profile_id, image_key)
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_storage_deletion_tasks_status_idx
    ON data_health_storage_deletion_tasks(status, updated_at)`,
] as const;
