import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/core/database/profile/profile.schema.ts',
  out: './src/core/database/profile/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './public/sync_data/sync_sqlite/profile.db',
  },
});
