import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { dbClient } from '@/core/database/db-client';

let migrationsRun = false;

function ensureMigrations() {
  if (migrationsRun) return;
  try {
    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    const path = require('path');
    const migrationsFolder = path.join(process.cwd(), 'src', 'core', 'database', 'migrations');
    
    // Run Drizzle migrations on the local database
    migrate(dbClient.db, { migrationsFolder });
    migrationsRun = true;
    console.log('✅ Local SQLite Drizzle migrations applied successfully!');
  } catch (error) {
    console.error('❌ Failed to run local SQLite migrations:', error);
  }
}

export async function POST(request: Request) {
  try {
    const isDev = 
      process.env.GOVA_MODE === 'development' ||
      process.env.NODE_ENV === 'development';

    // Security check: Only allow local database execution in development
    if (!isDev) {
      return new NextResponse('Unauthorized: Local SQLite execution is only allowed in development mode', { status: 403 });
    }

    // Apply migrations on first request
    ensureMigrations();

    const { sql, params = [] } = await request.json();

    const dbPath = path.join(process.cwd(), 'public', 'sync_data', 'sync_sqlite', 'allusers.db');
    const db = new Database(dbPath);

    let rows: any[] = [];
    try {
      const stmt = db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        rows = stmt.all(...params);
      } else {
        const info = stmt.run(...params);
        rows = [info];
      }
    } finally {
      db.close();
    }

    return NextResponse.json({ rows });
  } catch (error: any) {
    console.error('Local SQLite API Route Error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
