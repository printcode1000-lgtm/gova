export default {
  schema: './src/modules/data-access/core/database/profile/profile.schema.ts',
  out: './src/modules/data-access/core/database/profile/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './public/sync_data/sync_sqlite/profile.db',
  },
};
