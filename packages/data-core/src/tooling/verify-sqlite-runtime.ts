import Database from 'better-sqlite3';

export function verifySqliteRuntime(): void {
  const database = new Database(':memory:');
  try {
    database.prepare('select 1').get();
  } finally {
    database.close();
  }
}
