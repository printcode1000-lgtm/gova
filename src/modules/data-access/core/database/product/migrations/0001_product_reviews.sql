CREATE TABLE `product_reviews` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `uid` text NOT NULL,
  `reviewer_name` text NOT NULL,
  `reviewer_avatar_url` text,
  `rating` integer NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comment` text NOT NULL DEFAULT '',
  `verified_purchase` integer NOT NULL DEFAULT 0 CHECK (`verified_purchase` IN (0, 1)),
  `helpful_count` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade,
  UNIQUE (`product_id`, `uid`)
);--> statement-breakpoint
CREATE INDEX `product_reviews_product_idx` ON `product_reviews` (`product_id`, `created_at`);--> statement-breakpoint
CREATE TABLE `product_review_helpful` (
  `review_id` text NOT NULL,
  `uid` text NOT NULL,
  `created_at` text NOT NULL,
  PRIMARY KEY (`review_id`, `uid`),
  FOREIGN KEY (`review_id`) REFERENCES `product_reviews`(`id`) ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `product_review_replies` (
  `id` text PRIMARY KEY NOT NULL,
  `review_id` text NOT NULL UNIQUE,
  `seller_uid` text NOT NULL,
  `reply_text` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`review_id`) REFERENCES `product_reviews`(`id`) ON DELETE cascade
);
