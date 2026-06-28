import 'server-only';

import { eq } from 'drizzle-orm';
import { profileDbClient } from '@/core/database/profile-db-client';
import type { IDatabaseClient } from '@/core/database/database-client.interface';
import { userProfiles } from '@/core/database/profile/profile.schema';
import type { ProfileContactsData } from '../entities/profile-contacts.entity';
import type { ProfileImageKeys, IProfileRepository } from './profile-repository.interface';

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToContacts(row: typeof userProfiles.$inferSelect): ProfileContactsData {
  return {
    phones: parseJson(row.phonesJson, []),
    emails: parseJson(row.emailsJson, []),
    websites: parseJson(row.websitesJson, []),
    socialLinks: parseJson(row.socialLinksJson, []),
  };
}

function parseImageKeys(value: string | null | undefined): string[] {
  if (!value) return [];
  const parsed = parseJson<unknown>(value, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export class ProfileRepository implements IProfileRepository {
  constructor(private database: IDatabaseClient = profileDbClient) {}

  async getByUid(uid: string): Promise<ProfileContactsData | null> {
    const rows = await this.database.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (rows.length === 0) return null;
    return rowToContacts(rows[0]);
  }

  async upsert(uid: string, data: ProfileContactsData): Promise<void> {
    const payload = {
      phonesJson: JSON.stringify(data.phones),
      emailsJson: JSON.stringify(data.emails),
      socialLinksJson: JSON.stringify(data.socialLinks),
      websitesJson: JSON.stringify(data.websites),
    };

    const existing = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (existing.length === 0) {
      await this.database.db.insert(userProfiles).values({
        uid,
        ...payload,
      });
      return;
    }

    await this.database.db.update(userProfiles).set(payload).where(eq(userProfiles.uid, uid));
  }

  async getImageKeys(uid: string): Promise<ProfileImageKeys | null> {
    const rows = await this.database.db
      .select({
        avatarImageKey: userProfiles.avatarImageKey,
        coverImageKey: userProfiles.coverImageKey,
        coverImageKeysJson: userProfiles.coverImageKeysJson,
      })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    if (rows.length === 0) return null;
    const coverImageKeys = parseImageKeys(rows[0].coverImageKeysJson);
    const legacyCoverImageKey = rows[0].coverImageKey ?? null;
    const normalizedCoverImageKeys = coverImageKeys.length > 0
      ? coverImageKeys
      : legacyCoverImageKey
      ? [legacyCoverImageKey]
      : [];

    return {
      avatarImageKey: rows[0].avatarImageKey ?? null,
      coverImageKey: normalizedCoverImageKeys[0] ?? legacyCoverImageKey,
      coverImageKeys: normalizedCoverImageKeys,
    };
  }

  async upsertImageKeys(uid: string, keys: ProfileImageKeys): Promise<void> {
    const existing = await this.database.db
      .select({ uid: userProfiles.uid })
      .from(userProfiles)
      .where(eq(userProfiles.uid, uid))
      .limit(1);

    const payload = {
      avatarImageKey: keys.avatarImageKey,
      coverImageKey: keys.coverImageKeys[0] ?? keys.coverImageKey,
      coverImageKeysJson: JSON.stringify(keys.coverImageKeys.slice(0, 3)),
    };

    if (existing.length === 0) {
      await this.database.db.insert(userProfiles).values({
        uid,
        ...payload,
      });
      return;
    }

    await this.database.db.update(userProfiles).set(payload).where(eq(userProfiles.uid, uid));
  }
}

export const profileRepository = new ProfileRepository();
