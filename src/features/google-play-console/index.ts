/**
 * Public application door for `@/features/google-play-console`.
 * Browser-safe data and Arabic runbook copy only — no Next.js client pages.
 * Import `ReleaseConsolePage` from `@/features/google-play-console/ui`.
 */
export {
  GOOGLE_PLAY_CONSOLE_API,
  GOOGLE_PLAY_STORE_ASSETS_API,
  RELEASE_CONSOLE_ROUTE,
} from "./application/config/config";
export {
  ALL_BRANCH_HELP,
  PUSH_BRANCH_HELP,
  deployAllScenarios,
  deployPushTargets,
} from "./presentation/deploy-runbook-copy";
export { ANDROID_RELEASE_BRANCH_HELP } from "./presentation/android-release-runbook-copy";
export { ANDROID_RELEASE_PATHS } from "./presentation/components/android-release-paths-data";
export type {
  GooglePlayConsoleConfigStatus,
  GooglePlayConsoleEndpointResult,
  GooglePlayConsoleEnvironment,
  GooglePlayConsoleSnapshot,
} from "./domain/types";
export type {
  GooglePlayFastlaneAction,
  GooglePlayFastlaneResult,
  GooglePlayImageType,
  GooglePlayStoreAssetsMutationResult,
  GooglePlayStoreAssetsSnapshot,
  GooglePlayStoreImageGroup,
  GooglePlayStoreListing,
} from "@asol/google-play-store-assets-core";
