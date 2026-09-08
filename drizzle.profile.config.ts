/**
 * drizzle-kit configuration for generating migration SQL from the schema file.
 *
 * `dbCredentials` is required by drizzle-kit's sqlite dialect but is never read
 * by `generate`, which compares the schema declaration with the migration
 * journal and touches no database. It points at `:memory:` because there is no
 * local database to point at: server application data is Turso in every runtime,
 * and a `drizzle-kit push` against a throwaway in-memory file is precisely the
 * no-op it should be. Schema reaches Turso through the desired-schema manifests
 * and `npm run db:schema:sync:release`.
 */
export default {
  schema: './packages/data-core/src/core/database/profile/profile.schema.ts',
  out: './packages/data-core/src/core/database/profile/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: ':memory:',
  },
};
