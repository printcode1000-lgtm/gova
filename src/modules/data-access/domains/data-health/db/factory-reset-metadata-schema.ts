export const DATA_HEALTH_FACTORY_RESET_METADATA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS data_health_factory_reset_plans (
    id text PRIMARY KEY NOT NULL, admin_uid text NOT NULL, environment text NOT NULL,
    domain_count integer NOT NULL DEFAULT 0, image_count integer NOT NULL DEFAULT 0,
    total_rows integer NOT NULL DEFAULT 0,
    domain_counts_json text NOT NULL DEFAULT '{}', snapshot_hash text NOT NULL,
    confirmation_text text NOT NULL, created_at text NOT NULL,
    expires_at text NOT NULL, consumed_at text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'planned', error_message text NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_factory_reset_plans_expiry_idx
    ON data_health_factory_reset_plans(expires_at, consumed_at, status)`,
  `CREATE TABLE IF NOT EXISTS data_health_factory_reset_locks (
    id text PRIMARY KEY NOT NULL, token text NOT NULL, owner_uid text NOT NULL,
    locked_until text NOT NULL, created_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS data_health_factory_reset_audit (
    id text PRIMARY KEY NOT NULL, plan_id text NOT NULL, admin_uid text NOT NULL,
    environment text NOT NULL, status text NOT NULL,
    before_json text NOT NULL DEFAULT '{}', after_json text NOT NULL DEFAULT '{}',
    reason text NOT NULL DEFAULT '', created_at text NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS data_health_factory_reset_audit_time_idx
    ON data_health_factory_reset_audit(created_at, admin_uid)`,
] as const;
