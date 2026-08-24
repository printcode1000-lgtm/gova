/**
 * Public application door for `@/features/super-admin`.
 * Cross-feature consumers MUST import through declared doors only.
 *
 * Cloud-accounts stays on this door (not `./ui`) so the root layout's
 * `SuperAdminImpersonationBanner` import from `./ui` cannot pull
 * `@asol/account-declarations` `requiredEnv` inventories into static chunks.
 */
export { SuperAdminCloudAccountsPage } from "./presentation/SuperAdminCloudAccountsPage";
