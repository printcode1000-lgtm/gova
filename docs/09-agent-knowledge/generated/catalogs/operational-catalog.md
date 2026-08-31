<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: package.json + .env.example key names.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->

# Operational Catalog

This catalog exposes command and environment **names only**. Environment assignment values embedded in npm scripts are replaced with `<redacted>` and runtime environment values are never emitted.

## Runtime

| Item | Value |
|---|---|
| Package manager | `npm@11.19.0` |
| Engine `node` | `>=22 <25` |
| Engine `npm` | `>=11 <12` |

## Workspaces

- `packages/*`

## npm Scripts

| Command | Implementation |
|---|---|
| `npm run android:backup:validate` | `npx tsx packages/native-core/scripts/validate-android-backup-policy.ts` |
| `npm run android:build:debug` | `npx tsx scripts/build-android-debug.ts` |
| `npm run android:build:signed` | `npx tsx scripts/build-android-signed.ts` |
| `npm run android:device:tests` | `npx tsx packages/native-core/scripts/android-device-tests.ts` |
| `npm run android:open:outputs` | `npx tsx scripts/open-android-outputs.ts` |
| `npm run android:preflight` | `npx tsx packages/native-core/scripts/android-build-preflight.ts` |
| `npm run android:push:sync-assets` | `npx tsx packages/native-core/scripts/sync-android-push-assets.ts` |
| `npm run android:r8:validate` | `npx tsx packages/native-core/scripts/validate-android-r8-policy.ts` |
| `npm run android:r8:verify-release` | `npm run android:preflight && npm run android:push:sync-assets && npm run android:backup:validate && npm run android:r8:validate && npx tsx packages/native-core/scripts/verify-android-r8-release.ts` |
| `npm run api:inventory` | `npx tsx scripts/api-route-inventory.ts` |
| `npm run app:init` | `npx tsx scripts/generate-app-init-public.ts && npm run data-access:sync-public && npm run maplibre:sync` |
| `npm run architecture:check` | `npx tsx scripts/architecture-check.ts` |
| `npm run architecture:docs` | `npx tsx scripts/architecture/generate-architecture-docs.ts` |
| `npm run branding:generate` | `npx tsx packages/branding-core/src/cli.ts` |
| `npm run build` | `npx tsx scripts/run-generated-gate.ts build` |
| `npm run build:static` | `npx tsx scripts/run-generated-gate.ts build:static` |
| `npm run build:static:local` | `cross-env NEXT_PUBLIC_ASOL_API_BASE_URL=<redacted> npm run build:static` |
| `npm run build:vercel` | `npx tsx scripts/vercel-deployment-build.ts` |
| `npm run cap:build` | `npx tsx scripts/cap-build.ts` |
| `npm run cap:build:local` | `npx tsx scripts/cap-build-local.ts` |
| `npm run cap:build:resume` | `npx tsx scripts/cap-build.ts --resume` |
| `npm run cap:copy` | `npx tsx scripts/build-static.ts --assert-only && npm run android:push:sync-assets && npm run android:backup:validate && npm run android:r8:validate && npm run ios:push:validate && npx cap copy && npm run android:backup:validate && npm run android:r8:validate && npm run ios:push:validate` |
| `npm run cap:open:android` | `npx cap open android` |
| `npm run cap:open:ios` | `npx cap open ios` |
| `npm run cap:prepare:android` | `npm run build:static && npm run cap:sync` |
| `npm run cap:run:clean:android` | `npx tsx scripts/cap-run-clean.ts android` |
| `npm run cap:run:clean:ios` | `npx tsx scripts/cap-run-clean.ts ios` |
| `npm run cap:sync` | `npx tsx scripts/build-static.ts --assert-only && npm run android:push:sync-assets && npm run android:backup:validate && npm run android:r8:validate && npm run ios:push:validate && npx cap sync && npm run ios:spm:normalize && npm run android:backup:validate && npm run android:r8:validate && npm run ios:push:validate` |
| `npm run cap:verify-defaults` | `npx tsx packages/native-core/scripts/audit-capacitor-defaults.ts && npm run android:backup:validate && npm run android:r8:validate && npm run ios:push:validate` |
| `npm run catalog:schemas` | `npx tsx scripts/generate-catalog-schemas.ts` |
| `npm run catalog:validate` | `npx tsx scripts/validate-catalog.ts && npm run test:catalog-display` |
| `npm run category:validate` | `npx tsx scripts/validate-categories.ts` |
| `npm run ci:coverage` | `npx tsx scripts/github-ci-policy.ts` |
| `npm run control:build` | `npm run control:sync && npm --prefix services/control run build` |
| `npm run control:deploy` | `npx tsx scripts/deploy-control-service.ts` |
| `npm run control:smoke` | `npx tsx scripts/smoke-control-service.ts` |
| `npm run control:sync` | `npx tsx scripts/sync-control-service-sources.ts` |
| `npm run control:verify` | `npm run control:sync && npm run typecheck && npm run test:control` |
| `npm run coordinator:email` | `npx tsx scripts/send-coordinator-completion-email.ts` |
| `npm run data-access:sync-public` | `npx tsx scripts/sync-data-access-public-artifacts.ts` |
| `npm run db:create:product` | `npx tsx packages/data-core/src/tooling/create-product-sqlite-db.ts` |
| `npm run db:create:profile` | `npx tsx packages/data-core/src/tooling/create-profile-sqlite-db.ts` |
| `npm run db:create:sqlite` | `npx tsx packages/data-core/src/tooling/create-sqlite-db.ts` |
| `npm run db:drizzle` | `npx tsx scripts/run-drizzle-kit.ts` |
| `npm run db:drop:factory-reset` | `npx tsx packages/data-core/src/tooling/drop-factory-reset-tables.ts` |
| `npm run db:drop:factory-reset:cloud` | `npx tsx packages/data-core/src/tooling/drop-factory-reset-tables.ts --cloud` |
| `npm run db:ensure` | `npx tsx packages/data-core/src/tooling/ensure-sqlite-databases.ts` |
| `npm run db:migrate:orders` | `npx tsx packages/data-core/src/tooling/migrate-order-shards.ts` |
| `npm run db:migrate:phones-e164` | `npx tsx packages/data-core/src/tooling/migrate-phones-to-e164.ts` |
| `npm run db:migrate:product` | `npx tsx packages/data-core/src/tooling/migrate-product-database.ts` |
| `npm run db:migrate:product-image-urls` | `npx tsx packages/data-core/src/tooling/strip-product-image-urls.ts` |
| `npm run db:migrate:profiles` | `npx tsx packages/data-core/src/tooling/migrate-profile-shards.ts` |
| `npm run db:migrate:users` | `npx tsx packages/data-core/src/tooling/apply-users-migrations.ts` |
| `npm run db:provision:turso` | `cross-env ASOL_PROVISIONING=<redacted> npx tsx scripts/provision-turso.ts` |
| `npm run db:push:vercel-env` | `npx tsx scripts/push-vercel-turso-env.ts` |
| `npm run db:reset:advertisements` | `npx tsx packages/data-core/src/tooling/reset-advertisements-db.ts` |
| `npm run db:reset:advertisements:cloud` | `npx tsx packages/data-core/src/tooling/reset-advertisements-db.ts --cloud` |
| `npm run db:schema:sync` | `cross-env ASOL_PROVISIONING=<redacted> npx tsx scripts/schema-sync.ts` |
| `npm run db:schema:sync:release` | `cross-env ASOL_PROVISIONING=<redacted> ASOL_SCHEMA_SYNC_REQUIRED=<redacted> npx tsx scripts/schema-sync.ts` |
| `npm run db:setup:turso` | `npm run db:schema:sync` |
| `npm run db:sync:users` | `npx tsx packages/data-core/src/tooling/sync-users-sqlite-to-turso.ts` |
| `npm run db:verify:sqlite` | `npx tsx packages/data-core/src/tooling/verify-sqlite-shards.ts` |
| `npm run db:verify:turso` | `npx tsx packages/data-core/src/tooling/verify-turso-shards.ts` |
| `npm run dependencies:install` | `node scripts/install-compatible-dependencies.mjs` |
| `npm run dependencies:outdated` | `npx tsx scripts/check-environment-requirements.ts --scenario=all --check-outdated` |
| `npm run deploy:all` | `npx tsx scripts/deploy-all.ts` |
| `npm run deploy:all:main` | `npx tsx scripts/deploy-all.ts --phase=main` |
| `npm run deploy:all:preflight` | `npx tsx scripts/deploy-all.ts --phase=preflight` |
| `npm run deploy:all:publish` | `npx tsx scripts/deploy-all.ts --phase=publish` |
| `npm run deploy:all:services` | `npx tsx scripts/deploy-all.ts --phase=services` |
| `npm run deploy:env:push` | `npx tsx scripts/push-production-deploy-env.ts` |
| `npm run deploy:push` | `npx tsx scripts/deploy-push.ts` |
| `npm run deploy:push:all` | `npx tsx scripts/deploy-push.ts --vercel-target=all` |
| `npm run deploy:push:main` | `npx tsx scripts/deploy-push.ts --vercel-target=none` |
| `npm run deploy:redeploy-main` | `npx tsx scripts/redeploy-main-vercel.ts` |
| `npm run deploy:revision` | `npx tsx scripts/deploy-revision.ts` |
| `npm run dev` | `next dev --turbo --port 3001` |
| `npm run dev:checked` | `npm run server:stop && npm run branding:generate && npm run app:init && npm run catalog:validate && next dev --turbo --port 3001` |
| `npm run dev:distributed` | `npx tsx scripts/dev-distributed.ts` |
| `npm run dev:distributed:smoke` | `npx tsx scripts/dev-distributed.ts --smoke` |
| `npm run docs:check` | `npx tsx scripts/docs/check.ts` |
| `npm run docs:ci` | `npx tsx scripts/docs/docs-ci.ts` |
| `npm run docs:coverage` | `npx tsx scripts/docs/coverage-cli.ts` |
| `npm run docs:dead-links` | `npx tsx scripts/docs/dead-docs-cli.ts` |
| `npm run docs:diff` | `npx tsx scripts/docs/docs-diff.ts` |
| `npm run docs:generate` | `npx tsx scripts/docs/generate.ts` |
| `npm run docs:mutability:check` | `npx tsx scripts/docs/mutability-check.ts` |
| `npm run docs:runtime-coverage` | `npx tsx scripts/docs/runtime-coverage-cli.ts` |
| `npm run doctor:environment` | `npx tsx scripts/check-environment-requirements.ts --scenario=all` |
| `npm run doctor:environment:production` | `npx tsx scripts/check-environment-requirements.ts --scenario=production --skip-outdated` |
| `npm run env:ownership` | `npx tsx scripts/runtime-env-ownership-report.ts` |
| `npm run fastlane` | `npx tsx scripts/fastlane-runner.ts` |
| `npm run fastlane:android:aab:signed` | `npx tsx scripts/fastlane-runner.ts android aab_signed` |
| `npm run fastlane:android:aab:signed:no-r8` | `npx tsx scripts/fastlane-runner.ts android aab_signed_no_r8` |
| `npm run fastlane:android:aab:unsigned` | `npx tsx scripts/fastlane-runner.ts android aab_unsigned` |
| `npm run fastlane:android:aab:unsigned:no-r8` | `npx tsx scripts/fastlane-runner.ts android aab_unsigned_no_r8` |
| `npm run fastlane:android:apk:signed` | `npx tsx scripts/fastlane-runner.ts android apk_signed` |
| `npm run fastlane:android:apk:signed:no-r8` | `npx tsx scripts/fastlane-runner.ts android apk_signed_no_r8` |
| `npm run fastlane:android:apk:unsigned` | `npx tsx scripts/fastlane-runner.ts android apk_unsigned` |
| `npm run fastlane:android:apk:unsigned:no-r8` | `npx tsx scripts/fastlane-runner.ts android apk_unsigned_no_r8` |
| `npm run fastlane:android:build` | `npx tsx scripts/fastlane-runner.ts android build` |
| `npm run fastlane:android:doctor` | `npx tsx scripts/fastlane-runner.ts android doctor` |
| `npm run fastlane:android:internal` | `npx tsx scripts/fastlane-runner.ts android internal` |
| `npm run fastlane:android:production` | `npx tsx scripts/fastlane-runner.ts android production` |
| `npm run fastlane:ios:build` | `npx tsx scripts/fastlane-runner.ts ios build` |
| `npm run fastlane:ios:testflight` | `npx tsx scripts/fastlane-runner.ts ios beta` |
| `npm run gates:verify` | `npx tsx scripts/generated-gate-contract.ts` |
| `npm run github:block-branches` | `npx tsx scripts/block-branch-creation.ts` |
| `npm run github:ci-policy` | `npx tsx scripts/github-ci-policy.ts` |
| `npm run github:protect` | `npx tsx scripts/protect-main-branch.ts` |
| `npm run gova:artifact:verify` | `npx tsx scripts/verify-gova-artifact.ts` |
| `npm run gova:tree` | `npx tsx scripts/build-gova-deployment-tree.ts` |
| `npm run gova:tree:check` | `npx tsx scripts/build-gova-deployment-tree.ts --check` |
| `npm run intelligence:retrain` | `npx tsx scripts/retrain-project-intelligence.ts` |
| `npm run ios:push:validate` | `npx tsx packages/native-core/scripts/validate-ios-push-policy.ts` |
| `npm run ios:spm:normalize` | `npx tsx packages/native-core/scripts/normalize-capacitor-spm-paths.ts` |
| `npm run lint` | `eslint .` |
| `npm run local-agent:cleanup` | `npx tsx scripts/local-agent-cleanup.ts` |
| `npm run local-agent:coordination` | `npx tsx scripts/local-agent-coordination.ts` |
| `npm run local-agent:device:discover` | `npx tsx scripts/local-agent-device-discovery.ts` |
| `npm run local-agent:direct:bootstrap` | `npx tsx scripts/local-agent-direct-bootstrap.ts` |
| `npm run local-agent:direct:daemon` | `npx tsx scripts/local-agent-direct-daemon.ts` |
| `npm run local-agent:direct:doctor` | `npx tsx scripts/local-agent-direct-cli.ts doctor` |
| `npm run local-agent:direct:install` | `npx tsx scripts/install-local-agent-direct-service.ts` |
| `npm run local-agent:direct:key:rotate` | `npx tsx scripts/local-agent-direct-cli.ts key-rotate` |
| `npm run local-agent:direct:key:status` | `npx tsx scripts/local-agent-direct-cli.ts key-status` |
| `npm run local-agent:direct:kill-switch` | `npx tsx scripts/local-agent-direct-cli.ts kill-switch` |
| `npm run local-agent:direct:restart` | `npx tsx scripts/local-agent-direct-cli.ts restart` |
| `npm run local-agent:direct:revoke` | `npx tsx scripts/local-agent-direct-cli.ts revoke` |
| `npm run local-agent:direct:revoke-all` | `npx tsx scripts/local-agent-direct-cli.ts revoke-all` |
| `npm run local-agent:direct:sessions` | `npx tsx scripts/local-agent-direct-cli.ts sessions` |
| `npm run local-agent:direct:start` | `npx tsx scripts/local-agent-direct-cli.ts start` |
| `npm run local-agent:direct:status` | `npx tsx scripts/local-agent-direct-cli.ts status` |
| `npm run local-agent:direct:stop` | `npx tsx scripts/local-agent-direct-cli.ts stop` |
| `npm run local-agent:dispatch:check` | `npx tsx scripts/local-agent-dispatch-check.ts` |
| `npm run local-agent:doctor` | `npx tsx scripts/local-agent-doctor.ts` |
| `npm run local-agent:host:backup` | `npx tsx scripts/local-agent-host-backup.ts` |
| `npm run local-agent:host:restore` | `npx tsx scripts/local-agent-host-restore.ts` |
| `npm run local-agent:status` | `npx tsx scripts/local-agent-status.ts` |
| `npm run local-agent:watch` | `npx tsx scripts/local-agent-watch.ts` |
| `npm run local-agent:watch:window` | `bash packages/local-agent-core/scripts/watch-window.sh` |
| `npm run maplibre:sync` | `npx tsx scripts/sync-maplibre-worker.ts` |
| `npm run notifications:check:local` | `npx tsx scripts/check-localhost-notifications.ts` |
| `npm run notifications:deploy` | `npx tsx scripts/deploy-notifications-service.ts` |
| `npm run notifications:tokens:dedupe` | `npx tsx packages/data-core/src/tooling/enforce-notification-token-cardinality.ts` |
| `npm run orders:deploy` | `npx tsx scripts/deploy-orders-service.ts` |
| `npm run ota:check` | `npx tsx scripts/ensure-release-command-secrets.ts google-play ota && npx tsx packages/ota-core/scripts/ota-publish.ts --dry-run` |
| `npm run ota:keygen` | `npx tsx packages/ota-core/scripts/ota-keygen.ts` |
| `npm run ota:publish` | `npx tsx scripts/ensure-release-command-secrets.ts google-play ota && npx tsx packages/ota-core/scripts/ota-publish.ts` |
| `npm run ota:revoke` | `npx tsx scripts/ensure-release-command-secrets.ts ota-storage ota-signing && npx tsx packages/ota-core/scripts/ota-revoke.ts` |
| `npm run ota:self-test` | `npx tsx scripts/run-ota-self-test.ts --r2` |
| `npm run ota:self-test:local` | `npx tsx scripts/run-ota-self-test.ts` |
| `npm run ota:status` | `npx tsx scripts/ensure-release-command-secrets.ts ota-storage && npx tsx packages/ota-core/scripts/ota-status.ts` |
| `npm run ota:sync:cors` | `npx tsx scripts/ensure-release-command-secrets.ts ota-cloudflare && npx tsx packages/ota-core/scripts/sync-cors.ts` |
| `npm run prepare` | `git config core.hooksPath .githooks \|\| exit 0` |
| `npm run preview:static` | `npx tsx packages/ota-core/scripts/serve-static.ts` |
| `npm run products:deploy` | `npx tsx scripts/deploy-products-service.ts` |
| `npm run profiles:deploy` | `npx tsx scripts/deploy-profiles-service.ts` |
| `npm run provision:mobile-push` | `npx tsx scripts/provision-mobile-push-credentials.ts` |
| `npm run r2:migrate:folders` | `npx tsx packages/data-core/src/tooling/migrate-r2-cloud-folders.ts` |
| `npm run r2:migrate:images` | `npx tsx packages/data-core/src/tooling/migrate-r2-image-public-url.ts` |
| `npm run r2:sync:cors` | `npx tsx packages/storage-core/scripts/sync-cors.ts` |
| `npm run release:android` | `npx tsx scripts/release-android.ts` |
| `npm run release:check` | `npx tsx scripts/check-deployed-release.ts` |
| `npm run runtime:check` | `npx tsx scripts/runtime/check.ts` |
| `npm run runtime:check:android` | `npx tsx scripts/runtime/check.ts android` |
| `npm run runtime:check:changed` | `npx tsx scripts/runtime/check.ts changed` |
| `npm run runtime:check:dev` | `npx tsx scripts/runtime/check.ts dev` |
| `npm run runtime:check:ios` | `npx tsx scripts/runtime/check.ts ios` |
| `npm run runtime:check:static` | `npx tsx scripts/runtime/check.ts static` |
| `npm run runtime:check:web` | `npx tsx scripts/runtime/check.ts web` |
| `npm run runtime:compatibility:check` | `npx tsx scripts/runtime-compatibility-reference.ts` |
| `npm run secrets:backup` | `npx tsx scripts/backup-project-secrets.ts` |
| `npm run secrets:key:init` | `npx tsx scripts/initialize-secret-archive-key.ts` |
| `npm run secrets:restore` | `npx tsx scripts/restore-project-secrets.ts` |
| `npm run secrets:verify` | `npx tsx scripts/verify-project-secrets.ts` |
| `npm run serve:out` | `npx tsx packages/ota-core/scripts/serve-static.ts` |
| `npm run serve:static` | `npx tsx packages/ota-core/scripts/serve-static.ts` |
| `npm run server:stop` | `npx tsx scripts/stop-dev-server.ts` |
| `npm run services:build` | `npx tsx scripts/build-all-services.ts` |
| `npm run services:sync` | `npx tsx scripts/sync-all-service-sources.ts` |
| `npm run services:verify` | `npx tsx scripts/verify-service-mirrors.ts` |
| `npm run smoke:deployed` | `npx tsx scripts/check-deployed-origins.ts` |
| `npm run smoke:production` | `npx tsx scripts/check-production-smoke.ts` |
| `npm run smoke:services` | `npx tsx scripts/check-service-smoke.ts` |
| `npm run start` | `next start` |
| `npm run sub2main:deploy` | `npx tsx scripts/deploy-sub2main.ts` |
| `npm run sub2main:recreate-vercel-project` | `npx tsx scripts/recreate-sub2main-vercel-project.ts` |
| `npm run submain:deploy` | `npx tsx scripts/deploy-submain.ts` |
| `npm run submain:recreate-vercel-project` | `npx tsx scripts/recreate-submain-vercel-project.ts` |
| `npm run test` | `npx tsx scripts/run-generated-gate.ts test` |
| `npm run test:account-bridge` | `npx tsx packages/account-bridge/src/tests/index.test.ts && npx tsx packages/account-bridge/src/tests/mobile-push.test.ts && npx tsx packages/account-bridge/src/tests/mobile-push-channel-parity.test.ts` |
| `npm run test:account-declarations` | `npx tsx packages/account-declarations/src/tests/index.test.ts` |
| `npm run test:account-deletion-registry` | `npx tsx packages/data-core/src/domains/account-deletion/tests/account-deletion-registry.contract.test.ts` |
| `npm run test:account-deletion-schema` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/data-core/src/domains/account-deletion/tests/account-deletion-query-schema.contract.test.ts` |
| `npm run test:api-core` | `npx tsx src/core/api/tests/user-facing-api-error.test.ts && npx tsx src/core/api/tests/production-deploy-concurrency-logging.test.ts && npx tsx src/core/api/tests/compatibility-boundary.test.ts` |
| `npm run test:architecture-core` | `npx tsx packages/architecture-core/src/tests/index.test.ts && npx tsx scripts/architecture/application-features-attack.test.ts` |
| `npm run test:auth-core` | `npx tsx packages/auth-core/src/tests/index.test.ts` |
| `npm run test:auth-email-uniqueness` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/data-core/src/domains/auth/tests/email-uniqueness.test.ts` |
| `npm run test:backup-core` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/backup-core/src/tests/index.test.ts` |
| `npm run test:branding-core` | `npm run branding:generate && npx tsx packages/branding-core/src/tests/index.test.ts` |
| `npm run test:cart-pricing` | `npx tsx src/features/cart/tests/cart-catalogue-pricing.test.ts` |
| `npm run test:catalog-core` | `npx tsx packages/catalog-core/src/tests/index.test.ts` |
| `npm run test:catalog-display` | `npx tsx scripts/test-catalog-display.ts` |
| `npm run test:catalog-studio` | `cross-env NODE_OPTIONS=<redacted> npx tsx src/features/catalog-studio/tests/catalog-studio.test.ts` |
| `npm run test:categories` | `npx tsx scripts/test-categories.ts` |
| `npm run test:cloud-accounts` | `npx tsx src/features/super-admin/tests/cloud-accounts-emails.test.ts` |
| `npm run test:composition-ports` | `npx tsx src/core/composition/tests/ports-registry.test.ts` |
| `npm run test:compositions` | `npm run test:notifications-composition && npm run test:products-composition && npm run test:orders-composition && npm run test:profiles-composition && npm run test:submain-composition && npm run test:sub2main-composition` |
| `npm run test:console-command-parity` | `npx tsx src/features/release-commands/tests/console-command-parity.test.ts` |
| `npm run test:control` | `npx tsx scripts/tests/control-service.test.ts` |
| `npm run test:data-core` | `npm run test:data-health-core && npm run test:backup-core && npm run test:sqlite-reconnect && npx tsx packages/data-core/src/tests/index.test.ts && npx tsx packages/data-core/src/tests/schema-parity.test.ts` |
| `npm run test:data-health` | `npx tsx scripts/test-data-health-environment.ts && cross-env NODE_OPTIONS=<redacted> npx tsx src/features/data-health/tests/development-guard.test.ts && npx tsx packages/data-core/src/domains/data-health/tests/data-health-policy.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx packages/data-core/src/domains/data-health/tests/order-purge.test.ts` |
| `npm run test:data-health-core` | `npx tsx packages/data-health-core/src/tests/index.test.ts` |
| `npm run test:delivery-planner` | `npx tsx src/features/cart/tests/multi-seller-delivery-planner.test.ts` |
| `npm run test:deploy-all-resume` | `npx tsx scripts/tests/deploy-all-resume.test.ts` |
| `npm run test:deploy-runbook-execution` | `npx tsx scripts/architecture/deploy-runbook-execution.test.ts` |
| `npm run test:deployment-tools` | `npx tsx scripts/tests/vercel-deployment-monitor.test.ts && npx tsx scripts/tests/run-deployment-npm-script.test.ts && npx tsx scripts/tests/deploy-all.test.ts && npx tsx scripts/tests/deploy-state-revision.test.ts && npm run test:deploy-all-resume && npx tsx scripts/tests/deploy-push.test.ts && npx tsx scripts/tests/vercelignore-contract.test.ts && npx tsx scripts/tests/pipeline-coverage.test.ts && npx tsx scripts/tests/github-ci-policy.test.ts && npx tsx scripts/tests/vercel-deployment-guards.test.ts && npx tsx scripts/tests/secret-presence-status.test.ts && npx tsx scripts/tests/fastlane-secret-policy.test.ts && npx tsx scripts/tests/release-secret-wiring.test.ts && npx tsx scripts/tests/expected-deployed-release-marker.test.ts && npm run github:ci-policy` |
| `npm run test:dev-cloud-backup` | `cross-env NODE_OPTIONS=<redacted> npx tsx src/features/dev-cloud-backup/tests/dev-cloud-backup-policy.test.ts` |
| `npm run test:dev-core` | `npx tsx packages/dev-core/src/tests/index.test.ts` |
| `npm run test:env-core` | `npx tsx packages/env-core/src/tests/index.test.ts` |
| `npm run test:favorites` | `npx tsx src/features/favorites/tests/favorites.test.ts && npx tsx src/features/favorites/tests/favorites-local-storage-contract.test.ts` |
| `npm run test:feature-flags` | `npx tsx src/features/feature-flags/tests/feature-flag-service.test.ts` |
| `npm run test:featured-marquee-core` | `npx tsx packages/featured-marquee-core/src/tests/index.test.ts` |
| `npm run test:follow` | `cross-env NODE_OPTIONS=<redacted> ASOL_SESSION_SIGNING_SECRET=<redacted> ASOL_NOTIFICATION_GRANT_SECRET=<redacted> npx tsx src/features/follow/tests/follower-notification.test.ts` |
| `npm run test:format-core` | `npx tsx packages/format-core/src/tests/index.test.ts` |
| `npm run test:google-play-store-assets-core` | `npx tsx packages/google-play-store-assets-core/src/tests/index.test.ts` |
| `npm run test:gova-deployment-core` | `npx tsx packages/gova-deployment-core/src/tests/index.test.ts` |
| `npm run test:hero-slider-core` | `npx tsx packages/hero-slider-core/src/tests/index.test.ts && npx tsx src/features/advertisements/presentation/hero-slider.test.ts && npx tsx src/features/super-admin/presentation/super-admin-hero-slider-save.test.ts` |
| `npm run test:i18n-arabic-only-routes` | `npx tsx scripts/test-i18n-arabic-only-routes.ts` |
| `npm run test:image-upload-queue` | `npx tsx src/features/storage/tests/image-upload-queue.test.ts` |
| `npm run test:import-without-composition` | `npx tsx scripts/architecture/import-without-composition.test.ts` |
| `npm run test:installation-bootstrap` | `npx tsx src/shared/installation/tests/installation-policy.test.ts` |
| `npm run test:local-agent-core` | `npx tsx packages/local-agent-core/src/tests/index.test.ts && npx tsx packages/local-agent-core/src/tests/direct.test.ts && npx tsx packages/local-agent-core/src/tests/direct-transport.test.ts && npx tsx packages/local-agent-core/src/tests/direct-runtime.test.ts` |
| `npm run test:local-agent-workflows` | `npx tsx scripts/tests/local-agent-control-plane.test.ts` |
| `npm run test:map-core` | `npx tsx packages/map-core/src/tests/index.test.ts` |
| `npm run test:marketplace-orders` | `npx tsx packages/data-core/src/domains/marketplace-orders/tests/storage-profile-integration.test.ts && npx tsx packages/data-core/src/domains/marketplace-orders/tests/schema-contract.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx packages/data-core/src/domains/marketplace-orders/tests/list-for-user.test.ts && npx tsx packages/data-core/src/domains/marketplace-orders/tests/marketplace-orders.test.ts && npx tsx packages/data-core/src/domains/marketplace-orders/tests/delivery-rejection.test.ts && npx tsx packages/data-core/src/domains/marketplace-orders/tests/requirements-coverage.test.ts && npx tsx packages/data-core/src/domains/marketplace-orders/tests/security-and-invariants.test.ts && npx tsx packages/data-core/src/domains/marketplace-orders/tests/shipping-quotes.test.ts && npx tsx packages/data-core/src/domains/marketplace-orders/tests/unified-delivery-plan.test.ts && npx tsx packages/data-core/src/domains/marketplace-orders/tests/order-details-visibility.test.ts` |
| `npm run test:native-core` | `npx tsx packages/native-core/src/tests/index.test.ts` |
| `npm run test:notifications` | `npx tsx src/features/notifications/tests/notification-module-boundary.test.ts && npx tsx src/features/notifications/tests/integration/notification-flow.integration.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx packages/data-core/src/domains/notifications/tests/notification-token-cardinality.test.ts && npx tsx src/features/notifications/tests/notification-builder.test.ts && npx tsx src/features/notifications/tests/notification-sound-contract.test.ts && npx tsx src/features/notifications/tests/android-notification-inbox-contract.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx src/features/notifications/tests/notification-provider-registry.test.ts && npx tsx src/features/notifications/tests/push-token-kind.test.ts && npx tsx src/features/notifications/tests/notification-permission-prompt-policy.test.ts && npx tsx src/features/notifications/tests/notification-local-storage-contract.test.ts && npx tsx src/features/notifications/tests/notification-center-model.test.ts && npx tsx src/features/notifications/tests/notifications-filter-tabs.test.ts && npx tsx src/features/notifications/tests/notifications-service-module-contract.test.ts && npx tsx src/features/notifications/tests/dev-notification-bridge.test.ts && npx tsx packages/account-bridge/src/tests/notification-bridge.test.ts && npx tsx src/features/notifications/tests/notification-broadcast-delivery.test.ts && cross-env NODE_OPTIONS=<redacted> ASOL_NOTIFICATION_GRANT_SECRET=<redacted> NEXT_PUBLIC_SUPER_ADMIN_UID=<redacted> NEXT_PUBLIC_SUPER_ADMIN_PHONE=<redacted> npx tsx src/features/notifications/tests/notification-test-service.test.ts && cross-env NODE_OPTIONS=<redacted> ASOL_NOTIFICATION_GRANT_SECRET=<redacted> npx tsx src/features/notifications/tests/notification-grant.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx src/features/notifications/tests/notification-locale-routing.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx src/features/notifications/tests/web-push-provider.test.ts && cross-env NODE_OPTIONS=<redacted> ASOL_SESSION_SIGNING_SECRET=<redacted> npx tsx src/features/specialty-chat/tests/specialty-chat-signatures.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx src/features/notifications/tests/mobile-push-crypto.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx src/features/notifications/tests/mobile-push-unlock.service.test.ts && npx tsx src/features/notifications/tests/mobile-push-contract.test.ts && npx tsx src/features/notifications/tests/notification-channel-parity.test.ts && npx tsx src/features/notifications/tests/notification-account-surface.test.ts` |
| `npm run test:notifications-composition` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/notifications-composition/src/tests/index.test.ts` |
| `npm run test:notifications-core` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/notifications-core/src/tests/index.test.ts` |
| `npm run test:observability-core` | `npx tsx packages/observability-core/src/tests/index.test.ts` |
| `npm run test:orders-composition` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/orders-composition/src/tests/index.test.ts` |
| `npm run test:orders-core` | `npx tsx packages/orders-core/src/tests/index.test.ts` |
| `npm run test:orders-module` | `npx tsx packages/orders-core/src/tests/orders-service-module-contract.test.ts && npx tsx src/features/orders/tests/order-party-helpers.test.ts` |
| `npm run test:ota-core` | `npx tsx packages/ota-core/src/tests/index.test.ts` |
| `npm run test:overlay-chrome` | `npx tsx src/shared/ui/tests/overlay-chrome.test.ts && npm run test:super-admin-ui-inspector` |
| `npm run test:page-save-core` | `npx tsx packages/page-save-core/src/tests/index.test.ts && npx tsx packages/page-save-core/src/tests/header-visibility.test.ts && npx tsx packages/page-save-core/src/tests/journal-recovery.test.ts && npx tsx src/features/page-save/tests/page-save-ownership.test.ts && npx tsx src/features/page-save/tests/page-save-write-surface.test.ts` |
| `npm run test:page-snapshot-core` | `npx tsx packages/page-snapshot-core/src/tests/index.test.ts` |
| `npm run test:password-recovery` | `npx tsx src/features/password-recovery/tests/password-recovery-policy.test.ts` |
| `npm run test:phone-field` | `npx tsx src/shared/phone/tests/phone-field-model.test.ts` |
| `npm run test:phone-verification-policy` | `npx tsx src/features/auth/tests/phone-verification-policy.test.ts` |
| `npm run test:product-core` | `npx tsx packages/product-core/src/tests/index.test.ts` |
| `npm run test:product-style-core` | `npx tsx packages/product-style-core/src/tests/index.test.ts` |
| `npm run test:products-composition` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/products-composition/src/tests/index.test.ts` |
| `npm run test:products-module` | `npx tsx src/features/product/tests/products-service-module-contract.test.ts` |
| `npm run test:profile-preview-responsive` | `npx tsx src/features/profile/tests/profile-preview-responsive.test.ts` |
| `npm run test:profiles-composition` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/profiles-composition/src/tests/index.test.ts` |
| `npm run test:profiles-module` | `npx tsx src/features/profile/tests/profiles-service-module-contract.test.ts` |
| `npm run test:r2-storage` | `npx tsx packages/storage-core/scripts/validate-topology.ts` |
| `npm run test:registration-success-flow` | `npx tsx src/features/auth/tests/registration-success-flow.test.ts` |
| `npm run test:release-commands` | `cross-env NODE_ENV=<redacted> NODE_OPTIONS=<redacted> npx tsx src/features/release-commands/tests/release-commands.test.ts` |
| `npm run test:release-core` | `npx tsx packages/release-core/src/tests/index.test.ts` |
| `npm run test:runtime-compatibility` | `npx tsx scripts/tests/runtime-compatibility-reference.test.ts && npx tsx scripts/tests/runtime-compatibility-policy.test.ts` |
| `npm run test:runtime-context` | `npx tsx scripts/test-runtime-context.ts && npx tsx packages/data-core/src/core/database-runtime-policy.test.ts` |
| `npm run test:secrets-core` | `npx tsx packages/secrets-core/src/tests/index.test.ts` |
| `npm run test:seller-discounts` | `npx tsx src/features/seller-discounts/tests/seller-discount-engine.test.ts` |
| `npm run test:service-bridge` | `npx tsx packages/account-bridge/src/tests/service-bridge.client.test.ts` |
| `npm run test:service-mirror-core` | `npx tsx packages/service-mirror-core/src/tests/index.test.ts` |
| `npm run test:service-runtime-core` | `npx tsx packages/service-runtime-core/src/tests/index.test.ts` |
| `npm run test:settings-notifications` | `npx tsx src/features/settings/tests/notifications-settings-login-guard.test.ts && npx tsx src/features/settings/tests/notifications-settings-surface.test.ts` |
| `npm run test:shard-routing` | `npx tsx packages/data-core/src/core/database/tests/shard-sql-routing.test.ts` |
| `npm run test:sharing` | `npx tsx src/features/sharing/tests/sharing-module.test.ts && npx tsx src/features/qr-code/tests/qr-code-module.test.ts` |
| `npm run test:shipping-pricing` | `npx tsx src/features/cart/tests/shipping-pricing.test.ts` |
| `npm run test:signed-token-core` | `npx tsx packages/signed-token-core/src/tests/index.test.ts` |
| `npm run test:sqlite-reconnect` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/data-core/src/core/database/tests/cached-sqlite-connection.test.ts` |
| `npm run test:storage-core` | `npx tsx packages/storage-core/src/tests/index.test.ts` |
| `npm run test:storage-image-manager-core` | `npx tsx packages/storage-image-manager-core/src/tests/index.test.ts` |
| `npm run test:store-name-draft` | `npx tsx src/features/profile/tests/store-name-draft.test.ts && npx tsx src/features/profile/tests/profile-edit-navigation.test.ts` |
| `npm run test:sub2main-composition` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/sub2main-composition/src/tests/index.test.ts` |
| `npm run test:submain-composition` | `cross-env NODE_OPTIONS=<redacted> npx tsx packages/submain-composition/src/tests/index.test.ts` |
| `npm run test:super-admin-ui-inspector` | `npx tsx src/features/super-admin/tests/ui-attribute-inspector.test.ts` |
| `npm run test:super-admin-users` | `npx tsx src/features/super-admin/tests/super-admin-user-deletion.test.ts && npx tsx src/features/super-admin/tests/super-admin-impersonation-notification-flow.test.ts` |
| `npm run test:system-logs` | `npm run test:system-logs-core && npx tsx src/features/system-logs/tests/system-log-security.test.ts && npx tsx src/features/system-logs/tests/is-event-target-inside.test.ts && cross-env NODE_OPTIONS=<redacted> npx tsx packages/data-core/src/domains/system-logs/tests/persistent-system-log-repository.test.ts` |
| `npm run test:system-logs-core` | `npx tsx packages/system-logs-core/src/tests/index.test.ts` |
| `npm run test:trending-ribbon-core` | `npx tsx packages/trending-ribbon-core/src/tests/index.test.ts` |
| `npm run test:turso-read-retry` | `npx tsx packages/data-core/src/core/database/tests/turso-read-retry.test.ts` |
| `npm run test:vercel-deploy-core` | `npx tsx packages/vercel-deploy-core/src/tests/index.test.ts && npx tsx packages/vercel-deploy-core/src/tests/release-rollback.test.ts` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate-storage-profiles` | `npx tsx packages/storage-core/scripts/validate-storage-profiles.ts` |
| `npm run validate:app-versions` | `npx tsx packages/ota-core/scripts/validate-app-versions.ts` |
| `npm run validate:error-logging` | `npx tsx scripts/validate-error-logging.ts` |
| `npm run vercel:accounts:check` | `npx tsx scripts/check-vercel-accounts.ts` |
| `npm run vercel:function-size:check` | `npx tsx scripts/check-vercel-function-size.ts` |
| `npm run verify:all` | `npx tsx scripts/verify-all.ts` |
| `npm run verify:notifications` | `npm run architecture:check && npm run test:notifications` |
| `npm run version:validate` | `npx tsx packages/ota-core/scripts/validate-app-versions.ts` |

## Environment Key Names

- `APPAREL_PETS_R2_ACCESS_KEY_ID`
- `APPAREL_PETS_R2_ACCOUNT_ID`
- `APPAREL_PETS_R2_API_TOKEN`
- `APPAREL_PETS_R2_BUCKET_NAME`
- `APPAREL_PETS_R2_CATALOG_URI`
- `APPAREL_PETS_R2_ENDPOINT`
- `APPAREL_PETS_R2_JURISDICTION`
- `APPAREL_PETS_R2_LOCATION`
- `APPAREL_PETS_R2_PUBLIC_URL`
- `APPAREL_PETS_R2_SECRET_ACCESS_KEY`
- `APPAREL_PETS_R2_WAREHOUSE_NAME`
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID`
- `APP_STORE_CONNECT_API_KEY_KEY_FILEPATH`
- `APP_STORE_CONNECT_API_KEY_KEY_ID`
- `ASOL_ANDROID_APP_LINK_CERT_SHA256`
- `ASOL_ANDROID_KEYSTORE_FILE`
- `ASOL_ANDROID_KEYSTORE_PASSWORD`
- `ASOL_ANDROID_KEY_ALIAS`
- `ASOL_ANDROID_KEY_PASSWORD`
- `ASOL_ANDROID_PACKAGE_NAME`
- `ASOL_BASE_PATH`
- `ASOL_CAPACITOR_API_BASE_URL`
- `ASOL_CORS_ORIGINS`
- `ASOL_DEVICE_DISCOVERY_PORT`
- `ASOL_DEVICE_DISCOVERY_PORT_PASSWORD`
- `ASOL_DEVICE_DISCOVERY_R2_KEY`
- `ASOL_IOS_BUNDLE_ID`
- `ASOL_IOS_EXPORT_METHOD`
- `ASOL_IOS_TEAM_ID`
- `ASOL_MOBILE_PUSH_CREDENTIAL_BLOB`
- `ASOL_MOBILE_PUSH_UNLOCK_KEY`
- `ASOL_MODE`
- `ASOL_NOTIFICATION_GRANT_SECRET`
- `ASOL_OTA_PUBLIC_KEY`
- `ASOL_OTA_R2_ACCESS_KEY_ID`
- `ASOL_OTA_R2_ACCOUNT_ID`
- `ASOL_OTA_R2_API_TOKEN`
- `ASOL_OTA_R2_BUCKET_NAME`
- `ASOL_OTA_R2_CATALOG_URI`
- `ASOL_OTA_R2_ENDPOINT`
- `ASOL_OTA_R2_JURISDICTION`
- `ASOL_OTA_R2_LOCATION`
- `ASOL_OTA_R2_PREFIX`
- `ASOL_OTA_R2_PUBLIC_URL`
- `ASOL_OTA_R2_SECRET_ACCESS_KEY`
- `ASOL_OTA_R2_WAREHOUSE_NAME`
- `ASOL_OTA_SIGNING_PRIVATE_KEY`
- `ASOL_SESSION_SIGNING_SECRET`
- `ASOL_STATIC_PREVIEW_API_BASE_URL`
- `CAPACITOR_SERVER_URL`
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD`
- `FASTLANE_USER`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_CLIENT_ID`
- `FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64`
- `FIREBASE_ANDROID_API_KEY`
- `FIREBASE_ANDROID_APP_ID`
- `FIREBASE_ANDROID_APP_NICKNAME`
- `FIREBASE_ANDROID_CONFIGURATION_VERSION`
- `FIREBASE_ANDROID_GOOGLE_SERVICES_BASE64`
- `FIREBASE_ANDROID_OAUTH_CLIENT_IDS`
- `FIREBASE_ANDROID_PACKAGE_NAME`
- `FIREBASE_ANDROID_SHA1`
- `FIREBASE_ANDROID_SHA256`
- `FIREBASE_FCM_SENDER_ID`
- `FIREBASE_IOS_APP_ID`
- `FIREBASE_IOS_BUNDLE_ID`
- `FIREBASE_IOS_ENCODED_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PROJECT_NAME`
- `FIREBASE_PROJECT_NUMBER`
- `FIREBASE_STORAGE_BUCKET`
- `GITHUB_ADMIN_TOKEN`
- `GITHUB_REPOSITORY`
- `GOOGLE_PLAY_JSON_KEY_FILE`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_UNIQUE_ID`
- `GOOGLE_PLAY_TRACK`
- `NEXT_PUBLIC_ASOL_API_BASE_URL`
- `NEXT_PUBLIC_ASOL_APP_STORE_URL`
- `NEXT_PUBLIC_ASOL_MOBILE_PUSH_CREDENTIAL_BLOB`
- `NEXT_PUBLIC_ASOL_NATIVE_VERSION`
- `NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL`
- `NEXT_PUBLIC_ASOL_ORDERS_URL`
- `NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL`
- `NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY`
- `NEXT_PUBLIC_ASOL_PRODUCTS_URL`
- `NEXT_PUBLIC_ASOL_PROFILES_URL`
- `NEXT_PUBLIC_ASOL_PUBLIC_WEB_ORIGIN`
- `NEXT_PUBLIC_ASOL_SUB2MAIN_URL`
- `NEXT_PUBLIC_ASOL_SUBMAIN_URL`
- `NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION`
- `NEXT_PUBLIC_R2_PUBLIC_URL`
- `OLD_R2_PUBLIC_URL`
- `ORDERS_CORE_DATABASE_AUTH_TOKEN`
- `ORDERS_CORE_DATABASE_URL`
- `PASSWORD_RECOVERY_GMAIL_APP_PASSWORD`
- `PASSWORD_RECOVERY_GMAIL_USER`
- `PASSWORD_RECOVERY_SIGNING_SECRET`
- `PRODUCT_R2_ACCESS_KEY_ID`
- `PRODUCT_R2_ACCOUNT_ID`
- `PRODUCT_R2_API_TOKEN`
- `PRODUCT_R2_BUCKET_NAME`
- `PRODUCT_R2_CATALOG_URI`
- `PRODUCT_R2_ENDPOINT`
- `PRODUCT_R2_JURISDICTION`
- `PRODUCT_R2_LOCATION`
- `PRODUCT_R2_PUBLIC_URL`
- `PRODUCT_R2_SECRET_ACCESS_KEY`
- `PRODUCT_R2_WAREHOUSE_NAME`
- `PROFILE_CORE_DATABASE_AUTH_TOKEN`
- `PROFILE_CORE_DATABASE_URL`
- `R2_ACCESS_KEY_ID`
- `R2_ACCOUNT_ID`
- `R2_API_TOKEN`
- `R2_BUCKET_NAME`
- `R2_CATALOG_URI`
- `R2_ENDPOINT`
- `R2_JURISDICTION`
- `R2_LOCATION`
- `R2_MIGRATION_EXTRA_URLS`
- `R2_MIGRATION_SOURCE_PUBLIC_URL`
- `R2_PUBLIC_URL`
- `R2_SECRET_ACCESS_KEY`
- `R2_WAREHOUSE_NAME`
- `SYSTEM_LOGS_ALERT_THRESHOLD`
- `SYSTEM_LOGS_ALERT_WINDOW_MS`
- `SYSTEM_LOGS_RETENTION_DAYS`
- `TURSO_ADVERTISEMENTS_AUTH_TOKEN`
- `TURSO_ADVERTISEMENTS_DATABASE_URL`
- `TURSO_API_TOKEN`
- `TURSO_AUTH_TOKEN`
- `TURSO_DATABASE_URL`
- `TURSO_NOTIFICATIONS_API_TOKEN`
- `TURSO_NOTIFICATIONS_AUTH_TOKEN`
- `TURSO_NOTIFICATIONS_DATABASE_URL`
- `TURSO_NOTIFICATIONS_ORGANIZATION`
- `TURSO_ORDERS_API_TOKEN`
- `TURSO_ORDERS_ORGANIZATION`
- `TURSO_ORGANIZATION`
- `TURSO_PRODUCT_API_TOKEN`
- `TURSO_PRODUCT_AUTH_TOKEN`
- `TURSO_PRODUCT_DATABASE_URL`
- `TURSO_PRODUCT_ORGANIZATION`
- `TURSO_PROFILES_API_TOKEN`
- `TURSO_PROFILES_ORGANIZATION`
- `VERCEL_NOTIFICATIONS_TOKEN`
- `VERCEL_ORDERS_TOKEN`
- `VERCEL_PRODUCTS_TOKEN`
- `VERCEL_PROFILES_TOKEN`
- `VERCEL_SUB2MAIN_ORG_ID`
- `VERCEL_SUB2MAIN_TOKEN`
- `VERCEL_SUBMAIN_ORG_ID`
- `VERCEL_SUBMAIN_TOKEN`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
