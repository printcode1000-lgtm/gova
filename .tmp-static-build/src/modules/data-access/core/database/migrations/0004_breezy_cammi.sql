CREATE TABLE `password_recovery_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`phone_hash` text NOT NULL,
	`uid` text,
	`code_hash` text NOT NULL,
	`reset_token_hash` text,
	`request_ip_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`verified_at` text,
	`consumed_at` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`last_attempt_at` text
);
--> statement-breakpoint
CREATE INDEX `password_recovery_phone_created_idx` ON `password_recovery_challenges` (`phone_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `password_recovery_ip_created_idx` ON `password_recovery_challenges` (`request_ip_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `password_recovery_reset_token_idx` ON `password_recovery_challenges` (`reset_token_hash`);