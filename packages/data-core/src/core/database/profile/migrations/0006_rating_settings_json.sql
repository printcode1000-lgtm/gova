ALTER TABLE `user_profiles` ADD COLUMN `rating_settings_json` text NOT NULL DEFAULT '{"enabled":true,"mode":"stars-comments"}';
