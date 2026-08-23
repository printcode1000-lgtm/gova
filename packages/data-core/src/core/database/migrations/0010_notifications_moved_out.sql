--> Notification server state moved to its own database on a separate Turso
--> account (see src/features/data-access/core/database/notifications). Dropping
--> the tables here keeps allusers.db as the schema source of truth for the
--> users database only, so schema sync never recreates them in two places.
DROP TABLE IF EXISTS `user_notification_tokens`;--> statement-breakpoint
DROP TABLE IF EXISTS `user_notification_preferences`;--> statement-breakpoint
DROP TABLE IF EXISTS `notification_vapid_settings`;
