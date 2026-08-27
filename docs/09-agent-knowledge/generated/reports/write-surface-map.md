<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->

# Write Surface Map

Detected write-like surfaces: **367**
Unproven gateway paths: **146**

| Source | Owner | Operations | Gateway | Proven | Route | Runtimes | Risk |
|---|---|---|---|---|---|---|---|
| `packages/account-bridge/src/tests/mobile-push.test.ts` | `@asol/account-bridge` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/account-declarations/src/accounts/orders.ts` | `@asol/account-declarations` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/account-declarations/src/accounts/products.ts` | `@asol/account-declarations` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/account-declarations/src/accounts/profiles.ts` | `@asol/account-declarations` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/account-declarations/src/accounts/sub2main.ts` | `@asol/account-declarations` | upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/account-declarations/src/accounts/submain.ts` | `@asol/account-declarations` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/architecture-core/src/checks/application-cycle-contract.ts` | `@asol/architecture-core` | delete, save, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/architecture-core/src/checks/feature-application-door-purity-contract.ts` | `@asol/architecture-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/architecture-core/src/checks/native-contract.ts` | `@asol/architecture-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/architecture-core/src/checks/page-save-gateway-contract.ts` | `@asol/architecture-core` | save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/architecture-core/src/checks/page-save-write-gateway-contract.ts` | `@asol/architecture-core` | create, delete, patch, save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/architecture-core/src/checks/system-logs-contract.ts` | `@asol/architecture-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/architecture-core/src/contracts/contract.ts` | `@asol/architecture-core` | create, delete, insert, update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/architecture-core/src/registry/application-features-registry.ts` | `@asol/architecture-core` | save, upload | `@asol/page-save-core, @asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/architecture-core/src/registry/capability-registry.ts` | `@asol/architecture-core` | create, save, update | `@asol/page-save-core, @asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/auth-core/src/ports/auth-repository.port.ts` | `@asol/auth-core` | patch, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/auth-core/src/server/account-deletion-service.ts` | `@asol/auth-core` | delete | `unproven` | NO | `` | development, web | high |
| `packages/auth-core/src/server/auth-operations-service.ts` | `@asol/auth-core` | update | `unproven` | NO | `` | development, web | high |
| `packages/auth-core/src/tests/index.test.ts` | `@asol/auth-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/backup-core/src/server/dev-cloud-backup-service.ts` | `@asol/backup-core` | create, update | `unproven` | NO | `` | development, web | high |
| `packages/backup-core/src/server/r2-backup.repository.ts` | `@asol/backup-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/browser/asol-db/index.ts` | `@asol/data-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/core/data-source-registry.ts` | `@asol/data-core` | create, delete, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/core/database/abstract-database-client.ts` | `@asol/data-core` | delete, insert, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/core/database/database-client.interface.ts` | `@asol/data-core` | delete, insert, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/core/database/profile-sharded-db-client.ts` | `@asol/data-core` | delete, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/core/database/sharded-raw-database-client.ts` | `@asol/data-core` | delete, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/account-deletion/repositories/account-deletion-repository.server.ts` | `@asol/data-core` | delete, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/advertisements/repositories/featured-marquee.repository.ts` | `@asol/data-core` | insert, save, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/advertisements/repositories/home-hero-slider.repository.ts` | `@asol/data-core` | insert, save, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/advertisements/repositories/trending-ribbon.repository.ts` | `@asol/data-core` | insert, save, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/auth/operations/commands/create-user.command.ts` | `@asol/data-core` | create | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/domains/auth/operations/commands/update-last-login.command.ts` | `@asol/data-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/domains/auth/operations/commands/update-user-profile.command.ts` | `@asol/data-core` | update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/auth/operations/commands/update-user.command.ts` | `@asol/data-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/domains/auth/repositories/user-repository.interface.ts` | `@asol/data-core` | create, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/domains/auth/repositories/user-repository.ts` | `@asol/data-core` | create, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/auth/tests/email-uniqueness.test.ts` | `@asol/data-core` | create, insert, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-01.ts` | `@asol/data-core` | delete, insert, update | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-02.ts` | `@asol/data-core` | update | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-03.ts` | `@asol/data-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-04.ts` | `@asol/data-core` | delete, update | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-05.ts` | `@asol/data-core` | insert | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-06.ts` | `@asol/data-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-07.ts` | `@asol/data-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-08.ts` | `@asol/data-core` | delete | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-09.ts` | `@asol/data-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-10.ts` | `@asol/data-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-11.ts` | `@asol/data-core` | delete, insert, update | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/data-health-repository-parts/data-health.repository.part-12.ts` | `@asol/data-core` | delete, insert, update | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/schema-comparison.repository.server.ts` | `@asol/data-core` | update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/data-health/repositories/storage-inventory-repository-parts/storage-inventory.repository.part-01.ts` | `@asol/data-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/data-health/repositories/storage-inventory-repository-parts/storage-inventory.repository.part-02.ts` | `@asol/data-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/data-core/src/domains/feature-flags/repositories/feature-flag-repository.ts` | `@asol/data-core` | insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/follow/repositories/follow-repository.ts` | `@asol/data-core` | delete, insert | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/marketplace-orders/repositories/index.ts` | `@asol/data-core` | create, delete, insert, patch, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/domains/marketplace-orders/tests/requirements-coverage.test.ts` | `@asol/data-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/domains/marketplace-orders/tests/storage-profile-integration.test.ts` | `@asol/data-core` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/data-core/src/domains/notifications/repositories/user-notification-token-repository.ts` | `@asol/data-core` | delete, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/ota/repositories/ota-release-repository.ts` | `@asol/data-core` | insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/password-recovery/operations/password-recovery.operations.ts` | `@asol/data-core` | create, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/password-recovery/repositories/password-recovery-repository.ts` | `@asol/data-core` | create, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/product/repositories/product-repository.ts` | `@asol/data-core` | create, delete, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/product/repositories/product-review-repository.ts` | `@asol/data-core` | create, delete, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/profile/repositories/profile-repository-parts/profile-repository.part-02.ts` | `@asol/data-core` | delete, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/profile/repositories/profile-repository-parts/profile-repository.part-03.ts` | `@asol/data-core` | delete, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/profile/repositories/profile-repository-parts/profile-repository.part-04.ts` | `@asol/data-core` | delete, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/profile/repositories/profile-review-repository.ts` | `@asol/data-core` | create, delete, insert, update | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/domains/seller-discounts/repositories/seller-discount-repository.ts` | `@asol/data-core` | create, delete, insert | `unproven` | NO | `` | development, web | high |
| `packages/data-core/src/index.ts` | `@asol/data-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/data-core/src/ports/product-search-fields.ts` | `@asol/data-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/data-core/src/ports/runtime-config.ts` | `@asol/data-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/data-core/src/provisioning/core/schema-version.ts` | `@asol/data-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/data-core/src/tests/index.test.ts` | `@asol/data-core` | delete, update | `@asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/data-core/src/tests/schema-parity.test.ts` | `@asol/data-core` | create | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/data-core/src/tooling/migrate-r2-cloud-folders.ts` | `@asol/data-core` | update, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/data-core/src/tooling/migrate-r2-image-public-url.ts` | `@asol/data-core` | update | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/data-health-core/src/server/policy.ts` | `@asol/data-health-core` | update | `unproven` | NO | `` | development, web | high |
| `packages/featured-marquee-core/src/server/featured-marquee-service.ts` | `@asol/featured-marquee-core` | save | `unproven` | NO | `` | development, web | high |
| `packages/featured-marquee-core/src/tests/index.test.ts` | `@asol/featured-marquee-core` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/hero-slider-core/src/server/home-hero-slider-service.ts` | `@asol/hero-slider-core` | save | `unproven` | NO | `` | development, web | high |
| `packages/hero-slider-core/src/tests/index.test.ts` | `@asol/hero-slider-core` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/map-core/src/AsolMap.tsx` | `@asol/map-core` | delete, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/native-core/src/adapters/emitter.ts` | `@asol/native-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/native-core/src/adapters/ota.adapter.ts` | `@asol/native-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/native-core/src/domain/share/share-queue.ts` | `@asol/native-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/notifications-composition/src/index.ts` | `@asol/notifications-composition` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/notifications-core/src/ports/token-store.ts` | `@asol/notifications-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/notifications-core/src/tests/index.test.ts` | `@asol/notifications-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/observability-core/src/index.ts` | `@asol/observability-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/observability-core/src/monitor/asol-db-monitor.ts` | `@asol/observability-core` | delete, insert | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/observability-core/src/monitor/data-core-telemetry.ts` | `@asol/observability-core` | delete, insert, update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/observability-core/src/monitor/monitor-store-parts/monitor-store.monitor-types.ts` | `@asol/observability-core` | create | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/observability-core/src/monitor/monitor-store-parts/monitor-store.performance-analysis.ts` | `@asol/observability-core` | create | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/observability-core/src/monitor/monitor-store.ts` | `@asol/observability-core` | create | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/observability-core/src/server.ts` | `@asol/observability-core` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `packages/observability-core/src/tests/index.test.ts` | `@asol/observability-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/observability-core/src/traces/data-core-telemetry.server.ts` | `@asol/observability-core` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `packages/observability-core/src/traces/dev-trace-types.ts` | `@asol/observability-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/orders-composition/src/index.ts` | `@asol/orders-composition` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/orders-composition/src/tests/index.test.ts` | `@asol/orders-composition` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/orders-core/src/index.ts` | `@asol/orders-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/orders-core/src/tests/orders-service-module-contract.test.ts` | `@asol/orders-core` | delete, patch, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/ota-core/scripts/ota-revoke.ts` | `@asol/ota-core` | delete, publish | `unproven` | NO | `` | android, development, ios, static-out, tooling, web | high |
| `packages/ota-core/scripts/ota-self-test.ts` | `@asol/ota-core` | delete, update | `unproven` | NO | `` | android, development, ios, static-out, tooling, web | high |
| `packages/ota-core/src/domain/release/manifest-types.ts` | `@asol/ota-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/ota-core/src/ports/index.ts` | `@asol/ota-core` | update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/ota-core/src/publishing/adapters/app-store-connect.adapter.ts` | `@asol/ota-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/ota-core/src/publishing/release/publish-release.ts` | `@asol/ota-core` | patch, publish, update, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/ota-core/src/runtime/outcome-logger.ts` | `@asol/ota-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/ota-core/src/runtime/release-service.server.ts` | `@asol/ota-core` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `packages/ota-core/src/runtime/revocation-service.ts` | `@asol/ota-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/ota-core/src/runtime/update-service.ts` | `@asol/ota-core` | delete | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/ota-core/src/tests/contract/app-edges.test.ts` | `@asol/ota-core` | delete | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/page-save-core/src/runtime/page-save-operation-queue.ts` | `@asol/page-save-core` | delete, save, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/page-save-core/src/runtime/page-save-persistence.ts` | `@asol/page-save-core` | delete, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/page-save-core/src/runtime/page-save-registry.ts` | `@asol/page-save-core` | delete, patch, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/page-save-core/src/tests/header-visibility.test.ts` | `@asol/page-save-core` | delete, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/page-save-core/src/tests/index.test.ts` | `@asol/page-save-core` | delete, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/page-save-core/src/tests/journal-recovery.test.ts` | `@asol/page-save-core` | delete, save, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/page-snapshot-core/src/domain/page-snapshot.types.ts` | `@asol/page-snapshot-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/page-snapshot-core/src/runtime/page-snapshot-runtime.ts` | `@asol/page-snapshot-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/page-snapshot-core/src/tests/index.test.ts` | `@asol/page-snapshot-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/products-composition/src/index.ts` | `@asol/products-composition` | create, upload | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/profiles-composition/src/index.ts` | `@asol/profiles-composition` | create, upload | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/release-core/src/console-server/build-job-runner.ts` | `@asol/release-core` | delete, update | `unproven` | NO | `` | development, web | high |
| `packages/release-core/src/console-server/bundle-analyzer.ts` | `@asol/release-core` | update | `unproven` | NO | `` | development, web | high |
| `packages/release-core/src/console/android-release-runbook.ts` | `@asol/release-core` | patch, publish, update, upload | `@asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/release-core/src/pipeline/input-hash.ts` | `@asol/release-core` | publish, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/secrets-core/src/archive/archive-crypto.ts` | `@asol/secrets-core` | create, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/secrets-core/src/archive/archive-workspace.ts` | `@asol/secrets-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/service-mirror-core/src/index.ts` | `@asol/service-mirror-core` | delete, save, upload | `@asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/service-mirror-core/src/tests/index.test.ts` | `@asol/service-mirror-core` | write-like | `@asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/signed-token-core/src/domain/signed-envelope.ts` | `@asol/signed-token-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/signed-token-core/src/tests/index.test.ts` | `@asol/signed-token-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/simulation-core/src/discovery/interaction-source-discovery.ts` | `@asol/simulation-core` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/simulation-core/src/runtime/simulation-runner.ts` | `@asol/simulation-core` | publish | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/storage-core/src/domain/accounts/account-registry.ts` | `@asol/storage-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/storage-core/src/domain/images/stored-image.types.ts` | `@asol/storage-core` | upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/storage-core/src/index.ts` | `@asol/storage-core` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-core/src/server.ts` | `@asol/storage-core` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `packages/storage-core/src/server/orchestration/image-storage-orchestrator.ts` | `@asol/storage-core` | delete, upload | `unproven` | NO | `` | development, web | high |
| `packages/storage-core/src/server/providers/local-storage.provider.ts` | `@asol/storage-core` | delete, upload | `unproven` | NO | `` | development, web | high |
| `packages/storage-core/src/server/providers/provider-resolver.ts` | `@asol/storage-core` | delete, upload | `unproven` | NO | `` | development, web | high |
| `packages/storage-core/src/server/providers/r2-account.provider.ts` | `@asol/storage-core` | delete, upload | `unproven` | NO | `` | development, web | high |
| `packages/storage-core/src/server/providers/storage-provider.interface.ts` | `@asol/storage-core` | delete, upload | `unproven` | NO | `` | development, web | high |
| `packages/storage-core/src/tests/contract/package-independence.test.ts` | `@asol/storage-core` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-core/src/tests/index.test.ts` | `@asol/storage-core` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-core/src/tests/integration/parameterized-store.test.ts` | `@asol/storage-core` | delete, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/storage-image-manager-core/src/components/storage-image-manager.types.ts` | `@asol/storage-image-manager-core` | upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-image-manager-core/src/components/StorageImageManager.tsx` | `@asol/storage-image-manager-core` | delete, save, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-image-manager-core/src/hooks/use-storage-profile-upload.ts` | `@asol/storage-image-manager-core` | delete, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-image-manager-core/src/processing/image-processor.client.ts` | `@asol/storage-image-manager-core` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-image-manager-core/src/services/image-storage-api-service.interface.ts` | `@asol/storage-image-manager-core` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-image-manager-core/src/services/image-storage-service.interface.ts` | `@asol/storage-image-manager-core` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-image-manager-core/src/services/image-upload-draft-service.ts` | `@asol/storage-image-manager-core` | delete, patch, upload | `@asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/storage-image-manager-core/src/services/image-upload-queue.ts` | `@asol/storage-image-manager-core` | delete, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/storage-image-manager-core/src/tests/index.test.ts` | `@asol/storage-image-manager-core` | upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/sub2main-composition/src/index.ts` | `@asol/sub2main-composition` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/submain-composition/src/index.ts` | `@asol/submain-composition` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/system-logs-core/src/browser/memory-store.ts` | `@asol/system-logs-core` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `packages/system-logs-core/src/server/persistent-log-service.ts` | `@asol/system-logs-core` | delete | `unproven` | NO | `` | development, web | high |
| `packages/system-logs-core/src/server/stream-hub.ts` | `@asol/system-logs-core` | delete | `unproven` | NO | `` | development, web | high |
| `packages/system-logs-core/src/tests/index.test.ts` | `@asol/system-logs-core` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `packages/trending-ribbon-core/src/server/trending-ribbon-service.ts` | `@asol/trending-ribbon-core` | save | `unproven` | NO | `` | development, web | high |
| `packages/trending-ribbon-core/src/tests/index.test.ts` | `@asol/trending-ribbon-core` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/app/api/account/delete/route.ts` | `unknown` | delete | `unproven` | NO | `/api/account/delete` | development, web | high |
| `src/app/api/advertisements/featured-marquee/route.ts` | `unknown` | save | `unproven` | NO | `/api/advertisements/featured-marquee` | development, web | high |
| `src/app/api/advertisements/home-hero-slider/route.ts` | `unknown` | save | `unproven` | NO | `/api/advertisements/home-hero-slider` | development, web | high |
| `src/app/api/advertisements/trending-ribbon/route.ts` | `unknown` | save | `unproven` | NO | `/api/advertisements/trending-ribbon` | development, web | high |
| `src/app/api/orders/[orderId]/route.ts` | `unknown` | write-like | `@asol/data-core` | yes | `/api/orders/[orderId]` | development, web | medium |
| `src/app/api/orders/custom-request-from-profile/route.ts` | `unknown` | write-like | `@asol/data-core, @asol/storage-core` | yes | `/api/orders/custom-request-from-profile` | development, web | medium |
| `src/app/api/orders/from-cart/route.ts` | `unknown` | write-like | `@asol/data-core` | yes | `/api/orders/from-cart` | development, web | medium |
| `src/app/api/orders/route.ts` | `unknown` | write-like | `@asol/data-core` | yes | `/api/orders` | development, web | medium |
| `src/app/api/products/reviews/route.ts` | `unknown` | create, delete, update | `unproven` | NO | `/api/products/reviews` | development, web | high |
| `src/app/api/products/route.ts` | `unknown` | create, delete, update | `unproven` | NO | `/api/products` | development, web | high |
| `src/app/api/profile/fulfillment-settings/route.ts` | `unknown` | write-like | `@asol/data-core` | yes | `/api/profile/fulfillment-settings` | development, web | medium |
| `src/app/api/profile/reviews/route.ts` | `unknown` | create, delete, update | `unproven` | NO | `/api/profile/reviews` | development, web | high |
| `src/app/api/storage/images/upload/route.ts` | `unknown` | upload | `@asol/storage-core` | yes | `/api/storage/images/upload` | development, web | medium |
| `src/app/api/super-admin/dev-cloud-backup/backups/create/route.ts` | `unknown` | create | `unproven` | NO | `/api/super-admin/dev-cloud-backup/backups/create` | development, web | high |
| `src/app/dev/monitor/SchemaSyncPanel.tsx` | `unknown` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/core/composition/server-ports.ts` | `unknown` | write-like | `@asol/storage-core` | yes | `` | development, web | medium |
| `src/core/config/system-logs.server.ts` | `unknown` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/core/providers/query-provider.tsx` | `unknown` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/advertisements/presentation/HeroSliderEditor.tsx` | `advertisements` | delete, patch, save, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/advertisements/presentation/HeroSliderImageProbe.tsx` | `advertisements` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/advertisements/presentation/HeroSliderImagesEditor.tsx` | `advertisements` | delete | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/advertisements/presentation/HeroSliderSlide.tsx` | `advertisements` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/advertisements/presentation/hooks/use-home-featured-marquee.ts` | `advertisements` | update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/advertisements/presentation/hooks/use-home-hero-slider.ts` | `advertisements` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/advertisements/presentation/hooks/use-home-trending-ribbon.ts` | `advertisements` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/advertisements/server/services/featured-marquee-service.server.ts` | `advertisements` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/advertisements/server/services/home-hero-slider-service.server.ts` | `advertisements` | write-like | `@asol/data-core, @asol/storage-core` | yes | `` | development, web | medium |
| `src/features/advertisements/server/services/trending-ribbon-service.server.ts` | `advertisements` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/app-reset/application/client-storage.ts` | `app-reset` | delete | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/application/auth-lifecycle-events.ts` | `auth` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/application/hooks/use-guest-session.ts` | `auth` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/application/services/session-api-service.ts` | `auth` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/domain/profile-registration.entity.ts` | `auth` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/domain/profile.entity.ts` | `auth` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/domain/session.entity.ts` | `auth` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/domain/user.entity.ts` | `auth` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/ports/auth-service.interface.ts` | `auth` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/auth/presentation/AccountDeletionPageContent.tsx` | `auth` | delete, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/auth/presentation/hooks/use-login.ts` | `auth` | mutate, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/auth/presentation/hooks/use-register.ts` | `auth` | create, insert, mutate | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/auth/server/auth-core-bootstrap.server.ts` | `auth` | patch, update | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/cart/application/cart-store.ts` | `cart` | write-like | `@asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/cart/application/shipping-pricing.ts` | `cart` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/cart/domain/profile-fulfillment.entity.ts` | `cart` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/cart/ports/profile-checkout.port.ts` | `cart` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/cart/server/services/cart-catalogue-pricing.server.ts` | `cart` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/catalog-studio/presentation/CatalogStudioPage.tsx` | `catalog-studio` | delete, save, update, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/catalog-studio/server/services/catalog-studio-service/catalog-studio.service.server.catalog-files.ts` | `catalog-studio` | update | `unproven` | NO | `` | development, web | high |
| `src/features/catalog-studio/tests/catalog-studio.test.ts` | `catalog-studio` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/categories/presentation/CategorySubcategoriesPage.tsx` | `categories` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/data-health/presentation/use-data-health-page.ts` | `data-health` | delete, save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/data-health/server/services/data-health-service.server.ts` | `data-health` | delete | `@asol/data-core, @asol/storage-core` | yes | `` | development, web | medium |
| `src/features/data-health/server/services/order-purge-service.server.ts` | `data-health` | write-like | `@asol/data-core, @asol/storage-core` | yes | `` | development, web | medium |
| `src/features/data/ports/data-core-browser-ports.ts` | `data` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/data/ports/data-core-ports.ts` | `data` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/data/ports/data-core-runtime-config-ports.ts` | `data` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/data/ports/data-core-specialty-catalog-port.ts` | `data` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/dev-cloud-backup/presentation/use-dev-cloud-backup-page.ts` | `dev-cloud-backup` | create, delete, save, update | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/dev-cloud-backup/server/services/dev-cloud-backup-service.server.ts` | `dev-cloud-backup` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/dev-cloud-backup/tests/dev-cloud-backup-policy.test.ts` | `dev-cloud-backup` | delete | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/dev-tools/presentation/DeveloperBadge.tsx` | `dev-tools` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/favorites/application/services/favorite-storage.ts` | `favorites` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/favorites/presentation/hooks/FavoritesProvider.tsx` | `favorites` | publish, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/feature-flags/server/services/feature-flag-service.server.ts` | `feature-flags` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/follow/domain/follow.types.ts` | `follow` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/follow/server/services/follow-service.server.ts` | `follow` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/google-play-console/application/services/store-assets-api-service.ts` | `google-play-console` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/google-play-console/presentation/components/AndroidReleaseRunbookTree.tsx` | `google-play-console` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/google-play-console/presentation/DeployRunbookControls.tsx` | `google-play-console` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/google-play-console/presentation/hooks/use-store-assets.ts` | `google-play-console` | delete, save, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/google-play-console/presentation/hooks/use-store-text-page-save.ts` | `google-play-console` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/google-play-console/presentation/tabs/PlayTracksTab.tsx` | `google-play-console` | save, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/google-play-console/presentation/tabs/StoreImagesTab.tsx` | `google-play-console` | save, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/google-play-console/presentation/tabs/StoreTextTab.tsx` | `google-play-console` | patch, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/application/notification-bus.ts` | `notifications` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/application/notification-lifecycle-service.ts` | `notifications` | delete, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/application/notification-receiver.ts` | `notifications` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/application/notification-sender.ts` | `notifications` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/application/notification-stored-extension.ts` | `notifications` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/application/public/notification-center-extension.ts` | `notifications` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/application/public/notification-facade.ts` | `notifications` | create, patch, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/domain/notification-metadata-validation.ts` | `notifications` | create | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/infrastructure/asol-notification-repository.ts` | `notifications` | delete, patch, save, update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/notifications/infrastructure/concurrency/keyed-mutex.ts` | `notifications` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/infrastructure/push-device-store.ts` | `notifications` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/notifications/infrastructure/web-push/web-push-browser.service.ts` | `notifications` | update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/notifications/ports/notifications-core-ports.ts` | `notifications` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/notifications/presentation/NotificationsPageContent.tsx` | `notifications` | delete, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/server/services/mobile-push-crypto.server.ts` | `notifications` | update | `unproven` | NO | `` | development, web | high |
| `src/features/notifications/server/services/mobile-push-unlock.service.server.ts` | `notifications` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/notifications/server/services/notification-broadcast-service.server.ts` | `notifications` | update | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/notifications/server/services/notification-recipient-tokens.service.server.ts` | `notifications` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/notifications/server/services/notification-self-test.service.server.ts` | `notifications` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/notifications/server/services/notification-token-service.server.ts` | `notifications` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/notifications/tests/integration/notification-harness.ts` | `notifications` | delete | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/notifications/tests/mobile-push-crypto.test.ts` | `notifications` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/tests/mobile-push-unlock.service.test.ts` | `notifications` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/notifications/tests/notifications-service-module-contract.test.ts` | `notifications` | update, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/onboarding/domain/onboarding-product-types.ts` | `onboarding` | upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/onboarding/domain/onboarding-profile-types.ts` | `onboarding` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/onboarding/domain/onboarding-upload-types.ts` | `onboarding` | upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/onboarding/domain/store.ts` | `onboarding` | create | `@asol/data-core, @asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/onboarding/presentation/sections/collections-section.tsx` | `onboarding` | create | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/onboarding/presentation/sections/ProductForm.tsx` | `onboarding` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/onboarding/presentation/sections/store-identity-section.tsx` | `onboarding` | save | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/orders/application/order-actions.server.ts` | `orders` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/orders/server/services/order-action-notifications.server.ts` | `orders` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/orders/server/services/order-progression.server.ts` | `orders` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/orders/server/services/order-shipping-bootstrap.server.ts` | `orders` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/page-save/application/page-save-core-bootstrap.ts` | `page-save` | save | `@asol/page-save-core, @asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-save/application/utils/page-save-image-items.ts` | `page-save` | delete, save, upload | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-save/application/utils/page-save-operation-description.ts` | `page-save` | delete, save, upload | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-save/infrastructure/runtime/page-save-image-upload-registry.ts` | `page-save` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/page-save/presentation/hooks/use-page-save-operations.ts` | `page-save` | delete, save, upload | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-save/presentation/hooks/use-page-save-registration.ts` | `page-save` | save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-save/presentation/PageSaveDialog.tsx` | `page-save` | save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-save/presentation/PageSaveHeaderButton.tsx` | `page-save` | save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-save/tests/page-save-ownership.test.ts` | `page-save` | delete, save, upload | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-save/tests/page-save-write-surface.test.ts` | `page-save` | create, delete, save, update | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-snapshot/application/services/page-snapshot-service.ts` | `page-snapshot` | delete | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/page-snapshot/presentation/hooks/page-snapshot-browser.ts` | `page-snapshot` | patch | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/page-snapshot/presentation/hooks/use-page-snapshot.tsx` | `page-snapshot` | delete, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/password-recovery/server/services/password-recovery-service.server.ts` | `password-recovery` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/pharmacy-profile-catalog/domain/pharmacy-profile-catalog.types.ts` | `pharmacy-profile-catalog` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/pharmacy-profile-catalog/presentation/PharmacyCatalogManagerPage.tsx` | `pharmacy-profile-catalog` | create, save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/pharmacy-profile-catalog/presentation/ProductPharmacySpecs.tsx` | `pharmacy-profile-catalog` | patch | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog-service-parts/pharmacy-profile-catalog.service.part-01.ts` | `pharmacy-profile-catalog` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog-service-parts/pharmacy-profile-catalog.service.part-02.ts` | `pharmacy-profile-catalog` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/pharmacy-profile-catalog/server/services/pharmacy-profile-catalog-service-parts/pharmacy-profile-catalog.service.part-03.ts` | `pharmacy-profile-catalog` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/product-card/presentation/ProductCard.tsx` | `product-card` | delete | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product-search/application/utils/arabic-search.ts` | `product-search` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product-search/domain/product-search.types.ts` | `product-search` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product-search/presentation/panel/ProductSearchFieldSelector.tsx` | `product-search` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/product-search/server/services/product-search-products.server.ts` | `product-search` | write-like | `@asol/data-core, @asol/storage-core` | yes | `` | development, web | medium |
| `src/features/product/application/services/product-api-service.ts` | `product` | create, delete, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/product/application/services/product-review-api-service.ts` | `product` | create, delete, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/product/domain/pharmacy-category.ids.ts` | `product` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product/domain/product-review.entity.ts` | `product` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product/ports/profile-reviews.port.ts` | `product` | create, delete, update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product/presentation/product-components-demo-data.ts` | `product` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product/presentation/product-reviews/ProductReviewDialogs.tsx` | `product` | save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product/presentation/ProductImageEditors.tsx` | `product` | delete | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product/presentation/ProductImageGallery.tsx` | `product` | delete | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product/presentation/ProductPageContent.tsx` | `product` | create, save, update, upload | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/product/presentation/ProductReviews.tsx` | `product` | create, delete, save, update | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/product/presentation/style-editors/search-columns/ProductSearchColumnsStyleEditor.tsx` | `product` | update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/product/server/services/product-review-service.server.ts` | `product` | create, delete, update | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/product/server/services/product-service.server.ts` | `product` | create, delete, update | `@asol/data-core, @asol/storage-core` | yes | `` | development, web | medium |
| `src/features/product/tests/products-service-module-contract.test.ts` | `product` | delete, patch, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/profile-products/domain/profile-specialties.entity.ts` | `profile-products` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile-products/ports/profile-specialties.port.ts` | `profile-products` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile-products/presentation/hooks/use-profile-products-tabs.ts` | `profile-products` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/profile-working-hours/application/services/profile-working-hours.ts` | `profile-working-hours` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile-working-hours/domain/profile-working-hours.types.ts` | `profile-working-hours` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/domain/profile-contacts.entity.ts` | `profile` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/domain/profile-editor.entity.ts` | `profile` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/domain/profile-fulfillment-settings.entity.ts` | `profile` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/domain/profile-review.entity.ts` | `profile` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/domain/profile-specialties.entity.ts` | `profile` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/domain/store-details.entity.ts` | `profile` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/domain/user-profile-row.entity.ts` | `profile` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/presentation/CustomRequestPageContent.tsx` | `profile` | save, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/presentation/FulfillmentSettingsCard.tsx` | `profile` | delete, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/profile/presentation/hooks/store-name-draft.ts` | `profile` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/profile/presentation/ProductsCard.tsx` | `profile` | delete, save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/profile/presentation/store-identity/StoreIdentityImagesEditor.tsx` | `profile` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/presentation/StoreIdentityCard.tsx` | `profile` | delete, save, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/profile/presentation/use-profile-save.ts` | `profile` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/profile/server/services/profile-review-service.server.ts` | `profile` | create, delete, update | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/profile/server/services/profile-service.bootstrap.server.ts` | `profile` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/profile/server/services/profile-service.server.ts` | `profile` | write-like | `@asol/data-core, @asol/storage-core` | yes | `` | development, web | medium |
| `src/features/profile/tests/profiles-service-module-contract.test.ts` | `profile` | delete, patch, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/release-commands/tests/release-commands.test.ts` | `release-commands` | patch, publish, update | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/seller-card/presentation/SellerCard.tsx` | `seller-card` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/seller-discounts/domain/seller-discount.entity.ts` | `seller-discounts` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/seller-discounts/presentation/SellerDiscountsManager.tsx` | `seller-discounts` | save | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/seller-discounts/server/services/seller-discount-service.server.ts` | `seller-discounts` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/specialty-chat/application/specialty-chat-notification-extension.ts` | `specialty-chat` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/specialty-chat/server/services/specialty-chat-service.server.ts` | `specialty-chat` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/splash/presentation/SplashInitializer.tsx` | `splash` | update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/splash/presentation/TopMarquee.tsx` | `splash` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/storage/application/image-upload-application.service.server.ts` | `storage` | delete, upload | `@asol/storage-core` | yes | `` | development, web | medium |
| `src/features/storage/application/services/image-storage-api-service.ts` | `storage` | delete, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/storage/ports/storage-core-ports.ts` | `storage` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/storage/tests/image-upload-queue.test.ts` | `storage` | save, upload | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/super-admin/presentation/cloud-accounts-reference.ts` | `super-admin` | write-like | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/super-admin/presentation/featured-marquee/SuperAdminFeaturedMarqueePage.product-display.tsx` | `super-admin` | save | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/super-admin/presentation/SuperAdminFeaturedMarqueePage.tsx` | `super-admin` | delete, save | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/super-admin/presentation/SuperAdminImpersonationBanner.tsx` | `super-admin` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/super-admin/presentation/SuperAdminNotificationBroadcastPage.tsx` | `super-admin` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/features/super-admin/presentation/SuperAdminTrendingRibbonPage.tsx` | `super-admin` | delete, save | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/super-admin/presentation/SuperAdminUsersPage.tsx` | `super-admin` | delete, save | `@asol/page-save-core, @asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/super-admin/presentation/use-super-admin-hero-slider-save.ts` | `super-admin` | save | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/super-admin/server/services/super-admin-user-service.server.ts` | `super-admin` | delete | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/super-admin/server/services/ui-registry-pending.server.ts` | `super-admin` | write-like | `@asol/data-core` | yes | `` | development, web | medium |
| `src/features/super-admin/tests/super-admin-user-deletion.test.ts` | `super-admin` | delete, save | `@asol/page-save-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/features/voice-input/application/voice-input-scanner.ts` | `voice-input` | delete | `unproven` | NO | `` | android, development, ios, static-out, web | high |
| `src/shared/installation/installation-bootstrap.ts` | `unknown` | update | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/shared/layouts/AppSidebar.tsx` | `unknown` | save | `@asol/storage-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/shared/preferences/app-preferences-storage.ts` | `unknown` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
| `src/shared/theme/runtime/storage.ts` | `unknown` | write-like | `@asol/data-core` | yes | `` | android, development, ios, static-out, web | medium |
