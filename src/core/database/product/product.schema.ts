import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

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

export const productReviews = sqliteTable(
  "product_reviews",
  {
    id: text("id").primaryKey().notNull(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    uid: text("uid").notNull(),
    reviewerName: text("reviewer_name").notNull(),
    reviewerAvatarUrl: text("reviewer_avatar_url"),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    verifiedPurchase: integer("verified_purchase", { mode: "boolean" })
      .notNull()
      .default(false),
    helpfulCount: integer("helpful_count").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("product_reviews_product_idx").on(table.productId, table.createdAt),
    unique("product_reviews_product_uid_unique").on(table.productId, table.uid),
  ],
);

export const productReviewHelpful = sqliteTable(
  "product_review_helpful",
  {
    reviewId: text("review_id")
      .notNull()
      .references(() => productReviews.id, { onDelete: "cascade" }),
    uid: text("uid").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.reviewId, table.uid] })],
);

export const productReviewReplies = sqliteTable("product_review_replies", {
  id: text("id").primaryKey().notNull(),
  reviewId: text("review_id")
    .notNull()
    .unique()
    .references(() => productReviews.id, { onDelete: "cascade" }),
  sellerUid: text("seller_uid").notNull(),
  replyText: text("reply_text").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
