DELETE FROM `user_notification_tokens`
WHERE `id` IN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `uid`, `platform`
        ORDER BY
          CASE WHEN `enabled` = 1 AND `deleted_at` IS NULL THEN 0 ELSE 1 END,
          COALESCE(`last_seen_at`, `updated_at`, `created_at`, '') DESC,
          `rowid` DESC
      ) AS `duplicate_rank`
    FROM `user_notification_tokens`
  )
  WHERE `duplicate_rank` > 1
);
--> statement-breakpoint
DROP INDEX IF EXISTS `user_notification_tokens_uid_device_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_notification_tokens_uid_platform_unique`
ON `user_notification_tokens` (`uid`, `platform`);
