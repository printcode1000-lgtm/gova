/**
 * DDL for the UiRegistry pending-registration queue.
 *
 * This table lives in the `system-ops` shard beside the other operator-facing
 * records, and — like the data-health metadata — it is created from TypeScript
 * DDL applied at runtime rather than from a numbered migration, because the
 * shard's tables are owned by the tools that write them.
 *
 * Every column is safe UiRegistry metadata. There is deliberately no column for
 * page text, form values, DOM HTML, or a source path: a row that cannot hold
 * user content cannot leak it.
 */
export const UI_REGISTRY_PENDING_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS ui_registry_pending_requests (
    id text PRIMARY KEY NOT NULL,
    uid text NOT NULL,
    descriptor_json text NOT NULL,
    locator_json text NOT NULL,
    route text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    reason text NOT NULL DEFAULT '',
    created_at text NOT NULL,
    created_by text NOT NULL,
    resolved_at text NOT NULL DEFAULT ''
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ui_registry_pending_uid_idx ON ui_registry_pending_requests(uid)`,
  `CREATE INDEX IF NOT EXISTS ui_registry_pending_status_idx ON ui_registry_pending_requests(status)`,
] as const;
