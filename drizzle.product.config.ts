export default {
  schema: "./src/modules/data-access/core/database/product/product.schema.ts",
  out: "./src/modules/data-access/core/database/product/migrations",
  dialect: "sqlite",
  dbCredentials: { url: "./public/sync_data/sync_sqlite/product.db" },
};
