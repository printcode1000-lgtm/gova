export default {
  schema: './packages/data-core/src/core/database/schema.ts',
  out: './packages/data-core/src/core/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './public/sync_data/sync_sqlite/allusers.db',
  },
};
