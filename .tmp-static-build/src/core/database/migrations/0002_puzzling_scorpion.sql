CREATE TABLE `notification_vapid_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL,
	`subject` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text,
	`updated_at` text
);
