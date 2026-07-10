CREATE TABLE `profile_reviews` (
  `id` text PRIMARY KEY NOT NULL,
  `target_uid` text NOT NULL,
  `uid` text NOT NULL,
  `reviewer_name` text NOT NULL,
  `reviewer_avatar_url` text,
  `rating` integer NOT NULL,
  `comment` text NOT NULL DEFAULT '',
  `helpful_count` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `profile_reviews_target_idx` ON `profile_reviews` (`target_uid`, `created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_reviews_target_uid_unique` ON `profile_reviews` (`target_uid`, `uid`);
--> statement-breakpoint
CREATE TABLE `profile_review_helpful` (
  `review_id` text NOT NULL,
  `uid` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`review_id`, `uid`),
  FOREIGN KEY (`review_id`) REFERENCES `profile_reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profile_review_replies` (
  `id` text PRIMARY KEY NOT NULL,
  `review_id` text NOT NULL UNIQUE,
  `seller_uid` text NOT NULL,
  `reply_text` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`review_id`) REFERENCES `profile_reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
