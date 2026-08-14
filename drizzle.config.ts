export default {
  schema: './src/modules/data-access/core/database/schema.ts',
  out: './src/modules/data-access/core/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './public/sync_data/sync_sqlite/allusers.db',
  },
};
