-- Account phone numbers become E.164 worldwide.
--
-- Every account created before this migration is an Egyptian mobile stored as
-- `01…` or, for a handful of raw rows, `20…`. Both spell one number, so the
-- rewrite is deterministic and needs no lookup.
UPDATE `users` SET `phone` = '+20' || substr(`phone`, 2) WHERE length(`phone`) = 11 AND substr(`phone`, 1, 1) = '0';--> statement-breakpoint
UPDATE `users` SET `phone` = '+' || `phone` WHERE length(`phone`) = 12 AND substr(`phone`, 1, 2) = '20';
