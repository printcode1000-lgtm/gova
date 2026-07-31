PRAGMA foreign_keys=off;
--> statement-breakpoint
CREATE TABLE `user_profiles_structured` (
  `uid` text PRIMARY KEY NOT NULL,
  `store_name` text NOT NULL DEFAULT '',
  `store_description` text NOT NULL DEFAULT '',
  `store_story` text NOT NULL DEFAULT '',
  `store_name_search` text NOT NULL DEFAULT '',
  `store_description_search` text NOT NULL DEFAULT '',
  `custom_request_enabled` integer NOT NULL DEFAULT 1,
  `trending_label` text NOT NULL DEFAULT 'الأكثر رواجًا',
  `primary_phone` text NOT NULL DEFAULT '',
  `primary_phone_normalized` text NOT NULL DEFAULT '',
  `primary_whatsapp` text NOT NULL DEFAULT '',
  `primary_whatsapp_normalized` text NOT NULL DEFAULT '',
  `primary_email` text NOT NULL DEFAULT '',
  `primary_address` text NOT NULL DEFAULT '',
  `primary_governorate` text NOT NULL DEFAULT '',
  `primary_city` text NOT NULL DEFAULT '',
  `primary_area` text NOT NULL DEFAULT '',
  `primary_latitude` text NOT NULL DEFAULT '',
  `primary_longitude` text NOT NULL DEFAULT '',
  `rating_enabled` integer NOT NULL DEFAULT 1,
  `rating_mode` text NOT NULL DEFAULT 'stars-comments',
  `rating_average` integer NOT NULL DEFAULT 0,
  `rating_count` integer NOT NULL DEFAULT 0,
  `shipping_pricing_mode` text NOT NULL DEFAULT 'free',
  `shipping_flat_rate` integer NOT NULL DEFAULT 0,
  `shipping_location_base_rate` integer NOT NULL DEFAULT 0,
  `shipping_special_vehicle_fee` integer NOT NULL DEFAULT 0,
  `shipping_free_shipping_threshold` integer NOT NULL DEFAULT 0,
  `shipping_notes` text NOT NULL DEFAULT '',
  `returns_enabled` integer NOT NULL DEFAULT 0,
  `return_window_days` integer NOT NULL DEFAULT 14,
  `return_shipping_payer` text NOT NULL DEFAULT 'case_by_case',
  `return_policy_text` text NOT NULL DEFAULT ''
);
--> statement-breakpoint
INSERT INTO `user_profiles_structured` (
  uid,
  store_name,
  store_description,
  store_story,
  store_name_search,
  store_description_search,
  custom_request_enabled,
  trending_label,
  primary_phone,
  primary_phone_normalized,
  primary_whatsapp,
  primary_whatsapp_normalized,
  primary_email,
  primary_address,
  primary_latitude,
  primary_longitude,
  rating_enabled,
  rating_mode,
  shipping_pricing_mode,
  shipping_flat_rate,
  shipping_location_base_rate,
  shipping_special_vehicle_fee,
  shipping_free_shipping_threshold,
  shipping_notes,
  returns_enabled,
  return_window_days,
  return_shipping_payer,
  return_policy_text
)
SELECT
  uid,
  COALESCE(json_extract(store_details_json, '$.storeName'), ''),
  COALESCE(json_extract(store_details_json, '$.storeDescription'), ''),
  COALESCE(json_extract(store_details_json, '$.storeStory'), ''),
  lower(COALESCE(json_extract(store_details_json, '$.storeName'), '')),
  lower(COALESCE(json_extract(store_details_json, '$.storeDescription'), '')),
  COALESCE(json_extract(store_details_json, '$.profileShowcase.customRequestEnabled'), 1),
  COALESCE(json_extract(store_details_json, '$.profileShowcase.trending.label'), 'الأكثر رواجًا'),
  COALESCE(json_extract(phones_json, '$[0].number'), ''),
  replace(replace(replace(replace(COALESCE(json_extract(phones_json, '$[0].number'), ''), '+', ''), ' ', ''), '-', ''), '(', ''),
  COALESCE(json_extract(phones_json, '$[0].number'), ''),
  replace(replace(replace(replace(COALESCE(json_extract(phones_json, '$[0].number'), ''), '+', ''), ' ', ''), '-', ''), '(', ''),
  COALESCE(json_extract(emails_json, '$[0].email'), ''),
  COALESCE(json_extract(location_json, '$[0].address'), ''),
  COALESCE(json_extract(location_json, '$[0].latitude'), ''),
  COALESCE(json_extract(location_json, '$[0].longitude'), ''),
  COALESCE(json_extract(rating_settings_json, '$.enabled'), 1),
  COALESCE(json_extract(rating_settings_json, '$.mode'), 'stars-comments'),
  COALESCE(json_extract(fulfillment_settings_json, '$.shippingPricing.mode'), 'free'),
  COALESCE(json_extract(fulfillment_settings_json, '$.shippingPricing.flatRate'), 0),
  COALESCE(json_extract(fulfillment_settings_json, '$.shippingPricing.locationBaseRate'), 0),
  COALESCE(json_extract(fulfillment_settings_json, '$.shippingPricing.specialVehicleFee'), 0),
  COALESCE(json_extract(fulfillment_settings_json, '$.shippingPricing.freeShippingThreshold'), 0),
  COALESCE(json_extract(fulfillment_settings_json, '$.shippingPricing.notes'), ''),
  COALESCE(json_extract(fulfillment_settings_json, '$.returns.enabled'), 0),
  COALESCE(json_extract(fulfillment_settings_json, '$.returns.returnWindowDays'), 14),
  COALESCE(json_extract(fulfillment_settings_json, '$.returns.returnShippingPayer'), 'case_by_case'),
  COALESCE(json_extract(fulfillment_settings_json, '$.returns.policyText'), '')
