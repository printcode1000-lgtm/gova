import type { ProfileDirectoryEntry as ProfileDirectoryBase } from "@asol/data-core/profile/entities";

export interface ProfileDirectoryEntry extends ProfileDirectoryBase {
  avatarUrl?: string;
  registrationPhone?: string;
}
