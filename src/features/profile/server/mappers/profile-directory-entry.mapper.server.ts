import type { ProfileDirectoryEntry as ProfileDirectoryBase } from "@asol/data-core/profile/entities";
import type { ProfileDirectoryEntry } from "../../domain/profile-directory-entry.entity";

/** Map the canonical profile DTO to the enriched transport DTO explicitly. */
export function toProfileDirectoryEntry(
  profile: ProfileDirectoryBase,
  enrichment: { avatarUrl?: string | null; registrationPhone?: string | null } = {},
): ProfileDirectoryEntry {
  return {
    uid: profile.uid,
    storeName: profile.storeName,
    storeDescription: profile.storeDescription,
    storeStory: profile.storeStory,
    customRequestEnabled: profile.customRequestEnabled,
    trendingLabel: profile.trendingLabel,
    primaryPhone: profile.primaryPhone,
    ratingAverage: profile.ratingAverage,
    ratingCount: profile.ratingCount,
    ...(enrichment.avatarUrl != null ? { avatarUrl: enrichment.avatarUrl } : {}),
    ...(enrichment.registrationPhone != null
      ? { registrationPhone: enrichment.registrationPhone }
      : {}),
  };
}
