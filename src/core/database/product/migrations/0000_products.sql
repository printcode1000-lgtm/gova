CREATE TABLE `products` (
  `id` text PRIMARY KEY NOT NULL,
  `uid` text NOT NULL,
  `main_category_id` text NOT NULL,
  `subcategory_id` text NOT NULL,
  `data_json` text NOT NULL DEFAULT '{}',
  `status` text NOT NULL DEFAULT 'active' CHECK (`status` IN ('draft', 'active', 'archived')),
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);--> statement-breakpoint
CREATE INDEX `products_uid_idx` ON `products` (`uid`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`main_category_id`, `subcategory_id`);
