import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'public', 'sync_data', 'sync_sqlite');
const DB_PATH = path.join(DB_DIR, 'allusers.db');

// Create directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`Created directory: ${DB_DIR}`);
}

// Delete existing database if it exists
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log(`Deleted existing database: ${DB_PATH}`);
}

// Create database
const db = new Database(DB_PATH);
console.log(`Created database: ${DB_PATH}`);

// Create users table
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    password TEXT NOT NULL,
    last_login_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    deleted_at DATETIME
  );
`;

db.exec(createTableSQL);
console.log('Created table: users');

// Create indexes for better performance
db.exec('CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);');
db.exec('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);');
db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
db.exec('CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);');
console.log('Created indexes on uid, phone, email, and deleted_at');

// Close database
db.close();
console.log('Database setup completed successfully!');
