import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'public', 'sync_data', 'sync_sqlite', 'profile.db');
const db = new Database(dbPath);

try {
  // Check if column exists
  const tableInfo = db.prepare("PRAGMA table_info(user_profiles)").all() as any[];
  const columnExists = tableInfo.some((col: any) => col.name === 'location_json');
  
  if (columnExists) {
    console.log('✅ location_json column already exists');
  } else {
    db.exec('ALTER TABLE user_profiles ADD COLUMN location_json text');
    console.log('✅ location_json column added successfully');
  }
  
  db.close();
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to apply migration:', error);
  db.close();
  process.exit(1);
}
