CREATE TABLE `pharmacy_profile_category_overrides` (
  `id` text PRIMARY KEY NOT NULL,
  `uid` text NOT NULL,
  `fixed_category_id` integer,
  `name_ar` text,
  `name_en` text,
  `icon` text,
  `status` text NOT NULL DEFAULT 'visible' CHECK (`status` IN ('visible', 'hidden', 'custom')),
  `sort_order` integer,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `pharmacy_profile_category_uid_idx` ON `pharmacy_profile_category_overrides` (`uid`);--> statement-breakpoint
CREATE UNIQUE INDEX `pharmacy_profile_category_fixed_uid_idx` ON `pharmacy_profile_category_overrides` (`uid`, `fixed_category_id`) WHERE `fixed_category_id` IS NOT NULL;--> statement-breakpoint

CREATE TABLE `pharmacy_profile_subcategory_overrides` (
  `id` text PRIMARY KEY NOT NULL,
  `uid` text NOT NULL,
  `fixed_subcategory_id` integer,
  `parent_category_id` text NOT NULL,
  `name_ar` text,
  `name_en` text,
  `status` text NOT NULL DEFAULT 'visible' CHECK (`status` IN ('visible', 'hidden', 'custom')),
  `sort_order` integer,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `pharmacy_profile_subcategory_uid_idx` ON `pharmacy_profile_subcategory_overrides` (`uid`);--> statement-breakpoint
CREATE UNIQUE INDEX `pharmacy_profile_subcategory_fixed_uid_idx` ON `pharmacy_profile_subcategory_overrides` (`uid`, `fixed_subcategory_id`) WHERE `fixed_subcategory_id` IS NOT NULL;--> statement-breakpoint

CREATE TABLE `pharmacy_profile_product_overrides` (
  `id` text PRIMARY KEY NOT NULL,
  `uid` text NOT NULL,
  `fixed_product_id` integer,
  `parent_subcategory_id` text NOT NULL,
  `name_ar` text,
  `name_en` text,
  `description` text,
  `image_url` text,
  `image_key` text,
  `form_id` text,
  `form_name_ar` text,
  `strength_id` text,
  `strength_value` text,
  `prescription_required` integer,
  `price_text` text,
  `price_minor` integer,
  `status` text NOT NULL DEFAULT 'visible' CHECK (`status` IN ('visible', 'hidden', 'custom')),
  `sort_order` integer,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `pharmacy_profile_product_uid_idx` ON `pharmacy_profile_product_overrides` (`uid`);--> statement-breakpoint
CREATE UNIQUE INDEX `pharmacy_profile_product_fixed_uid_idx` ON `pharmacy_profile_product_overrides` (`uid`, `fixed_product_id`) WHERE `fixed_product_id` IS NOT NULL;
