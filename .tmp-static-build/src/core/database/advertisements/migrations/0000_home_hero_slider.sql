CREATE TABLE `hero_slider` (
	`id` text PRIMARY KEY NOT NULL,
	`config_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`check_interval_minutes` integer DEFAULT 15 NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text
);
