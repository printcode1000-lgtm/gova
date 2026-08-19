CREATE TABLE `follows` (
  `id` text PRIMARY KEY NOT NULL,
  `follower_uid` text NOT NULL,
  `target_type` text NOT NULL,
  `target_id` text NOT NULL,
  `target_owner_uid` text NOT NULL DEFAULT '',
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `follows_follower_idx` ON `follows` (`follower_uid`, `target_type`);
--> statement-breakpoint
CREATE INDEX `follows_target_idx` ON `follows` (`target_type`, `target_id`);
--> statement-breakpoint
CREATE INDEX `follows_target_owner_idx` ON `follows` (`target_owner_uid`, `target_type`);
--> statement-breakpoint
CREATE UNIQUE INDEX `follows_unique_target` ON `follows` (`follower_uid`, `target_type`, `target_id`);
