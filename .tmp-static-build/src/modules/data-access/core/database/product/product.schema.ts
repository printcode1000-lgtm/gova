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
    mainName: text("main_name").notNull().default(""),
    mainBrand: text("main_brand").notNull().default(""),
    mainManufacturer: text("main_manufacturer").notNull().default(""),
    mainAvailable: integer("main_available", { mode: "boolean" })
      .notNull()
      .default(true),
    mainDescription: text("main_description").notNull().default(""),
    priceCurrent: text("price_current").notNull().default(""),
    priceBeforeDiscount: text("price_before_discount").notNull().default(""),
    priceLabel: text("price_label").notNull().default(""),
    priceNeedsCar: integer("price_needs_car", { mode: "boolean" })
      .notNull()
      .default(false),
    specColor: text("spec_color").notNull().default(""),
    specDimensions: text("spec_dimensions").notNull().default(""),
    specCondition: text("spec_condition").notNull().default(""),
    specSize: text("spec_size").notNull().default(""),
    specWeight: text("spec_weight").notNull().default(""),
    specYear: text("spec_year").notNull().default(""),
    vehicleBrand: text("vehicle_brand").notNull().default(""),
    vehicleBodyType: text("vehicle_body_type").notNull().default(""),
    vehicleFuel: text("vehicle_fuel").notNull().default(""),
    vehicleTransmission: text("vehicle_transmission").notNull().default(""),
    vehicleSpecial: text("vehicle_special").notNull().default(""),
    propertyArea: text("property_area").notNull().default(""),
    propertyRooms: text("property_rooms").notNull().default(""),
    propertyBathrooms: text("property_bathrooms").notNull().default(""),
    propertyType: text("property_type").notNull().default(""),
    propertyAddress: text("property_address").notNull().default(""),
    propertyLatitude: text("property_latitude").notNull().default(""),
    propertyLongitude: text("property_longitude").notNull().default(""),
    propertyFinishing: text("property_finishing").notNull().default(""),
    pharmacyCatalogKind: text("pharmacy_catalog_kind").notNull().default(""),
    pharmacyCatalogCategoryId: text("pharmacy_catalog_category_id")
      .notNull()
      .default(""),
    pharmacyCatalogCategoryNameAr: text("pharmacy_catalog_category_name_ar")
      .notNull()
      .default(""),
    pharmacyCatalogCategoryNameEn: text("pharmacy_catalog_category_name_en")
      .notNull()
      .default(""),
    pharmacyCatalogSubcategoryId: text("pharmacy_catalog_subcategory_id")
      .notNull()
      .default(""),
    pharmacyCatalogSubcategoryNameAr: text(
      "pharmacy_catalog_subcategory_name_ar",
    )
      .notNull()
      .default(""),
    pharmacyCatalogSubcategoryNameEn: text(
      "pharmacy_catalog_subcategory_name_en",
    )
      .notNull()
      .default(""),
    pharmacyCatalogFixedProductId: text("pharmacy_catalog_fixed_product_id")
      .notNull()
      .default(""),
    pharmacyCategoryId: text("pharmacy_category_id").notNull().default(""),
    pharmacyCategory: text("pharmacy_category").notNull().default(""),
    pharmacySubcategoryId: text("pharmacy_subcategory_id")
      .notNull()
      .default(""),
    pharmacySubcategory: text("pharmacy_subcategory").notNull().default(""),
    pharmacyActiveIngredientId: text("pharmacy_active_ingredient_id")
      .notNull()
      .default(""),
    pharmacyActiveIngredient: text("pharmacy_active_ingredient")
      .notNull()
      .default(""),
    pharmacyNameAr: text("pharmacy_name_ar").notNull().default(""),
    pharmacyNameEn: text("pharmacy_name_en").notNull().default(""),
    pharmacyFormId: text("pharmacy_form_id").notNull().default(""),
    pharmacyForm: text("pharmacy_form").notNull().default(""),
    pharmacyConcentrationId: text("pharmacy_concentration_id")
      .notNull()
      .default(""),
    pharmacyConcentration: text("pharmacy_concentration")
      .notNull()
      .default(""),
    pharmacyPrescriptionRequired: integer("pharmacy_prescription_required", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    ratingValue: text("rating_value").notNull().default(""),
    ratingComment: text("rating_comment").notNull().default(""),
    ratingEnabled: integer("rating_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    ratingTargetEnabled: integer("rating_target_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    ratingMode: text("rating_mode").notNull().default(""),
    imagesJson: text("images_json").notNull().default("[]"),
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
