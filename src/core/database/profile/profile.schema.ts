import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

export const userProfiles = sqliteTable("user_profiles", {
  uid: text("uid").primaryKey().notNull(),
  storeName: text("store_name").notNull().default(""),
  storeDescription: text("store_description").notNull().default(""),
  storeStory: text("store_story").notNull().default(""),
  storeNameSearch: text("store_name_search").notNull().default(""),
  storeDescriptionSearch: text("store_description_search").notNull().default(""),
  customRequestEnabled: integer("custom_request_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  trendingLabel: text("trending_label").notNull().default("الأكثر رواجًا"),
  primaryPhone: text("primary_phone").notNull().default(""),
  primaryPhoneNormalized: text("primary_phone_normalized").notNull().default(""),
  primaryWhatsapp: text("primary_whatsapp").notNull().default(""),
  primaryWhatsappNormalized: text("primary_whatsapp_normalized").notNull().default(""),
  primaryEmail: text("primary_email").notNull().default(""),
  primaryAddress: text("primary_address").notNull().default(""),
  primaryGovernorate: text("primary_governorate").notNull().default(""),
  primaryCity: text("primary_city").notNull().default(""),
  primaryArea: text("primary_area").notNull().default(""),
  primaryLatitude: text("primary_latitude").notNull().default(""),
  primaryLongitude: text("primary_longitude").notNull().default(""),
  ratingEnabled: integer("rating_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  ratingMode: text("rating_mode").notNull().default("stars-comments"),
  ratingAverage: integer("rating_average").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  shippingPricingMode: text("shipping_pricing_mode").notNull().default("free"),
  shippingFlatRate: integer("shipping_flat_rate").notNull().default(0),
  shippingLocationBaseRate: integer("shipping_location_base_rate").notNull().default(0),
  shippingSpecialVehicleFee: integer("shipping_special_vehicle_fee").notNull().default(0),
  shippingFreeShippingThreshold: integer("shipping_free_shipping_threshold")
    .notNull()
    .default(0),
  shippingNotes: text("shipping_notes").notNull().default(""),
  returnsEnabled: integer("returns_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  returnWindowDays: integer("return_window_days").notNull().default(14),
  returnShippingPayer: text("return_shipping_payer").notNull().default("case_by_case"),
  returnPolicyText: text("return_policy_text").notNull().default(""),
}, (table) => [
  index("user_profiles_store_name_search_idx").on(table.storeNameSearch),
  index("user_profiles_primary_phone_idx").on(table.primaryPhoneNormalized),
  index("user_profiles_primary_location_idx").on(table.primaryLatitude, table.primaryLongitude),
]);

export const profileContactPoints = sqliteTable(
  "profile_contact_points",
  {
    id: text("id").primaryKey().notNull(),
    uid: text("uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    type: text("type").notNull(),
    platform: text("platform").notNull().default(""),
    label: text("label").notNull().default(""),
    value: text("value").notNull(),
    normalizedValue: text("normalized_value").notNull().default(""),
    handle: text("handle").notNull().default(""),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("profile_contact_points_uid_idx").on(table.uid),
    index("profile_contact_points_lookup_idx").on(table.type, table.normalizedValue),
  ],
);

export const profileLocations = sqliteTable(
  "profile_locations",
  {
    id: text("id").primaryKey().notNull(),
    uid: text("uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    label: text("label").notNull().default(""),
    address: text("address").notNull().default(""),
    governorate: text("governorate").notNull().default(""),
    city: text("city").notNull().default(""),
    area: text("area").notNull().default(""),
    latitude: text("latitude").notNull().default(""),
    longitude: text("longitude").notNull().default(""),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("profile_locations_uid_idx").on(table.uid),
    index("profile_locations_geo_idx").on(table.latitude, table.longitude),
  ],
);

export const profileImages = sqliteTable(
  "profile_images",
  {
    id: text("id").primaryKey().notNull(),
    uid: text("uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    imageKey: text("image_key").notNull(),
    imageType: text("image_type").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("profile_images_uid_type_idx").on(table.uid, table.imageType),
    unique("profile_images_uid_key_unique").on(table.uid, table.imageKey, table.imageType),
  ],
);

export const profileFeaturedProducts = sqliteTable(
  "profile_featured_products",
  {
    uid: text("uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.uid, table.productId] })],
);

export const profileTrendingItems = sqliteTable(
  "profile_trending_items",
  {
    id: text("id").primaryKey().notNull(),
    uid: text("uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("profile_trending_items_uid_idx").on(table.uid)],
);

export const profileWorkingHours = sqliteTable(
  "profile_working_hours",
  {
    id: text("id").primaryKey().notNull(),
    uid: text("uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    periodIndex: integer("period_index").notNull().default(0),
    isOpen: integer("is_open", { mode: "boolean" }).notNull().default(false),
    openTime: text("open_time").notNull().default(""),
    closeTime: text("close_time").notNull().default(""),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("profile_working_hours_uid_idx").on(table.uid),
    unique("profile_working_hours_period_unique").on(table.uid, table.dayOfWeek, table.periodIndex),
  ],
);

export const profileDeliveryCarriers = sqliteTable(
  "profile_delivery_carriers",
  {
    sellerUid: text("seller_uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    carrierUid: text("carrier_uid").notNull(),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    priority: integer("priority").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sellerUid, table.carrierUid] }),
    index("profile_delivery_carriers_carrier_idx").on(table.carrierUid),
  ],
);

export const profileSearchCategories = sqliteTable(
  "profile_search_categories",
  {
    uid: text("uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    categoryId: integer("category_id").notNull(),
    subcategoryId: integer("subcategory_id").notNull(),
    specialtyColumn: text("specialty_column").notNull(),
    source: text("source").notNull().default("profile"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.uid, table.categoryId, table.subcategoryId, table.source] }),
    index("profile_search_categories_lookup_idx").on(table.categoryId, table.subcategoryId, table.isEnabled),
  ],
);

export const profileCategoryProductCounts = sqliteTable(
  "profile_category_product_counts",
  {
    uid: text("uid")
      .notNull()
      .references(() => userProfiles.uid, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull(),
    subcategoryId: text("subcategory_id").notNull(),
    activeProductCount: integer("active_product_count").notNull().default(0),
    draftProductCount: integer("draft_product_count").notNull().default(0),
    archivedProductCount: integer("archived_product_count").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.uid, table.categoryId, table.subcategoryId] }),
    index("profile_category_product_counts_lookup_idx").on(table.categoryId, table.subcategoryId),
  ],
);

export const profileReviews = sqliteTable(
  "profile_reviews",
  {
    id: text("id").primaryKey().notNull(),
    targetUid: text("target_uid").notNull(),
    uid: text("uid").notNull(),
    reviewerName: text("reviewer_name").notNull(),
    reviewerAvatarUrl: text("reviewer_avatar_url"),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    helpfulCount: integer("helpful_count").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("profile_reviews_target_idx").on(table.targetUid, table.createdAt),
    unique("profile_reviews_target_uid_unique").on(table.targetUid, table.uid),
  ],
);

export const profileReviewHelpful = sqliteTable(
  "profile_review_helpful",
  {
    reviewId: text("review_id")
      .notNull()
      .references(() => profileReviews.id, { onDelete: "cascade" }),
    uid: text("uid").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.reviewId, table.uid] })],
);

export const profileReviewReplies = sqliteTable("profile_review_replies", {
  id: text("id").primaryKey().notNull(),
  reviewId: text("review_id")
    .notNull()
    .unique()
    .references(() => profileReviews.id, { onDelete: "cascade" }),
  sellerUid: text("seller_uid").notNull(),
  replyText: text("reply_text").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const follows = sqliteTable(
  "follows",
  {
    id: text("id").primaryKey().notNull(),
    followerUid: text("follower_uid").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetOwnerUid: text("target_owner_uid").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("follows_follower_idx").on(table.followerUid, table.targetType),
    index("follows_target_idx").on(table.targetType, table.targetId),
    index("follows_target_owner_idx").on(table.targetOwnerUid, table.targetType),
    unique("follows_unique_target").on(
      table.followerUid,
      table.targetType,
      table.targetId,
    ),
  ],
);

export type UserProfileRow = typeof userProfiles.$inferSelect;
export type NewUserProfileRow = typeof userProfiles.$inferInsert;
export type FollowRow = typeof follows.$inferSelect;
export type NewFollowRow = typeof follows.$inferInsert;
export type ProfileContactPointRow = typeof profileContactPoints.$inferSelect;
export type ProfileLocationRow = typeof profileLocations.$inferSelect;
export type ProfileImageRow = typeof profileImages.$inferSelect;
export type ProfileDeliveryCarrierRow = typeof profileDeliveryCarriers.$inferSelect;
export type ProfileSearchCategoryRow = typeof profileSearchCategories.$inferSelect;
export type ProfileCategoryProductCountRow = typeof profileCategoryProductCounts.$inferSelect;
export type ProfileFeaturedProductRow = typeof profileFeaturedProducts.$inferSelect;
export type ProfileTrendingItemRow = typeof profileTrendingItems.$inferSelect;
export type ProfileWorkingHourRow = typeof profileWorkingHours.$inferSelect;
