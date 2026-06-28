import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const userProfiles = sqliteTable('user_profiles', {
  uid: text('uid').primaryKey().notNull(),
  phonesJson: text('phones_json').notNull().default('[]'),
  emailsJson: text('emails_json').notNull().default('[]'),
  socialLinksJson: text('social_links_json').notNull().default('[]'),
  websitesJson: text('websites_json').notNull().default('[]'),
  avatarImageKey: text('avatar_image_key'),
  coverImageKey: text('cover_image_key'),
  coverImageKeysJson: text('cover_image_keys_json').notNull().default('[]'),
});

export type UserProfileRow = typeof userProfiles.$inferSelect;
export type NewUserProfileRow = typeof userProfiles.$inferInsert;
