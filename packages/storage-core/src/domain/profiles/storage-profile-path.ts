import type {
  StorageProfile,
  StorageProviderId,
} from './storage-profile.types';

/**
 * The object-path prefix a profile's images live under.
 *
 * One value per profile. A profile used to carry two — `folder` for the
 * filesystem provider and `cloudFolder` for R2 — and every caller had to decide
 * which one applied, which is exactly the kind of decision that gets made
 * differently in an uploader and in a reader. R2 is the only server image store,
 * so the surviving folder is the R2 prefix each profile already used; no
 * persisted object key changed when the second field was dropped.
 *
 * The provider is still checked rather than ignored: a non-R2 provider has no
 * prefix here, and answering one anyway would let a mistake resolve to a
 * plausible-looking path.
 */
export function storageFolderForProvider(
  profile: StorageProfile,
  providerId: StorageProviderId,
): string {
  if (
    providerId === 'CloudflareR2' ||
    providerId === 'CloudflareR2Products' ||
    providerId.startsWith('CloudflareR2_')
  ) {
    return profile.folder;
  }
  throw new Error(
    `No storage folder for provider "${providerId}": server image objects live in Cloudflare R2 only.`,
  );
}
