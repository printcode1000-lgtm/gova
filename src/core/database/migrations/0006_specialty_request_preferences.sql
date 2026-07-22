CREATE TABLE `user_notification_preferences` (
	`uid` text PRIMARY KEY NOT NULL,
	`specialty_requests_enabled` integer DEFAULT true NOT NULL,
	`updated_at` text NOT NULL
);
