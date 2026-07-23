import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/database/schema.ts',
  out: './src/core/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './public/sync_data/sync_sqlite/allusers.db',
  },
});
