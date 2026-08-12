import { createPublicKey } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  assertR2StorageTarget,
  assertR2StorageTargetFields,
} from "./r2-storage-topology";

export { getTursoRuntimeCredentials, getTursoPlatformCredentials, getCorsOrigins, readOptionalEnv, getAppLinkAssociationConfig, listLibsqlDatabaseUrlKeys, getPasswordRecoveryConfig, getFirebaseAdminServiceAccount, getAsolSessionSigningSecret, getApnsServerConfig, getWebPushServerConfig, getOtaApprovalServerConfig, writeTursoRuntimeCredentials, writeTursoProductRuntimeCredentials, writeTursoAdvertisementsRuntimeCredentials, getTursoProductRuntimeCredentials, writeTursoNotificationsRuntimeCredentials, getTursoNotificationsRuntimeCredentials, getNotificationGrantSecret, getTursoAdvertisementsRuntimeCredentials } from "./server-env/server-env.values.turso-env";
export type { FirebaseAdminServiceAccountConfig, R2CloudflareCredentials } from "./server-env/server-env.values.turso-env";
export { getR2CloudflareCredentials, getR2S3Credentials, getR2PublicUrl, getR2Config, getProductR2CloudflareCredentials, getProductR2S3Credentials, getProductR2PublicUrl, getProductR2Config } from "./server-env/server-env.values.auth-notifications";
export type { R2S3Credentials, R2Config } from "./server-env/server-env.values.auth-notifications";
