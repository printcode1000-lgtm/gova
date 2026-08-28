-- Profile phone search keys become E.164 digits.
--
-- The key is the international digits without the `+`, so a number stored with
-- its national trunk zero (`01…`) or with the country code already stripped
-- (`1…`) both become `20…`. Display values keep the country code the reader
-- expects to see next to them.
UPDATE `user_profiles` SET `primary_phone_normalized` = '20' || substr(`primary_phone_normalized`, 2) WHERE length(`primary_phone_normalized`) = 11 AND substr(`primary_phone_normalized`, 1, 1) = '0';--> statement-breakpoint
UPDATE `user_profiles` SET `primary_phone_normalized` = '20' || `primary_phone_normalized` WHERE length(`primary_phone_normalized`) = 10 AND substr(`primary_phone_normalized`, 1, 1) = '1';--> statement-breakpoint
UPDATE `user_profiles` SET `primary_whatsapp_normalized` = '20' || substr(`primary_whatsapp_normalized`, 2) WHERE length(`primary_whatsapp_normalized`) = 11 AND substr(`primary_whatsapp_normalized`, 1, 1) = '0';--> statement-breakpoint
UPDATE `user_profiles` SET `primary_whatsapp_normalized` = '20' || `primary_whatsapp_normalized` WHERE length(`primary_whatsapp_normalized`) = 10 AND substr(`primary_whatsapp_normalized`, 1, 1) = '1';--> statement-breakpoint
UPDATE `user_profiles` SET `primary_phone` = '+20' || substr(`primary_phone`, 2) WHERE length(`primary_phone`) = 11 AND substr(`primary_phone`, 1, 1) = '0';--> statement-breakpoint
UPDATE `user_profiles` SET `primary_whatsapp` = '+20' || substr(`primary_whatsapp`, 2) WHERE length(`primary_whatsapp`) = 11 AND substr(`primary_whatsapp`, 1, 1) = '0';--> statement-breakpoint
UPDATE `profile_contact_points` SET `normalized_value` = '20' || substr(`normalized_value`, 2) WHERE `type` = 'phone' AND length(`normalized_value`) = 11 AND substr(`normalized_value`, 1, 1) = '0';--> statement-breakpoint
UPDATE `profile_contact_points` SET `normalized_value` = '20' || `normalized_value` WHERE `type` = 'phone' AND length(`normalized_value`) = 10 AND substr(`normalized_value`, 1, 1) = '1';--> statement-breakpoint
UPDATE `profile_contact_points` SET `value` = '+20' || substr(`value`, 2) WHERE `type` = 'phone' AND length(`value`) = 11 AND substr(`value`, 1, 1) = '0';
