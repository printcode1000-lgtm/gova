import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const heroSliders = sqliteTable("hero_sliders", {
  id: text("id").primaryKey().notNull(),
  draftJson: text("draft_json").notNull(),
  publishedJson: text("published_json").notNull(),
  status: text("status").notNull().default("published"),
  version: integer("version").notNull().default(1),
  revision: integer("revision").notNull().default(1),
  schemaVersion: integer("schema_version").notNull().default(1),
  checkIntervalMinutes: integer("check_interval_minutes").notNull().default(15),
  updatedBy: text("updated_by"),
  publishedBy: text("published_by"),
  updatedAt: text("updated_at").notNull(),
  publishedAt: text("published_at").notNull(),
});

export const heroSliderSlides = sqliteTable(
  "hero_slider_slides",
  {
    sliderId: text("slider_id").notNull(),
    stage: text("stage").notNull(),
    slideId: text("slide_id").notNull(),
    priority: integer("priority").notNull(),
    imageKey: text("image_key"),
    imageUrl: text("image_url").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull(),
    duration: integer("duration").notNull(),
    action: text("action").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sliderId, table.stage, table.slideId] }),
  ],
);

export const heroSliderPublications = sqliteTable("hero_slider_publications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sliderId: text("slider_id").notNull(),
  version: integer("version").notNull(),
  configJson: text("config_json").notNull(),
  publishedBy: text("published_by").notNull(),
  publishedAt: text("published_at").notNull(),
});

export const advertisementImageCleanup = sqliteTable(
  "advertisement_image_cleanup",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    imageKey: text("image_key").notNull(),
    storageProfileId: text("storage_profile_id").notNull(),
    queuedAt: text("queued_at").notNull(),
    deleteAfter: text("delete_after").notNull(),
    status: text("status").notNull().default("pending"),
  },
);
