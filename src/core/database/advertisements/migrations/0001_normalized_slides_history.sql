ALTER TABLE `hero_sliders` ADD `revision` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `hero_sliders` ADD `schema_version` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `hero_sliders` ADD `updated_by` text;
--> statement-breakpoint
ALTER TABLE `hero_sliders` ADD `published_by` text;
--> statement-breakpoint

CREATE TABLE `hero_slider_slides` (
  `slider_id` text NOT NULL,
  `stage` text NOT NULL,
  `slide_id` text NOT NULL,
  `priority` integer NOT NULL,
  `image_key` text,
  `image_url` text NOT NULL,
  `title` text NOT NULL,
  `subtitle` text NOT NULL,
  `duration` integer NOT NULL,
  `action` text NOT NULL,
  PRIMARY KEY (`slider_id`, `stage`, `slide_id`)
);
--> statement-breakpoint

CREATE TABLE `hero_slider_publications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `slider_id` text NOT NULL,
  `version` integer NOT NULL,
  `config_json` text NOT NULL,
  `published_by` text NOT NULL,
  `published_at` text NOT NULL
);
--> statement-breakpoint

CREATE TABLE `advertisement_image_cleanup` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `image_key` text NOT NULL,
  `storage_profile_id` text NOT NULL,
  `queued_at` text NOT NULL,
  `delete_after` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL
);
