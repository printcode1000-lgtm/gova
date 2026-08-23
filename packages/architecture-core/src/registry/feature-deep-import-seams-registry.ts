/**
 * Canonical exact feature-to-feature deep-import seams.
 *
 * `APPLICATION_FEATURES.deepImportSeams` declares only which target feature may
 * contain a justified seam. It grants no path authority by itself. The exact
 * source modules below are the only internal modules a feature may reach.
 * Public feature doors remain the default and preferred boundary.
 *
 * Paths are repository-relative module paths without an extension where the
 * source import omits one; JSON keeps its extension. This lets alias and
 * relative imports normalize to the same machine-readable authority.
 */
export const FEATURE_DEEP_IMPORT_SEAMS = {
  advertisements: [
    'src/features/profile/presentation/image-configs/storefront-images.image.json',
  ],
  notifications: [
    'src/features/orders/order-data-refresh',
    'src/features/auth/presentation/SessionProvider',
    'src/features/auth/application/auth-lifecycle-events',
    'src/features/specialty-chat/domain/types',
    'src/features/auth/utils/super-admin',
  ],
  'release-commands': [
    'src/features/google-play-console/domain/development-guard.server',
    'src/features/google-play-console/presentation/android-release-runbook-copy',
    'src/features/google-play-console/presentation/components/android-release-paths-data',
    'src/features/google-play-console/presentation/deploy-runbook-copy',
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type FeatureDeepImportSeamOwner = keyof typeof FEATURE_DEEP_IMPORT_SEAMS;

export function isFeatureDeepImportSeam(
  importerFeature: string,
  targetRepoPath: string,
): boolean {
  const seams = FEATURE_DEEP_IMPORT_SEAMS[
    importerFeature as FeatureDeepImportSeamOwner
  ] as readonly string[] | undefined;
  return seams?.includes(targetRepoPath) ?? false;
}
