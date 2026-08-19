export {
  getTursoRuntimeCredentials,
  getTursoPlatformCredentials,
  getCorsOrigins,
  readOptionalEnv,
  getAppLinkAssociationConfig,
  listLibsqlDatabaseUrlKeys,
  getPasswordRecoveryConfig,
  getFirebaseAdminServiceAccount,
  getAsolSessionSigningSecret,
  getApnsServerConfig,
  getWebPushServerConfig,
  writeTursoRuntimeCredentials,
  writeTursoProductRuntimeCredentials,
  writeTursoAdvertisementsRuntimeCredentials,
  getTursoProductRuntimeCredentials,
  writeTursoNotificationsRuntimeCredentials,
  getTursoNotificationsRuntimeCredentials,
  getNotificationGrantSecret,
  getTursoAdvertisementsRuntimeCredentials,
} from "./server-env/server-env.values.turso-env";
export type { FirebaseAdminServiceAccountConfig, R2CloudflareCredentials } from "./server-env/server-env.values.turso-env";
export { requireEnv, getMobilePushUnlockKeyBuffer, isMobilePushUnlockConfigured, getOptionalMobilePushServerCredentialBlob } from "./server-env/server-env.values.auth-notifications";
/**
 * `getOtaApprovalServerConfig` is deliberately NOT re-exported here.
 *
 * This module is reached by the sharded database clients, which are mirrored into
 * `services/*​/generated/`. A re-export of a bare `@asol/*` specifier therefore lands in
 * all four service deployments — and the mirror walker treats bare specifiers as npm
 * packages and does not copy them, so the remote Vercel build fails with
 * "Can't resolve '@asol/ota-core/publishing'". It broke all four accounts.
 *
 * OTA approval is a main-app release-console concern. Import it from
 * `@asol/ota-core/publishing` directly at the one place that needs it.
 */
