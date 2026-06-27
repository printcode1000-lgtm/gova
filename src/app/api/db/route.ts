import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { dbClient } from '@/core/database/db-client';
import { getTursoClient } from '@/lib/db/turso';

let migrationsRun = false;

function isDevEnvironment(): boolean {
  return (
    process.env.GOVA_MODE === 'development' ||
    process.env.NODE_ENV === 'development'
  );
}

function ensureMigrations() {
  if (migrationsRun) return;
  try {
    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    const migrationsFolder = path.join(process.cwd(), 'src', 'core', 'database', 'migrations');

    // Run Drizzle migrations on the local database
    migrate(dbClient.db, { migrationsFolder });
    migrationsRun = true;
    console.log('✅ Local SQLite Drizzle migrations applied successfully!');
  } catch (error) {
    console.error('❌ Failed to run local SQLite migrations:', error);
  }
}

async function executeLocalSqlite(sql: string, params: unknown[]): Promise<unknown[]> {
  const dbPath = path.join(process.cwd(), 'public', 'sync_data', 'sync_sqlite', 'allusers.db');
  const db = new Database(dbPath);

  try {
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    }

    const info = stmt.run(...params);
    return [info];
  } finally {
    db.close();
  }
}

async function executeTursoSql(sql: string, params: unknown[]): Promise<unknown[]> {
  const client = getTursoClient();
  const result = await client.execute({ sql, args: params });

  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return result.rows as unknown[];
  }

  return [
    {
      changes: result.rowsAffected,
      lastInsertRowid: result.lastInsertRowid,
    },
  ];
}

export async function POST(request: Request) {
  try {
    const { sql, params = [] } = await request.json();

    const rows = isDevEnvironment()
      ? (ensureMigrations(), await executeLocalSqlite(sql, params))
      : await executeTursoSql(sql, params);

    return NextResponse.json({ rows });
  } catch (error: any) {
    console.error('Database API Route Error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
