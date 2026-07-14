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
  phonesJson: text("phones_json").notNull().default("[]"),
  emailsJson: text("emails_json").notNull().default("[]"),
  socialLinksJson: text("social_links_json").notNull().default("[]"),
  websitesJson: text("websites_json").notNull().default("[]"),
  locationJson: text("location_json"),
  avatarImageKey: text("avatar_image_key"),
  coverImageKey: text("cover_image_key"),
  coverImageKeysJson: text("cover_image_keys_json").notNull().default("[]"),
  storeDetailsJson: text("store_details_json").notNull().default("{}"),
  specialtiesJson: text("specialties_json")
    .notNull()
    .default('{"main":[],"sub":{}}'),
  ratingSettingsJson: text("rating_settings_json")
    .notNull()
    .default('{"enabled":true,"mode":"stars-comments"}'),
  fulfillmentSettingsJson: text("fulfillment_settings_json")
    .notNull()
    .default(
      '{"selfDeliveryEnabled":false,"carrierUids":[],"returns":{"enabled":false,"returnWindowDays":14,"policyText":"","returnShippingPayer":"case_by_case"}}',
    ),
});

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
