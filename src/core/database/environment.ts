import path from 'path';
import { isDevRuntime, isStaticExportBuild, isProvisioningContext } from '@/core/config/runtime-env';

export { isDevRuntime, isStaticExportBuild, isProvisioningContext };

export const SCHEMA_SYNC_REPORT_PATH = path.join(
  process.cwd(),
  'public',
  'sync_data',
  'schema-sync-report.json'
);

export const SQLITE_DIRECTORY = path.join(
  process.cwd(),
  'public',
  'sync_data',
  'sync_sqlite'
);

export const PRIMARY_SQLITE_DB_PATH = path.join(
  SQLITE_DIRECTORY,
  'allusers.db'
);
