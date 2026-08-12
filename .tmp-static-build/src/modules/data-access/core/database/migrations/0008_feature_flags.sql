CREATE TABLE `feature_flags` (
	`key` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by_uid` text
);
--> statement-breakpoint
CREATE INDEX `feature_flags_enabled_idx` ON `feature_flags` (`enabled`);
