import { queryTurso, executeTurso } from '@/lib/db/turso';

async function setupTursoDatabase() {
  console.log('Setting up Turso database...');

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

  await executeTurso(createTableSQL);
  console.log('Created table: users');

  // Create indexes for better performance
  await executeTurso('CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);');
  await executeTurso('CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);');
  await executeTurso('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
  await executeTurso('CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);');
  console.log('Created indexes on uid, phone, email, and deleted_at');

  console.log('Turso database setup completed successfully!');
}

setupTursoDatabase().catch(console.error);
