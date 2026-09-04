<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run docs:generate
     Validate: npm run docs:ci -->

# Command Relationship Catalog

Root npm scripts as graph nodes. Raw environment assignment values are intentionally not stored here.

| Command | Runtime targets | Invokes | Produces | Environment keys |
|---|---|---:|---|---:|
| `npm run android:backup:validate` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run android:build:debug` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run android:build:signed` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run android:device:tests` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run android:open:outputs` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run android:preflight` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run android:push:sync-assets` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run android:r8:validate` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run android:r8:verify-release` | `Android`, `Tooling` | 5 |  | 0 |
| `npm run api:inventory` | `Tooling` | 1 |  | 0 |
| `npm run app:init` | `Tooling` | 3 |  | 0 |
| `npm run architecture:check` | `Tooling` | 1 |  | 0 |
| `npm run architecture:docs` | `Tooling` | 1 |  | 0 |
| `npm run branding:generate` | `Tooling` | 1 |  | 0 |
| `npm run build` | `Tooling`, `Web` | 1 | `Next server build (.next)` | 0 |
| `npm run build:static` | `Static out`, `Tooling` | 1 | `Static export (out/)` | 0 |
| `npm run build:static:local` | `Static out`, `Tooling` | 1 | `Static export (out/)` | 1 |
| `npm run build:vercel` | `Tooling`, `Web` | 1 |  | 0 |
| `npm run cap:build` | `Android`, `iOS`, `Static out`, `Tooling` | 1 |  | 0 |
| `npm run cap:build:local` | `Android`, `iOS`, `Static out`, `Tooling` | 1 |  | 0 |
| `npm run cap:build:resume` | `Android`, `iOS`, `Static out`, `Tooling` | 1 |  | 0 |
| `npm run cap:copy` | `Android`, `iOS`, `Static out`, `Tooling` | 5 |  | 0 |
| `npm run cap:open:android` | `Android`, `Static out`, `Tooling` | 0 |  | 0 |
| `npm run cap:open:ios` | `iOS`, `Static out`, `Tooling` | 0 |  | 0 |
| `npm run cap:prepare:android` | `Android`, `Static out`, `Tooling` | 2 |  | 0 |
| `npm run cap:run:clean:android` | `Android`, `Static out`, `Tooling` | 1 |  | 0 |
| `npm run cap:run:clean:ios` | `iOS`, `Static out`, `Tooling` | 1 |  | 0 |
| `npm run cap:sync` | `Android`, `iOS`, `Static out`, `Tooling` | 6 |  | 0 |
| `npm run cap:verify-defaults` | `Android`, `iOS`, `Static out`, `Tooling` | 4 |  | 0 |
| `npm run catalog:schemas` | `Tooling` | 1 |  | 0 |
| `npm run catalog:validate` | `Tooling` | 2 |  | 0 |
| `npm run category:validate` | `Tooling` | 1 |  | 0 |
| `npm run ci:coverage` | `Tooling` | 1 |  | 0 |
| `npm run control:build` | `Tooling` | 1 |  | 0 |
| `npm run control:deploy` | `Tooling` | 1 |  | 0 |
| `npm run control:smoke` | `Tooling` | 1 |  | 0 |
| `npm run control:sync` | `Tooling` | 1 |  | 0 |
| `npm run control:verify` | `Tooling` | 3 |  | 0 |
| `npm run coordinator:email` | `Tooling` | 1 |  | 0 |
| `npm run data-access:sync-public` | `Tooling` | 1 |  | 0 |
| `npm run db:create:product` | `Tooling` | 1 |  | 0 |
| `npm run db:create:profile` | `Tooling` | 1 |  | 0 |
| `npm run db:create:sqlite` | `Tooling` | 1 |  | 0 |
| `npm run db:drizzle` | `Tooling` | 1 |  | 0 |
| `npm run db:drop:factory-reset` | `Tooling` | 1 |  | 0 |
| `npm run db:drop:factory-reset:cloud` | `Tooling` | 1 |  | 0 |
| `npm run db:ensure` | `Tooling` | 1 |  | 0 |
| `npm run db:migrate:orders` | `Tooling` | 1 |  | 0 |
| `npm run db:migrate:phones-e164` | `Tooling` | 1 |  | 0 |
| `npm run db:migrate:product` | `Tooling` | 1 |  | 0 |
| `npm run db:migrate:product-image-urls` | `Tooling` | 1 |  | 0 |
| `npm run db:migrate:profiles` | `Tooling` | 1 |  | 0 |
| `npm run db:migrate:users` | `Tooling` | 1 |  | 0 |
| `npm run db:provision:turso` | `Tooling` | 1 |  | 1 |
| `npm run db:push:vercel-env` | `Tooling`, `Web` | 1 |  | 0 |
| `npm run db:reset:advertisements` | `Tooling` | 1 |  | 0 |
| `npm run db:reset:advertisements:cloud` | `Tooling` | 1 |  | 0 |
| `npm run db:schema:sync` | `Tooling` | 1 |  | 1 |
| `npm run db:schema:sync:release` | `Tooling` | 1 |  | 2 |
| `npm run db:setup:turso` | `Tooling` | 1 |  | 0 |
| `npm run db:sync:users` | `Tooling` | 1 |  | 0 |
| `npm run db:verify:sqlite` | `Tooling` | 1 |  | 0 |
| `npm run db:verify:turso` | `Tooling` | 1 |  | 0 |
| `npm run dependencies:install` | `Tooling` | 1 |  | 0 |
| `npm run dependencies:outdated` | `Tooling` | 1 |  | 0 |
| `npm run deploy:all` | `Tooling`, `Web` | 1 |  | 0 |
| `npm run deploy:push:fast` | `Tooling`, `Web` | 1 |  | 0 |
| `npm run dev` | `Development`, `Tooling` | 0 |  | 0 |
| `npm run dev:checked` | `Development`, `Tooling` | 4 |  | 0 |
| `npm run dev:distributed` | `Tooling` | 1 |  | 0 |
| `npm run dev:distributed:smoke` | `Tooling` | 1 |  | 0 |
| `npm run docs:check` | `Tooling` | 1 |  | 0 |
| `npm run docs:ci` | `Tooling` | 1 |  | 0 |
| `npm run docs:coverage` | `Tooling` | 1 |  | 0 |
| `npm run docs:dead-links` | `Tooling` | 1 |  | 0 |
| `npm run docs:diff` | `Tooling` | 1 |  | 0 |
| `npm run docs:generate` | `Tooling` | 1 |  | 0 |
| `npm run docs:mutability:check` | `Tooling` | 1 |  | 0 |
| `npm run docs:runtime-coverage` | `Tooling` | 1 |  | 0 |
| `npm run doctor:environment` | `Tooling` | 1 |  | 0 |
| `npm run doctor:environment:production` | `Tooling` | 1 |  | 0 |
| `npm run dom:id:check` | `Tooling` | 1 |  | 0 |
| `npm run dom:id:write` | `Tooling` | 1 |  | 0 |
| `npm run env:ownership` | `Tooling` | 1 |  | 0 |
| `npm run fastlane` | `Tooling` | 1 |  | 0 |
| `npm run fastlane:android:aab:signed` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:aab:signed:no-r8` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:aab:unsigned` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:aab:unsigned:no-r8` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:apk:signed` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:apk:signed:no-r8` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:apk:unsigned` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:apk:unsigned:no-r8` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:build` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run fastlane:android:doctor` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run fastlane:android:internal` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:android:production` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run fastlane:ios:build` | `iOS`, `Tooling` | 1 | `iOS archive/store artifact` | 0 |
| `npm run fastlane:ios:testflight` | `iOS`, `Tooling` | 1 | `iOS archive/store artifact` | 0 |
| `npm run gates:verify` | `Tooling` | 1 |  | 0 |
| `npm run github:block-branches` | `Tooling` | 1 |  | 0 |
| `npm run github:ci-policy` | `Tooling` | 1 |  | 0 |
| `npm run github:protect` | `Tooling` | 1 |  | 0 |
| `npm run gova:artifact:verify` | `Tooling` | 1 |  | 0 |
| `npm run gova:cors:push` | `Tooling` | 1 |  | 0 |
| `npm run gova:tree` | `Tooling` | 1 |  | 0 |
| `npm run gova:tree:check` | `Tooling` | 1 |  | 0 |
| `npm run intelligence:retrain` | `Tooling` | 1 |  | 0 |
| `npm run ios:push:validate` | `iOS`, `Tooling` | 1 |  | 0 |
| `npm run ios:spm:normalize` | `iOS`, `Tooling` | 1 |  | 0 |
| `npm run lint` | `Tooling` | 0 |  | 0 |
| `npm run main:deploy` | `Tooling` | 1 |  | 0 |
| `npm run maplibre:sync` | `Tooling` | 1 |  | 0 |
| `npm run notifications:check:local` | `Tooling` | 1 |  | 0 |
| `npm run notifications:deploy` | `Independent services`, `Tooling` | 1 |  | 0 |
| `npm run notifications:tokens:dedupe` | `Tooling` | 1 |  | 0 |
| `npm run orders:deploy` | `Independent services`, `Tooling` | 1 |  | 0 |
| `npm run ota:check` | `Static out`, `Tooling` | 2 |  | 0 |
| `npm run ota:keygen` | `Static out`, `Tooling` | 1 |  | 0 |
| `npm run ota:publish` | `Static out`, `Tooling` | 2 |  | 0 |
| `npm run ota:revoke` | `Static out`, `Tooling` | 2 |  | 0 |
| `npm run ota:self-test` | `Static out`, `Tooling` | 1 |  | 0 |
| `npm run ota:self-test:local` | `Static out`, `Tooling` | 1 |  | 0 |
| `npm run ota:status` | `Static out`, `Tooling` | 2 |  | 0 |
| `npm run ota:sync:cors` | `Static out`, `Tooling` | 2 |  | 0 |
| `npm run prepare` | `Tooling` | 0 |  | 0 |
| `npm run preview:static` | `Static out`, `Tooling` | 1 |  | 0 |
| `npm run products:deploy` | `Independent services`, `Tooling` | 1 |  | 0 |
| `npm run profiles:deploy` | `Independent services`, `Tooling` | 1 |  | 0 |
| `npm run provision:mobile-push` | `Tooling` | 1 |  | 0 |
| `npm run r2:migrate:folders` | `Tooling` | 1 |  | 0 |
| `npm run r2:migrate:images` | `Tooling` | 1 |  | 0 |
| `npm run r2:sync:cors` | `Tooling` | 1 |  | 0 |
| `npm run release:android` | `Android`, `Tooling` | 1 | `Android release package (APK/AAB)` | 0 |
| `npm run release:check` | `Tooling` | 1 |  | 0 |
| `npm run runtime:check` | `Tooling` | 1 |  | 0 |
| `npm run runtime:check:android` | `Android`, `Tooling` | 1 |  | 0 |
| `npm run runtime:check:changed` | `Tooling` | 1 |  | 0 |
| `npm run runtime:check:dev` | `Tooling` | 1 |  | 0 |
| `npm run runtime:check:ios` | `iOS`, `Tooling` | 1 |  | 0 |
| `npm run runtime:check:static` | `Static out`, `Tooling` | 1 |  | 0 |
| `npm run runtime:check:web` | `Tooling` | 1 |  | 0 |
| `npm run runtime:compatibility:check` | `Tooling` | 1 |  | 0 |
| `npm run secrets:backup` | `Tooling` | 1 |  | 0 |
| `npm run secrets:key:init` | `Tooling` | 1 |  | 0 |
| `npm run secrets:restore` | `Tooling` | 1 |  | 0 |
| `npm run secrets:verify` | `Tooling` | 1 |  | 0 |
| `npm run serve:out` | `Static out`, `Tooling` | 1 |  | 0 |
| `npm run serve:static` | `Static out`, `Tooling` | 1 |  | 0 |
| `npm run server:stop` | `Tooling` | 1 |  | 0 |
| `npm run services:build` | `Tooling` | 1 |  | 0 |
| `npm run services:sync` | `Tooling` | 1 |  | 0 |
| `npm run services:verify` | `Tooling` | 1 |  | 0 |
| `npm run smoke:deployed` | `Tooling` | 2 |  | 0 |
| `npm run smoke:owned-reads` | `Tooling` | 1 |  | 0 |
| `npm run smoke:production` | `Tooling` | 1 |  | 0 |
| `npm run smoke:services` | `Tooling` | 1 |  | 0 |
| `npm run start` | `Tooling`, `Web` | 0 |  | 0 |
| `npm run sub2main:deploy` | `Independent services`, `Tooling` | 1 |  | 0 |
| `npm run sub2main:recreate-vercel-project` | `Tooling`, `Web` | 1 |  | 0 |
| `npm run submain:deploy` | `Independent services`, `Tooling` | 1 |  | 0 |
| `npm run submain:recreate-vercel-project` | `Tooling`, `Web` | 1 |  | 0 |
| `npm run test` | `Tooling` | 1 |  | 0 |
| `npm run test:account-bridge` | `Tooling` | 3 |  | 0 |
| `npm run test:account-declarations` | `Tooling` | 1 |  | 0 |
| `npm run test:account-deletion-registry` | `Tooling` | 1 |  | 0 |
| `npm run test:account-deletion-schema` | `Tooling` | 1 |  | 1 |
| `npm run test:api-core` | `Tooling` | 3 |  | 0 |
| `npm run test:architecture-core` | `Tooling` | 2 |  | 0 |
| `npm run test:auth-core` | `Tooling` | 1 |  | 0 |
| `npm run test:auth-email-uniqueness` | `Tooling` | 1 |  | 1 |
| `npm run test:backup-core` | `Tooling` | 1 |  | 1 |
| `npm run test:branding-core` | `Tooling` | 2 |  | 0 |
| `npm run test:cart-pricing` | `Tooling` | 1 |  | 0 |
| `npm run test:catalog-core` | `Tooling` | 1 |  | 0 |
| `npm run test:catalog-display` | `Tooling` | 1 |  | 0 |
| `npm run test:catalog-studio` | `Tooling` | 1 |  | 1 |
| `npm run test:categories` | `Tooling` | 1 |  | 0 |
| `npm run test:cloud-accounts` | `Tooling` | 1 |  | 0 |
| `npm run test:composition-ports` | `Tooling` | 1 |  | 0 |
| `npm run test:compositions` | `Tooling` | 6 |  | 0 |
| `npm run test:console-command-parity` | `Tooling` | 1 |  | 0 |
| `npm run test:control` | `Tooling` | 1 |  | 0 |
| `npm run test:cors-core` | `Tooling` | 1 |  | 0 |
| `npm run test:data-core` | `Tooling` | 5 |  | 0 |
| `npm run test:data-health` | `Tooling` | 4 |  | 1 |
| `npm run test:data-health-core` | `Tooling` | 1 |  | 0 |
| `npm run test:delivery-planner` | `Tooling` | 1 |  | 0 |
| `npm run test:deploy-all-resume` | `Tooling` | 1 |  | 0 |
| `npm run test:deploy-runbook-execution` | `Tooling` | 1 |  | 0 |
| `npm run test:deployment-tools` | `Tooling` | 19 |  | 0 |
| `npm run test:dev-cloud-backup` | `Tooling` | 1 |  | 1 |
| `npm run test:dev-core` | `Tooling` | 1 |  | 0 |
| `npm run test:env-core` | `Tooling` | 1 |  | 0 |
| `npm run test:favorites` | `Tooling` | 2 |  | 0 |
| `npm run test:feature-flags` | `Tooling` | 1 |  | 0 |
| `npm run test:featured-marquee-core` | `Tooling` | 1 |  | 0 |
| `npm run test:follow` | `Tooling` | 1 |  | 3 |
| `npm run test:format-core` | `Tooling` | 1 |  | 0 |
| `npm run test:google-play-store-assets-core` | `Tooling` | 1 |  | 0 |
| `npm run test:gova-deployment-core` | `Tooling` | 1 |  | 0 |
| `npm run test:hero-slider-core` | `Tooling` | 3 |  | 0 |
| `npm run test:i18n-arabic-only-routes` | `Tooling` | 1 |  | 0 |
| `npm run test:image-upload-queue` | `Tooling` | 1 |  | 0 |
| `npm run test:import-without-composition` | `Tooling` | 1 |  | 0 |
| `npm run test:installation-bootstrap` | `Tooling` | 1 |  | 0 |
| `npm run test:map-core` | `Tooling` | 1 |  | 0 |
| `npm run test:marketplace-orders` | `Tooling` | 10 |  | 1 |
| `npm run test:mirror-status-parity` | `Tooling` | 1 |  | 0 |
| `npm run test:native-core` | `Tooling` | 1 |  | 0 |
| `npm run test:notifications` | `Tooling` | 26 |  | 5 |
| `npm run test:notifications-composition` | `Tooling` | 1 |  | 1 |
| `npm run test:notifications-core` | `Tooling` | 1 |  | 1 |
| `npm run test:observability-core` | `Tooling` | 1 |  | 0 |
| `npm run test:orders-composition` | `Tooling` | 1 |  | 1 |
| `npm run test:orders-core` | `Tooling` | 1 |  | 0 |
| `npm run test:orders-module` | `Tooling` | 2 |  | 0 |
| `npm run test:ota-core` | `Tooling` | 1 |  | 0 |
| `npm run test:overlay-chrome` | `Tooling` | 2 |  | 0 |
| `npm run test:page-save-core` | `Tooling` | 5 |  | 0 |
| `npm run test:page-snapshot-core` | `Tooling` | 1 |  | 0 |
| `npm run test:password-recovery` | `Tooling` | 1 |  | 0 |
| `npm run test:phone-field` | `Tooling` | 1 |  | 0 |
| `npm run test:phone-verification-policy` | `Tooling` | 1 |  | 0 |
| `npm run test:product-core` | `Tooling` | 1 |  | 0 |
| `npm run test:product-style-core` | `Tooling` | 1 |  | 0 |
| `npm run test:products-composition` | `Tooling` | 1 |  | 1 |
| `npm run test:products-module` | `Tooling` | 1 |  | 0 |
| `npm run test:profile-preview-responsive` | `Tooling` | 1 |  | 0 |
| `npm run test:profiles-composition` | `Tooling` | 1 |  | 1 |
| `npm run test:profiles-module` | `Tooling` | 1 |  | 0 |
| `npm run test:r2-storage` | `Tooling` | 1 |  | 0 |
| `npm run test:registration-success-flow` | `Tooling` | 1 |  | 0 |
| `npm run test:release-commands` | `Tooling` | 2 |  | 2 |
| `npm run test:release-core` | `Tooling` | 3 |  | 0 |
| `npm run test:route-ownership` | `Tooling` | 1 |  | 0 |
| `npm run test:runtime-compatibility` | `Tooling` | 2 |  | 0 |
| `npm run test:runtime-context` | `Tooling` | 2 |  | 0 |
| `npm run test:secrets-core` | `Tooling` | 1 |  | 0 |
| `npm run test:seller-discounts` | `Tooling` | 1 |  | 0 |
| `npm run test:service-bridge` | `Tooling` | 1 |  | 0 |
| `npm run test:service-cors` | `Tooling` | 1 |  | 0 |
| `npm run test:service-mirror-core` | `Tooling` | 1 |  | 0 |
| `npm run test:service-runtime-core` | `Tooling` | 1 |  | 0 |
| `npm run test:settings-notifications` | `Tooling` | 2 |  | 0 |
| `npm run test:shard-routing` | `Tooling` | 1 |  | 0 |
| `npm run test:sharing` | `Tooling` | 2 |  | 0 |
| `npm run test:shipping-pricing` | `Tooling` | 1 |  | 0 |
| `npm run test:signed-token-core` | `Tooling` | 1 |  | 0 |
| `npm run test:sqlite-reconnect` | `Tooling` | 1 |  | 1 |
| `npm run test:storage-core` | `Tooling` | 1 |  | 0 |
| `npm run test:storage-image-manager-core` | `Tooling` | 1 |  | 0 |
| `npm run test:store-name-draft` | `Tooling` | 2 |  | 0 |
| `npm run test:sub2main-composition` | `Tooling` | 1 |  | 1 |
| `npm run test:submain-composition` | `Tooling` | 1 |  | 1 |
| `npm run test:super-admin-ui-inspector` | `Tooling` | 1 |  | 0 |
| `npm run test:super-admin-users` | `Tooling` | 2 |  | 0 |
| `npm run test:system-logs` | `Tooling` | 4 |  | 1 |
| `npm run test:system-logs-core` | `Tooling` | 1 |  | 0 |
| `npm run test:trending-ribbon-core` | `Tooling` | 1 |  | 0 |
| `npm run test:turso-read-retry` | `Tooling` | 1 |  | 0 |
| `npm run test:vercel-deploy-core` | `Tooling`, `Web` | 2 |  | 0 |
| `npm run typecheck` | `Tooling` | 0 |  | 0 |
| `npm run validate-storage-profiles` | `Tooling` | 1 |  | 0 |
| `npm run validate:app-versions` | `Tooling` | 1 |  | 0 |
| `npm run validate:error-logging` | `Tooling` | 1 |  | 0 |
| `npm run vercel:accounts:check` | `Tooling`, `Web` | 1 |  | 0 |
| `npm run vercel:function-size:check` | `Tooling`, `Web` | 1 |  | 0 |
| `npm run verify:all` | `Tooling` | 1 |  | 0 |
| `npm run verify:notifications` | `Tooling` | 2 |  | 0 |
| `npm run version:validate` | `Tooling` | 1 |  | 0 |
