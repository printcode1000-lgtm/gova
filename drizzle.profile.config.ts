export default {
  schema: './packages/data-core/src/core/database/profile/profile.schema.ts',
  out: './packages/data-core/src/core/database/profile/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './public/sync_data/sync_sqlite/profile.db',
  },
};
