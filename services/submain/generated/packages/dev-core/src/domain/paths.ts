/** Relative path segments from the repository root — no `node:path` joins here. */

export const LOCAL_SYNC_DATA_SEGMENT = "public/sync_data" as const;

export const LOCAL_SQLITE_SEGMENT = `${LOCAL_SYNC_DATA_SEGMENT}/sync_sqlite` as const;

export const LOCAL_SYNC_FILE_SEGMENT = `${LOCAL_SYNC_DATA_SEGMENT}/sync_file` as const;

export const LOCAL_IMAGES_SEGMENT = `${LOCAL_SYNC_FILE_SEGMENT}/images` as const;

export const SCHEMA_SYNC_REPORT_SEGMENT = `${LOCAL_SYNC_DATA_SEGMENT}/schema-sync-report.json` as const;

/** URL prefix served by Next.js for local image files. */
export const LOCAL_SYNC_FILE_PUBLIC_PREFIX = "/sync_data/sync_file" as const;
