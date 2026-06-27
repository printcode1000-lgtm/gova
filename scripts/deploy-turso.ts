import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load env files
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config({ path: '.env' });
}

const apiToken = process.env.TURSO_API_TOKEN;
const organization = process.env.TURSO_ORGANIZATION;

if (!apiToken || !organization) {
  console.error('❌ Error: TURSO_API_TOKEN or TURSO_ORGANIZATION is missing from .env/.env.local files.');
  process.exit(1);
}

const DB_NAME = 'gova-db';
const LOCAL_DB_PATH = join(process.cwd(), 'public', 'sync_data', 'sync_sqlite', 'allusers.db');

async function main() {
  try {
    console.log(`📡 Fetching groups from Turso for organization: ${organization}...`);
    const groupsResponse = await fetch(`https://api.turso.tech/v1/organizations/${organization}/groups`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!groupsResponse.ok) {
      throw new Error(`Failed to list groups: ${await groupsResponse.text()}`);
    }

    const groupsData = await groupsResponse.json();
    const groups = groupsData.groups || [];
    let groupName = 'default';
    if (groups.length > 0) {
      groupName = groups[0].name;
      console.log(`✅ Found active group: "${groupName}"`);
    } else {
      console.log(`⚠️ No groups found. Fetching available locations from Turso...`);

      const locationsResponse = await fetch('https://api.turso.tech/v1/locations', {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      const locationsData = await locationsResponse.json();
      const locationCode = Object.keys(locationsData.locations || {})[0] || 'iad';
      console.log(`📍 Using location: ${locationCode}`);

      console.log(`🚀 Creating a new "default" group in location "${locationCode}"...`);
      const createGroupResponse = await fetch(`https://api.turso.tech/v1/organizations/${organization}/groups`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'default', location: locationCode }),
      });

      if (!createGroupResponse.ok) {
        throw new Error(`Failed to create group: ${await createGroupResponse.text()}`);
      }
      groupName = 'default';
      console.log(`✅ Group "default" created successfully.`);
    }

    console.log(`📡 Checking if database "${DB_NAME}" already exists...`);
    const dbResponse = await fetch(`https://api.turso.tech/v1/organizations/${organization}/databases`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!dbResponse.ok) {
      throw new Error(`Failed to list databases: ${await dbResponse.text()}`);
    }

    const dbData = await dbResponse.json();
    const databases = dbData.databases || [];
    let database = databases.find((d: any) => d.Name === DB_NAME);
    let dbHostname = '';

    if (database) {
      dbHostname = database.Hostname;
      console.log(`✅ Database "${DB_NAME}" already exists at ${dbHostname}`);
    } else {
      console.log(`🚀 Creating a new Turso database "${DB_NAME}" in group "${groupName}"...`);
      const createResponse = await fetch(`https://api.turso.tech/v1/organizations/${organization}/databases`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: DB_NAME,
          group: groupName,
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create database: ${await createResponse.text()}`);
      }

      const createData = await createResponse.json();
      database = createData.database;
      dbHostname = database.Hostname;
      console.log(`✅ Successfully created database "${DB_NAME}" at ${dbHostname}`);
    }

    const dbUrl = `libsql://${dbHostname}`;

    console.log(`🔑 Generating database authentication token (expiration: never)...`);
    const tokenResponse = await fetch(`https://api.turso.tech/v1/organizations/${organization}/databases/${DB_NAME}/auth/tokens?expiration=never&authorization=full-access`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to generate database token: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();
    const dbAuthToken = tokenData.jwt;
    console.log('✅ Generated database token successfully.');

    // Update local .env and .env.local files
    const updateEnvFile = (filePath: string) => {
      if (!existsSync(filePath)) return;
      console.log(`✏️ Updating environment variables in ${filePath}...`);
      let content = readFileSync(filePath, 'utf8');

      // Update TURSO_DATABASE_URL
      if (content.includes('TURSO_DATABASE_URL=')) {
        content = content.replace(/TURSO_DATABASE_URL=.*/, `TURSO_DATABASE_URL=${dbUrl}`);
      } else {
        content += `\nTURSO_DATABASE_URL=${dbUrl}`;
      }

      // Update TURSO_AUTH_TOKEN
      if (content.includes('TURSO_AUTH_TOKEN=')) {
        content = content.replace(/TURSO_AUTH_TOKEN=.*/, `TURSO_AUTH_TOKEN=${dbAuthToken}`);
      } else {
        content += `\nTURSO_AUTH_TOKEN=${dbAuthToken}`;
      }

      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath}`);
    };

    updateEnvFile('.env');
    updateEnvFile('.env.local');

    // Migrate local data from SQLite to Turso
    console.log(`📦 Checking local SQLite database at: ${LOCAL_DB_PATH}...`);
    if (!existsSync(LOCAL_DB_PATH)) {
      console.log(`⚠️ Local database not found at ${LOCAL_DB_PATH}. Skipping data migration (schema will be created on demand).`);
      return;
    }

    console.log('📂 Reading local SQLite database schemas and records...');
    const localDb = new Database(LOCAL_DB_PATH);
    const tables = localDb.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string; sql: string }>;

    console.log(`🔌 Connecting to Turso Database: ${dbUrl}...`);
    const tursoClient = createClient({
      url: dbUrl,
      authToken: dbAuthToken,
    });

    for (const table of tables) {
      console.log(`🧱 Creating table "${table.name}" on Turso...`);
      // Execute table creation SQL
      await tursoClient.execute(table.sql);

      // Fetch rows from local table
      const rows = localDb.prepare(`SELECT * FROM ${table.name}`).all() as any[];
      if (rows.length === 0) {
        console.log(`ℹ️ Table "${table.name}" has no rows. Skipping row migration.`);
        continue;
      }

      console.log(`📤 Migrating ${rows.length} rows for table "${table.name}"...`);
      const columns = Object.keys(rows[0]).join(', ');
      const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
      const insertSql = `INSERT OR REPLACE INTO ${table.name} (${columns}) VALUES (${placeholders})`;

      for (const row of rows) {
        const args = Object.values(row).map(val => {
          if (val === null) return null;
          return val;
        });
        await tursoClient.execute({ sql: insertSql, args });
      }
      console.log(`✅ Migrated table "${table.name}"`);
    }

    // Migrate indexes
    const indexes = localDb.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all() as Array<{ sql: string }>;
    console.log(`🧱 Recreating ${indexes.length} indexes on Turso...`);
    for (const index of indexes) {
      try {
        await tursoClient.execute(index.sql);
      } catch (err: any) {
        // Index might already exist, ignore errors for existing indexes
        if (!err.message.includes('already exists')) {
          console.warn(`⚠️ Warning: Failed to create index: ${err.message}`);
        }
      }
    }

    localDb.close();
    console.log('🎉 Turso database deployment and data migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during Turso deployment:', error);
    process.exit(1);
  }
}

main();
