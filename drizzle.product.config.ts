export default {
  schema: "./packages/data-core/src/core/database/product/product.schema.ts",
  out: "./packages/data-core/src/core/database/product/migrations",
  dialect: "sqlite",
  dbCredentials: { url: "./public/sync_data/sync_sqlite/product.db" },
};
