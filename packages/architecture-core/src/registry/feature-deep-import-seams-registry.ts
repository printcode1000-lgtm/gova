/**
 * Feature-to-feature deep imports are forbidden.
 *
 * Every cross-feature dependency must go through a declared public feature door
 * (`@/features/<feature>`, `/ui`, or `/server`). This registry intentionally
 * remains empty so no exact-path exception can silently reintroduce internal
 * coupling.
 */
export const FEATURE_DEEP_IMPORT_SEAMS = {} as const satisfies Readonly<
  Record<string, readonly string[]>
>;

export type FeatureDeepImportSeamOwner = keyof typeof FEATURE_DEEP_IMPORT_SEAMS;

export function isFeatureDeepImportSeam(
  _importerFeature: string,
  _targetRepoPath: string,
): boolean {
  return false;
}
