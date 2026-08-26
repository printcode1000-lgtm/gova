import Database from 'better-sqlite3';

export function verifySqliteRuntime(): void {
  const database = new Database(':memory:');
  try {
    database.prepare('select 1').get();
  } finally {
    database.close();
  }
}

if (process.argv[1]?.endsWith('verify-sqlite-runtime.ts')) {
  verifySqliteRuntime();
}
