import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/core/database/product/product.schema.ts",
  out: "./src/core/database/product/migrations",
  dialect: "sqlite",
  dbCredentials: { url: "./public/sync_data/sync_sqlite/product.db" },
});