FROM `user_profiles`;
--> statement-breakpoint
DROP TABLE `user_profiles`;
--> statement-breakpoint
ALTER TABLE `user_profiles_structured` RENAME TO `user_profiles`;
--> statement-breakpoint
CREATE INDEX `user_profiles_store_name_search_idx` ON `user_profiles` (`store_name_search`);
--> statement-breakpoint
CREATE INDEX `user_profiles_primary_phone_idx` ON `user_profiles` (`primary_phone_normalized`);
--> statement-breakpoint
CREATE INDEX `user_profiles_primary_location_idx` ON `user_profiles` (`primary_latitude`, `primary_longitude`);
--> statement-breakpoint
CREATE TABLE `profile_contact_points` (
  `id` text PRIMARY KEY NOT NULL,
  `uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade,
  `type` text NOT NULL,
  `platform` text NOT NULL DEFAULT '',
  `label` text NOT NULL DEFAULT '',
  `value` text NOT NULL,
  `normalized_value` text NOT NULL DEFAULT '',
  `handle` text NOT NULL DEFAULT '',
  `is_primary` integer NOT NULL DEFAULT 0,
  `is_public` integer NOT NULL DEFAULT 1,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profile_contact_points_uid_idx` ON `profile_contact_points` (`uid`);
--> statement-breakpoint
CREATE INDEX `profile_contact_points_lookup_idx` ON `profile_contact_points` (`type`, `normalized_value`);
--> statement-breakpoint
CREATE TABLE `profile_locations` (
  `id` text PRIMARY KEY NOT NULL,
  `uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade,
  `label` text NOT NULL DEFAULT '',
  `address` text NOT NULL DEFAULT '',
  `governorate` text NOT NULL DEFAULT '',
  `city` text NOT NULL DEFAULT '',
  `area` text NOT NULL DEFAULT '',
  `latitude` text NOT NULL DEFAULT '',
  `longitude` text NOT NULL DEFAULT '',
  `is_primary` integer NOT NULL DEFAULT 0,
  `is_public` integer NOT NULL DEFAULT 1,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profile_locations_uid_idx` ON `profile_locations` (`uid`);
--> statement-breakpoint
CREATE INDEX `profile_locations_geo_idx` ON `profile_locations` (`latitude`, `longitude`);
--> statement-breakpoint
CREATE TABLE `profile_images` (
  `id` text PRIMARY KEY NOT NULL,
  `uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade,
  `image_key` text NOT NULL,
  `image_type` text NOT NULL,
  `is_primary` integer NOT NULL DEFAULT 0,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profile_images_uid_type_idx` ON `profile_images` (`uid`, `image_type`);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_images_uid_key_unique` ON `profile_images` (`uid`, `image_key`, `image_type`);
--> statement-breakpoint
CREATE TABLE `profile_featured_products` (`uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade, `product_id` text NOT NULL, `sort_order` integer NOT NULL DEFAULT 0, `created_at` text NOT NULL, PRIMARY KEY(`uid`, `product_id`));
--> statement-breakpoint
CREATE TABLE `profile_trending_items` (`id` text PRIMARY KEY NOT NULL, `uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade, `label` text NOT NULL, `sort_order` integer NOT NULL DEFAULT 0, `created_at` text NOT NULL, `updated_at` text NOT NULL);
--> statement-breakpoint
CREATE INDEX `profile_trending_items_uid_idx` ON `profile_trending_items` (`uid`);
--> statement-breakpoint
CREATE TABLE `profile_working_hours` (`id` text PRIMARY KEY NOT NULL, `uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade, `day_of_week` integer NOT NULL, `period_index` integer NOT NULL DEFAULT 0, `is_open` integer NOT NULL DEFAULT 0, `open_time` text NOT NULL DEFAULT '', `close_time` text NOT NULL DEFAULT '', `note` text NOT NULL DEFAULT '', `created_at` text NOT NULL, `updated_at` text NOT NULL);
--> statement-breakpoint
CREATE INDEX `profile_working_hours_uid_idx` ON `profile_working_hours` (`uid`);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_working_hours_period_unique` ON `profile_working_hours` (`uid`, `day_of_week`, `period_index`);
--> statement-breakpoint
CREATE TABLE `profile_delivery_carriers` (`seller_uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade, `carrier_uid` text NOT NULL, `is_default` integer NOT NULL DEFAULT 0, `priority` integer NOT NULL DEFAULT 0, `created_at` text NOT NULL, `updated_at` text NOT NULL, PRIMARY KEY(`seller_uid`, `carrier_uid`));
--> statement-breakpoint
CREATE INDEX `profile_delivery_carriers_carrier_idx` ON `profile_delivery_carriers` (`carrier_uid`);
--> statement-breakpoint
CREATE TABLE `profile_search_categories` (`uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade, `category_id` integer NOT NULL, `subcategory_id` integer NOT NULL, `specialty_column` text NOT NULL, `source` text NOT NULL DEFAULT 'profile', `is_enabled` integer NOT NULL DEFAULT 1, `updated_at` text NOT NULL, PRIMARY KEY(`uid`, `category_id`, `subcategory_id`, `source`));
--> statement-breakpoint
CREATE INDEX `profile_search_categories_lookup_idx` ON `profile_search_categories` (`category_id`, `subcategory_id`, `is_enabled`);
--> statement-breakpoint
CREATE TABLE `profile_category_product_counts` (`uid` text NOT NULL REFERENCES `user_profiles`(`uid`) ON DELETE cascade, `category_id` text NOT NULL, `subcategory_id` text NOT NULL, `active_product_count` integer NOT NULL DEFAULT 0, `draft_product_count` integer NOT NULL DEFAULT 0, `archived_product_count` integer NOT NULL DEFAULT 0, `updated_at` text NOT NULL, PRIMARY KEY(`uid`, `category_id`, `subcategory_id`));
--> statement-breakpoint
CREATE INDEX `profile_category_product_counts_lookup_idx` ON `profile_category_product_counts` (`category_id`, `subcategory_id`);
--> statement-breakpoint
PRAGMA foreign_keys=on;
