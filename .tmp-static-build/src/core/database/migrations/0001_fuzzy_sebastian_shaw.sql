CREATE TABLE `user_notification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`platform` text NOT NULL,
	`provider` text NOT NULL,
	`device_id` text NOT NULL,
	`token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_seen_at` text,
	`created_at` text,
	`updated_at` text,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `user_notification_tokens_uid_idx` ON `user_notification_tokens` (`uid`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_notification_tokens_uid_device_unique` ON `user_notification_tokens` (`uid`,`device_id`,`platform`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_notification_tokens_token_unique` ON `user_notification_tokens` (`token`);