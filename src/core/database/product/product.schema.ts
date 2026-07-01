import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey().notNull(),
    uid: text("uid").notNull(),
    mainCategoryId: text("main_category_id").notNull(),
    subcategoryId: text("subcategory_id").notNull(),
    dataJson: text("data_json").notNull().default("{}"),
    status: text("status", { enum: ["draft", "active", "archived"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("products_uid_idx").on(table.uid),
    index("products_category_idx").on(
      table.mainCategoryId,
      table.subcategoryId,
    ),
  ],
);
