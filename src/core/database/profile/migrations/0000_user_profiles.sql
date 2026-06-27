CREATE TABLE `user_profiles` (
	`uid` text PRIMARY KEY NOT NULL,
	`phones_json` text DEFAULT '[]' NOT NULL,
	`emails_json` text DEFAULT '[]' NOT NULL,
	`social_links_json` text DEFAULT '[]' NOT NULL,
	`websites_json` text DEFAULT '[]' NOT NULL
);
