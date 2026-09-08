import path from 'node:path';

/**
 * Where a schema-sync report is written, and where the browser can read it.
 *
 * Provisioning owns this, not a development-tooling package: the report
 * describes a cloud database's schema and is produced by a release step, so its
 * location is a provisioning fact. It happens to be written under `public/` so
 * the super-admin surfaces can fetch it, which is a serving decision — not
 * evidence of any local application data.
 */

const REPORT_DIRECTORY_SEGMENT = 'public/sync_data';

/** Report for the `users` database, kept at its historical path. */
export const SCHEMA_SYNC_REPORT_PATH = path.join(
  process.cwd(),
  REPORT_DIRECTORY_SEGMENT,
  'schema-sync-report.json',
);

export function schemaSyncReportPathFor(databaseLabel: string): string {
  const fileName =
    databaseLabel === 'users'
      ? 'schema-sync-report.json'
      : `${databaseLabel}-schema-sync-report.json`;
  return path.join(process.cwd(), REPORT_DIRECTORY_SEGMENT, fileName);
}
