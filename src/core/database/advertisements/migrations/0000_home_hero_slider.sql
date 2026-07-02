CREATE TABLE `hero_sliders` (
	`id` text PRIMARY KEY NOT NULL,
	`draft_json` text NOT NULL,
	`published_json` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`check_interval_minutes` integer DEFAULT 15 NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text NOT NULL
);
