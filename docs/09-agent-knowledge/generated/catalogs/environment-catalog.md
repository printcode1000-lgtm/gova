<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->

# Environment Usage Catalog

Key names only. No environment value is stored in the graph or this catalog.

| Key | Visibility | Direct consumers | Example consumer paths/commands |
|---|---|---:|---|
| `ANDROID_HOME` | server/tooling | 3 | `scripts/android/adb.ts`, `scripts/build-android-signed.ts`, `scripts/check-environment-requirements.ts` |
| `ANDROID_SDK_ROOT` | server/tooling | 3 | `scripts/android/adb.ts`, `scripts/build-android-signed.ts`, `scripts/check-environment-requirements.ts` |
| `APNS_BUNDLE_ID` | server/tooling | 1 | `src/core/config/server-env/server-env.values.turso-env.ts` |
| `APNS_KEY_ID` | server/tooling | 2 | `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `APNS_PRIVATE_KEY` | server/tooling | 2 | `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `APNS_PRODUCTION` | server/tooling | 1 | `src/core/config/server-env/server-env.values.turso-env.ts` |
| `APNS_TEAM_ID` | server/tooling | 2 | `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | server/tooling | 1 | `packages/ota-core/src/publishing/adapters/app-store-connect.adapter.ts` |
| `APP_STORE_CONNECT_API_KEY_KEY_FILEPATH` | server/tooling | 1 | `packages/ota-core/src/publishing/adapters/app-store-connect.adapter.ts` |
| `APP_STORE_CONNECT_API_KEY_KEY_ID` | server/tooling | 1 | `packages/ota-core/src/publishing/adapters/app-store-connect.adapter.ts` |
| `APPAREL_PETS_R2_ACCESS_KEY_ID` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `APPAREL_PETS_R2_ACCOUNT_ID` | server/tooling | 1 | `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `APPAREL_PETS_R2_API_TOKEN` | server/tooling | 1 | `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `APPAREL_PETS_R2_BUCKET_NAME` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `APPAREL_PETS_R2_CATALOG_URI` | server/tooling | 0 |  |
| `APPAREL_PETS_R2_ENDPOINT` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `APPAREL_PETS_R2_JURISDICTION` | server/tooling | 0 |  |
| `APPAREL_PETS_R2_LOCATION` | server/tooling | 0 |  |
| `APPAREL_PETS_R2_PUBLIC_URL` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `APPAREL_PETS_R2_SECRET_ACCESS_KEY` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `APPAREL_PETS_R2_WAREHOUSE_NAME` | server/tooling | 0 |  |
| `ASOL_ANDROID_APP_LINK_CERT_SHA256` | server/tooling | 1 | `src/core/config/server-env/server-env.values.turso-env.ts` |
| `ASOL_ANDROID_KEY_ALIAS` | server/tooling | 0 |  |
| `ASOL_ANDROID_KEY_PASSWORD` | server/tooling | 0 |  |
| `ASOL_ANDROID_KEYSTORE_FILE` | server/tooling | 2 | `scripts/build-android-signed.ts`, `scripts/ensure-release-secrets-restored.ts` |
| `ASOL_ANDROID_KEYSTORE_PASSWORD` | server/tooling | 0 |  |
| `ASOL_ANDROID_PACKAGE_NAME` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `ASOL_API_BASE_URL` | server/tooling | 3 | `scripts/cap-build-local.ts`, `scripts/cap-build.ts`, `src/core/config/public-env.ts` |
| `ASOL_BASE_PATH` | server/tooling | 0 |  |
| `ASOL_CAPACITOR_API_BASE_URL` | server/tooling | 0 |  |
| `ASOL_CATALOG_PUBLIC_ROOT` | server/tooling | 1 | `packages/catalog-core/src/server/validate-catalog-v3.ts` |
| `ASOL_CATALOG_ROOT` | server/tooling | 1 | `packages/catalog-core/src/server/validate-catalog-v3.ts` |
| `ASOL_CORS_ORIGINS` | server/tooling | 2 | `packages/ota-core/scripts/sync-cors.ts`, `packages/storage-core/src/server/transport/r2-cors-policy.ts` |
| `ASOL_DATA_SOURCE` | server/tooling | 1 | `src/core/config/runtime-context.server.ts` |
| `ASOL_IOS_BUNDLE_ID` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/app-store-connect.adapter.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `ASOL_IOS_EXPORT_METHOD` | server/tooling | 0 |  |
| `ASOL_IOS_TEAM_ID` | server/tooling | 1 | `src/core/config/server-env/server-env.values.turso-env.ts` |
| `ASOL_LOCAL_ORIGIN` | server/tooling | 1 | `scripts/check-localhost-notifications.ts` |
| `ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` | server/tooling | 1 | `src/features/notifications/tests/mobile-push-unlock.service.test.ts` |
| `ASOL_MOBILE_PUSH_UNLOCK_KEY` | server/tooling | 2 | `src/features/notifications/tests/mobile-push-crypto.test.ts`, `src/features/notifications/tests/mobile-push-unlock.service.test.ts` |
| `ASOL_MODE` | server/tooling | 4 | `scripts/test-data-health-environment.ts`, `src/core/config/runtime-context.server.ts`, `src/features/data-health/tests/development-guard.test.ts`, `src/features/dev-cloud-backup/tests/dev-cloud-backup-policy.test.ts` |
| `ASOL_NOTIFICATION_GRANT_SECRET` | server/tooling | 5 | `npm run test:follow`, `npm run test:notifications`, `scripts/probe-notifications-service.ts`, `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `ASOL_OTA_NATIVE_BASELINE` | server/tooling | 2 | `packages/ota-core/src/publishing/gate/native-gate.ts`, `packages/ota-core/src/tests/native-compatibility.test.ts` |
| `ASOL_OTA_PUBLIC_KEY` | server/tooling | 1 | `packages/ota-core/src/publishing/config/ota-r2-target.ts` |
| `ASOL_OTA_R2_ACCESS_KEY_ID` | server/tooling | 0 |  |
| `ASOL_OTA_R2_ACCOUNT_ID` | server/tooling | 0 |  |
| `ASOL_OTA_R2_API_TOKEN` | server/tooling | 0 |  |
| `ASOL_OTA_R2_BUCKET_NAME` | server/tooling | 1 | `packages/ota-core/src/publishing/config/ota-config.ts` |
| `ASOL_OTA_R2_CATALOG_URI` | server/tooling | 0 |  |
| `ASOL_OTA_R2_ENDPOINT` | server/tooling | 0 |  |
| `ASOL_OTA_R2_JURISDICTION` | server/tooling | 1 | `packages/ota-core/src/publishing/config/ota-r2-target.ts` |
| `ASOL_OTA_R2_LOCATION` | server/tooling | 1 | `packages/ota-core/src/publishing/config/ota-r2-target.ts` |
| `ASOL_OTA_R2_PREFIX` | server/tooling | 2 | `packages/ota-core/src/publishing/config/ota-config.ts`, `packages/ota-core/src/publishing/config/ota-r2-target.ts` |
| `ASOL_OTA_R2_PUBLIC_URL` | server/tooling | 2 | `packages/ota-core/src/publishing/config/ota-config.ts`, `packages/ota-core/src/publishing/config/ota-r2-target.ts` |
| `ASOL_OTA_R2_SECRET_ACCESS_KEY` | server/tooling | 0 |  |
| `ASOL_OTA_R2_WAREHOUSE_NAME` | server/tooling | 0 |  |
| `ASOL_OTA_SIGNING_PRIVATE_KEY` | server/tooling | 2 | `packages/ota-core/src/publishing/config/ota-config.ts`, `packages/ota-core/src/publishing/config/ota-r2-target.ts` |
| `ASOL_PRODUCTION_ORIGIN` | server/tooling | 1 | `scripts/check-deployed-release.ts` |
| `ASOL_PROVISIONING` | server/tooling | 13 | `npm run db:provision:turso`, `npm run db:schema:sync:release`, `npm run db:schema:sync`, `scripts/provision-turso.ts`, `scripts/schema-sync.ts`, `scripts/setup-turso-db.ts` |
| `ASOL_RELEASE_CHECK_ATTEMPTS` | server/tooling | 1 | `scripts/check-deployed-release.ts` |
| `ASOL_SCHEMA_SYNC_EXACT` | server/tooling | 1 | `scripts/schema-sync.ts` |
| `ASOL_SCHEMA_SYNC_REQUIRED` | server/tooling | 2 | `npm run db:schema:sync:release`, `scripts/schema-sync.ts` |
| `ASOL_SERVICE_SMOKE_ONLY` | server/tooling | 1 | `scripts/check-service-smoke.ts` |
| `ASOL_SERVICE_SMOKE_PORT` | server/tooling | 1 | `scripts/check-service-smoke.ts` |
| `ASOL_SESSION_SIGNING_SECRET` | server/tooling | 6 | `npm run test:follow`, `npm run test:notifications`, `scripts/probe-notifications-service.ts`, `packages/auth-core/src/ports/session-signing-secret.port.ts`, `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `ASOL_SMOKE_PORT` | server/tooling | 1 | `scripts/check-production-smoke.ts` |
| `ASOL_STATIC_PREVIEW_API_BASE_URL` | server/tooling | 1 | `packages/ota-core/scripts/serve-static.ts` |
| `ASOL_WEB_BUNDLE_READY` | server/tooling | 1 | `scripts/build-android-signed.ts` |
| `CAPACITOR_SERVER_URL` | server/tooling | 0 |  |
| `CI` | server/tooling | 1 | `scripts/schema-sync.ts` |
| `DOCS_CI_BASE_REF` | server/tooling | 3 | `scripts/docs/docs-ci.ts`, `scripts/docs/mutability-check.ts`, `scripts/runtime/check.ts` |
| `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` | server/tooling | 0 |  |
| `FASTLANE_SKIP_UPDATE_CHECK` | server/tooling | 1 | `scripts/fastlane-runner.ts` |
| `FASTLANE_USER` | server/tooling | 0 |  |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | server/tooling | 0 |  |
| `FIREBASE_ADMIN_CLIENT_ID` | server/tooling | 0 |  |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64` | server/tooling | 2 | `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` | server/tooling | 2 | `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `FIREBASE_ANDROID_API_KEY` | server/tooling | 0 |  |
| `FIREBASE_ANDROID_APP_ID` | server/tooling | 0 |  |
| `FIREBASE_ANDROID_APP_NICKNAME` | server/tooling | 0 |  |
| `FIREBASE_ANDROID_CONFIGURATION_VERSION` | server/tooling | 0 |  |
| `FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64` | server/tooling | 1 | `packages/native-core/scripts/sync-android-push-assets.ts` |
| `FIREBASE_ANDROID_OAUTH_CLIENT_IDS` | server/tooling | 0 |  |
| `FIREBASE_ANDROID_PACKAGE_NAME` | server/tooling | 0 |  |
| `FIREBASE_ANDROID_SHA1` | server/tooling | 0 |  |
| `FIREBASE_ANDROID_SHA256` | server/tooling | 0 |  |
| `FIREBASE_FCM_SENDER_ID` | server/tooling | 0 |  |
| `FIREBASE_IOS_APP_ID` | server/tooling | 0 |  |
| `FIREBASE_IOS_BUNDLE_ID` | server/tooling | 0 |  |
| `FIREBASE_IOS_ENCODED_APP_ID` | server/tooling | 0 |  |
| `FIREBASE_PROJECT_ID` | server/tooling | 0 |  |
| `FIREBASE_PROJECT_NAME` | server/tooling | 0 |  |
| `FIREBASE_PROJECT_NUMBER` | server/tooling | 0 |  |
| `FIREBASE_STORAGE_BUCKET` | server/tooling | 0 |  |
| `GITHUB_ACTIONS` | server/tooling | 1 | `src/core/config/runtime-context.server.ts` |
| `GITHUB_ADMIN_TOKEN` | server/tooling | 3 | `scripts/block-branch-creation.ts`, `scripts/protect-main-branch.ts`, `packages/release-core/src/pipeline/push-main-branch.ts` |
| `GITHUB_REPOSITORY` | server/tooling | 3 | `scripts/block-branch-creation.ts`, `scripts/protect-main-branch.ts`, `packages/release-core/src/pipeline/push-main-branch.ts` |
| `GOOGLE_PLAY_JSON_KEY_FILE` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_PACKAGE_NAME` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_URI` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_EMAIL` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_ID` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_ID` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_PROJECT_ID` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_TOKEN_URI` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_TYPE` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_UNIQUE_ID` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_UNIVERSE_DOMAIN` | server/tooling | 2 | `packages/ota-core/src/publishing/adapters/google-play.adapter.ts`, `src/features/google-play-console/domain/development-guard.server.ts` |
| `GOOGLE_PLAY_TRACK` | server/tooling | 0 |  |
| `HOME` | server/tooling | 1 | `packages/native-core/scripts/android-build-preflight.ts` |
| `HOST` | server/tooling | 1 | `packages/ota-core/scripts/serve-static.ts` |
| `JAVA_HOME` | server/tooling | 2 | `scripts/check-environment-requirements.ts`, `packages/native-core/scripts/android-build-preflight.ts` |
| `LANG` | server/tooling | 1 | `scripts/fastlane-runner.ts` |
| `LC_ALL` | server/tooling | 1 | `scripts/fastlane-runner.ts` |
| `LEGACY_PRODUCT_DATABASE_URL` | server/tooling | 1 | `packages/data-core/src/tooling/migrate-product-database.ts` |
| `LOCALAPPDATA` | server/tooling | 2 | `scripts/android/adb.ts`, `scripts/build-android-signed.ts` |
| `NEXT_PHASE` | server/tooling | 1 | `src/features/dev-cloud-backup/tests/dev-cloud-backup-policy.test.ts` |
| `NEXT_PUBLIC_ASOL_API_BASE_URL` | client-visible | 3 | `npm run build:static:local`, `packages/ota-core/scripts/serve-static.ts`, `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_APP_STORE_URL` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_BASE_PATH` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_MODE` | client-visible | 3 | `src/core/config/public-env.ts`, `src/core/config/runtime-context.server.ts`, `src/features/dev-cloud-backup/tests/dev-cloud-backup-policy.test.ts` |
| `NEXT_PUBLIC_ASOL_NATIVE_VERSION` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL` | client-visible | 2 | `scripts/probe-notifications-service.ts`, `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_ORDERS_URL` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL` | client-visible | 2 | `packages/ota-core/src/publishing/config/ota-r2-target.ts`, `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY` | client-visible | 2 | `packages/ota-core/src/publishing/config/ota-r2-target.ts`, `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_PRODUCTS_URL` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_PROFILES_URL` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_SUB2MAIN_URL` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_SUBMAIN_URL` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_BASE_PATH` | client-visible | 1 | `packages/storage-core/src/server/providers/local-storage.provider.ts` |
| `NEXT_PUBLIC_BUILD_ID` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | client-visible | 1 | `src/core/config/public-env.ts` |
| `NEXT_PUBLIC_SUPER_ADMIN_PHONE` | client-visible | 2 | `npm run test:notifications`, `packages/auth-core/src/domain/super-admin.ts` |
| `NEXT_PUBLIC_SUPER_ADMIN_UID` | client-visible | 2 | `npm run test:notifications`, `packages/auth-core/src/domain/super-admin.ts` |
| `NEXT_RUNTIME` | server/tooling | 3 | `services/sub2main/src/instrumentation.ts`, `services/submain/src/instrumentation.ts`, `src/instrumentation.ts` |
| `NODE_ENV` | server/tooling | 7 | `npm run test:release-commands`, `packages/observability-core/src/ports/index.ts`, `packages/storage-core/src/server/providers/provider-resolver.ts`, `src/core/config/public-env.ts`, `src/core/config/runtime-context.server.ts`, `packages/storage-core/src/tests/integration/parameterized-store.test.ts` |
| `NODE_OPTIONS` | server/tooling | 18 | `npm run test:account-deletion-schema`, `npm run test:auth-email-uniqueness`, `npm run test:backup-core`, `npm run test:catalog-studio`, `npm run test:data-health`, `npm run test:dev-cloud-backup` |
| `OLD_R2_PUBLIC_URL` | server/tooling | 1 | `packages/data-core/src/tooling/migrate-r2-image-public-url.ts` |
| `ORDERS_CORE_DATABASE_AUTH_TOKEN` | server/tooling | 0 |  |
| `ORDERS_CORE_DATABASE_URL` | server/tooling | 1 | `services/submain/src/app/api/health/route.ts` |
| `PASSWORD_RECOVERY_GMAIL_APP_PASSWORD` | server/tooling | 2 | `scripts/send-coordinator-completion-email.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `PASSWORD_RECOVERY_GMAIL_USER` | server/tooling | 2 | `scripts/send-coordinator-completion-email.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `PASSWORD_RECOVERY_SIGNING_SECRET` | server/tooling | 1 | `src/core/config/server-env/server-env.values.turso-env.ts` |
| `PATH` | server/tooling | 1 | `scripts/fastlane-runner.ts` |
| `PORT` | server/tooling | 1 | `packages/ota-core/scripts/serve-static.ts` |
| `PRODUCT_R2_ACCESS_KEY_ID` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `PRODUCT_R2_ACCOUNT_ID` | server/tooling | 1 | `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `PRODUCT_R2_API_TOKEN` | server/tooling | 1 | `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `PRODUCT_R2_BUCKET_NAME` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `PRODUCT_R2_CATALOG_URI` | server/tooling | 0 |  |
| `PRODUCT_R2_ENDPOINT` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `PRODUCT_R2_JURISDICTION` | server/tooling | 0 |  |
| `PRODUCT_R2_LOCATION` | server/tooling | 0 |  |
| `PRODUCT_R2_PUBLIC_URL` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `PRODUCT_R2_SECRET_ACCESS_KEY` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `PRODUCT_R2_WAREHOUSE_NAME` | server/tooling | 0 |  |
| `PROFILE_CORE_DATABASE_AUTH_TOKEN` | server/tooling | 0 |  |
| `PROFILE_CORE_DATABASE_URL` | server/tooling | 1 | `services/sub2main/src/app/api/health/route.ts` |
| `R2_ACCESS_KEY_ID` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `R2_ACCOUNT_ID` | server/tooling | 1 | `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `R2_API_TOKEN` | server/tooling | 1 | `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `R2_BUCKET_NAME` | server/tooling | 3 | `services/sub2main/src/app/api/health/route.ts`, `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `R2_CATALOG_URI` | server/tooling | 0 |  |
| `R2_ENDPOINT` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `R2_JURISDICTION` | server/tooling | 0 |  |
| `R2_LOCATION` | server/tooling | 0 |  |
| `R2_MIGRATION_EXTRA_URLS` | server/tooling | 1 | `packages/data-core/src/tooling/migrate-r2-image-public-url.ts` |
| `R2_MIGRATION_SOURCE_PUBLIC_URL` | server/tooling | 1 | `packages/data-core/src/tooling/migrate-r2-image-public-url.ts` |
| `R2_PUBLIC_URL` | server/tooling | 3 | `packages/data-core/src/tooling/migrate-r2-cloud-folders.ts`, `packages/data-core/src/tooling/migrate-r2-image-public-url.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `R2_SECRET_ACCESS_KEY` | server/tooling | 2 | `packages/storage-core/src/tests/integration/credential-isolation.test.ts`, `packages/storage-core/src/tests/unit/account-credentials.test.ts` |
| `R2_WAREHOUSE_NAME` | server/tooling | 0 |  |
| `RUBY_BIN` | server/tooling | 1 | `scripts/fastlane-runner.ts` |
| `SYNTHETIC_ANALYTICS_R2_ACCESS_KEY_ID` | server/tooling | 1 | `packages/storage-core/src/tests/integration/add-account.test.ts` |
| `SYNTHETIC_ANALYTICS_R2_BUCKET_NAME` | server/tooling | 1 | `packages/storage-core/src/tests/integration/add-account.test.ts` |
| `SYNTHETIC_ANALYTICS_R2_ENDPOINT` | server/tooling | 1 | `packages/storage-core/src/tests/integration/add-account.test.ts` |
| `SYNTHETIC_ANALYTICS_R2_PUBLIC_URL` | server/tooling | 1 | `packages/storage-core/src/tests/integration/add-account.test.ts` |
| `SYNTHETIC_ANALYTICS_R2_SECRET_ACCESS_KEY` | server/tooling | 1 | `packages/storage-core/src/tests/integration/add-account.test.ts` |
| `SYSTEM_LOGS_ALERT_THRESHOLD` | server/tooling | 1 | `src/core/config/system-logs.server.ts` |
| `SYSTEM_LOGS_ALERT_WEBHOOK_URL` | server/tooling | 1 | `src/core/config/system-logs.server.ts` |
| `SYSTEM_LOGS_ALERT_WINDOW_MS` | server/tooling | 1 | `src/core/config/system-logs.server.ts` |
| `SYSTEM_LOGS_RETENTION_DAYS` | server/tooling | 1 | `src/core/config/system-logs.server.ts` |
| `TURSO_ADVERTISEMENTS_AUTH_TOKEN` | server/tooling | 2 | `packages/data-core/src/ports/runtime-config.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `TURSO_ADVERTISEMENTS_DATABASE_URL` | server/tooling | 2 | `packages/data-core/src/ports/runtime-config.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `TURSO_API_TOKEN` | server/tooling | 1 | `scripts/provision-turso.ts` |
| `TURSO_AUTH_TOKEN` | server/tooling | 3 | `packages/data-core/src/ports/runtime-config.ts`, `packages/data-core/src/tooling/sync-users-sqlite-to-turso.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `TURSO_DATABASE_URL` | server/tooling | 4 | `scripts/test-data-health-environment.ts`, `packages/data-core/src/ports/runtime-config.ts`, `packages/data-core/src/tooling/sync-users-sqlite-to-turso.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `TURSO_NOTIFICATIONS_API_TOKEN` | server/tooling | 0 |  |
| `TURSO_NOTIFICATIONS_AUTH_TOKEN` | server/tooling | 2 | `packages/data-core/src/tooling/enforce-notification-token-cardinality.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `TURSO_NOTIFICATIONS_DATABASE_URL` | server/tooling | 3 | `packages/data-core/src/tooling/enforce-notification-token-cardinality.ts`, `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `TURSO_NOTIFICATIONS_ORGANIZATION` | server/tooling | 0 |  |
| `TURSO_ORDERS_API_TOKEN` | server/tooling | 0 |  |
| `TURSO_ORDERS_ORGANIZATION` | server/tooling | 0 |  |
| `TURSO_ORGANIZATION` | server/tooling | 1 | `scripts/provision-turso.ts` |
| `TURSO_PRODUCT_API_TOKEN` | server/tooling | 0 |  |
| `TURSO_PRODUCT_AUTH_TOKEN` | server/tooling | 3 | `packages/data-core/src/ports/runtime-config.ts`, `packages/data-core/src/tooling/strip-product-image-urls.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
| `TURSO_PRODUCT_DATABASE_URL` | server/tooling | 7 | `packages/data-core/src/ports/runtime-config.ts`, `packages/data-core/src/tooling/migrate-product-database.ts`, `packages/data-core/src/tooling/strip-product-image-urls.ts`, `services/products/src/app/api/health/route.ts`, `services/sub2main/src/app/api/health/route.ts`, `services/submain/src/app/api/health/route.ts` |
| `TURSO_PRODUCT_ORGANIZATION` | server/tooling | 0 |  |
| `TURSO_PROFILES_API_TOKEN` | server/tooling | 0 |  |
| `TURSO_PROFILES_ORGANIZATION` | server/tooling | 0 |  |
| `VERCEL` | server/tooling | 6 | `scripts/schema-sync.ts`, `scripts/test-data-health-environment.ts`, `packages/native-core/scripts/validate-ios-push-policy.ts`, `src/core/config/runtime-context.server.ts`, `src/features/data-health/tests/development-guard.test.ts`, `src/features/dev-cloud-backup/tests/dev-cloud-backup-policy.test.ts` |
| `VERCEL_ACCESS_TOKEN` | server/tooling | 2 | `scripts/push-vercel-turso-env.ts`, `scripts/redeploy-main-vercel.ts` |
| `VERCEL_ENV` | server/tooling | 1 | `src/core/config/runtime-context.server.ts` |
| `VERCEL_NOTIFICATIONS_TOKEN` | server/tooling | 0 |  |
| `VERCEL_ORDERS_TOKEN` | server/tooling | 0 |  |
| `VERCEL_ORG_ID` | server/tooling | 2 | `scripts/push-vercel-turso-env.ts`, `scripts/redeploy-main-vercel.ts` |
| `VERCEL_PRODUCTS_TOKEN` | server/tooling | 0 |  |
| `VERCEL_PROFILES_TOKEN` | server/tooling | 0 |  |
| `VERCEL_PROJECT_ID` | server/tooling | 2 | `scripts/push-vercel-turso-env.ts`, `scripts/redeploy-main-vercel.ts` |
| `VERCEL_PROJECT_NAME` | server/tooling | 2 | `scripts/push-vercel-turso-env.ts`, `scripts/redeploy-main-vercel.ts` |
| `VERCEL_SUB2MAIN_ORG_ID` | server/tooling | 0 |  |
| `VERCEL_SUB2MAIN_TOKEN` | server/tooling | 1 | `scripts/recreate-sub2main-vercel-project.ts` |
| `VERCEL_SUBMAIN_ORG_ID` | server/tooling | 0 |  |
| `VERCEL_SUBMAIN_TOKEN` | server/tooling | 1 | `scripts/recreate-submain-vercel-project.ts` |
| `VERCEL_TEAM_ID` | server/tooling | 2 | `scripts/push-vercel-turso-env.ts`, `scripts/redeploy-main-vercel.ts` |
| `VERCEL_TOKEN` | server/tooling | 4 | `scripts/deploy-all.ts`, `scripts/deploy-push.ts`, `scripts/push-vercel-turso-env.ts`, `scripts/redeploy-main-vercel.ts` |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | server/tooling | 2 | `services/notifications/src/app/api/health/route.ts`, `src/core/config/server-env/server-env.values.turso-env.ts` |
