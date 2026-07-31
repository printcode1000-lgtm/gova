CREATE TABLE `featured_marquee` (
	`id` text PRIMARY KEY NOT NULL,
	`product_ids_json` text DEFAULT '[]' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text
);
