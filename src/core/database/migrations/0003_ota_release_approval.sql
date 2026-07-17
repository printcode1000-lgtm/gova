CREATE TABLE `ota_release_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`release_id` text NOT NULL,
	`version` text NOT NULL,
	`action` text NOT NULL,
	`actor_uid` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ota_release_audit_release_idx` ON `ota_release_audit` (`release_id`);--> statement-breakpoint
CREATE INDEX `ota_release_audit_created_at_idx` ON `ota_release_audit` (`created_at`);--> statement-breakpoint
CREATE TABLE `ota_releases` (
	`release_id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`manifest_created_at` text NOT NULL,
	`base_url` text NOT NULL,
	`size` integer NOT NULL,
	`file_count` integer NOT NULL,
	`minimum_native_version` text NOT NULL,
	`mandatory` integer DEFAULT false NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`signature` text NOT NULL,
	`manifest_json` text NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`approved_at` text,
	`approved_by_uid` text,
	`revoked_at` text,
	`revoked_by_uid` text,
	`discovered_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ota_releases_version_idx` ON `ota_releases` (`version`);--> statement-breakpoint
CREATE INDEX `ota_releases_approved_idx` ON `ota_releases` (`approved`);