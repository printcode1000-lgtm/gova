import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const heroSlider = sqliteTable("hero_slider", {
  id: text("id").primaryKey().notNull(),
  configJson: text("config_json").notNull(),
  version: integer("version").notNull().default(1),
  checkIntervalMinutes: integer("check_interval_minutes").notNull().default(15),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by"),
});
