UPDATE `users` SET `email` = NULL WHERE `email` IS NOT NULL AND trim(`email`) = '';--> statement-breakpoint
UPDATE `users` SET `email` = lower(trim(`email`)) WHERE `email` IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
