import path from "node:path";

export const JOB_DIR = path.join(process.cwd(), ".backups", "build-jobs");
export const LOCK_PATH = path.join(JOB_DIR, "exclusive.lock");
export const JOB_ID_PATTERN = /^job-\d+-[a-z0-9]{6}$/;
export const JOB_RETENTION = 100;
export const RECORD_RENAME_ATTEMPTS = 5;
export const RECORD_RENAME_RETRY_MS = 20;
export const RECORD_READ_ATTEMPTS = 3;
export const RECORD_READ_RETRY_MS = 15;
export const LOG_CHUNK_BYTES = 256 * 1024;

export function recordPath(jobId: string): string {
  return path.join(JOB_DIR, `${jobId}.json`);
}

export function logPath(jobId: string): string {
  return path.join(JOB_DIR, `${jobId}.log`);
}
