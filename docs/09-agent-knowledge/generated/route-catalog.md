<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: live repository graph built by scripts/docs/.
     Regenerate: npm run architecture:docs
     Validate: npm run architecture:check -->

# Route Catalog

Routes are derived from `src/app/**/page.*` and `src/app/**/route.*`. Route groups and parallel slots are removed from URL identity.

| Route | Source | Related owners | Runtime surfaces |
|---|---|---|---|
| `/` | `src/app/page.tsx` | `categories`, `splash` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/.well-known/apple-app-site-association` | `src/app/.well-known/apple-app-site-association/route.ts` |  | `Development`, `Web` |
| `/.well-known/assetlinks.json` | `src/app/.well-known/assetlinks.json/route.ts` |  | `Development`, `Web` |
| `/api/account/delete` | `src/app/api/account/delete/route.ts` | `auth`, `@asol/auth-core` | `Development`, `Web` |
| `/api/advertisements/featured-marquee` | `src/app/api/advertisements/featured-marquee/route.ts` | `advertisements`, `@asol/featured-marquee-core` | `Development`, `Web` |
| `/api/advertisements/featured-marquee/version` | `src/app/api/advertisements/featured-marquee/version/route.ts` | `advertisements` | `Development`, `Web` |
| `/api/advertisements/home-hero-slider` | `src/app/api/advertisements/home-hero-slider/route.ts` | `advertisements`, `@asol/hero-slider-core` | `Development`, `Web` |
| `/api/advertisements/home-hero-slider/version` | `src/app/api/advertisements/home-hero-slider/version/route.ts` | `advertisements` | `Development`, `Web` |
| `/api/advertisements/trending-ribbon` | `src/app/api/advertisements/trending-ribbon/route.ts` | `advertisements`, `@asol/trending-ribbon-core` | `Development`, `Web` |
| `/api/advertisements/trending-ribbon/version` | `src/app/api/advertisements/trending-ribbon/version/route.ts` | `advertisements` | `Development`, `Web` |
| `/api/auth/check-phone` | `src/app/api/auth/check-phone/route.ts` | `auth` | `Development`, `Web` |
| `/api/auth/login` | `src/app/api/auth/login/route.ts` | `auth`, `@asol/auth-core` | `Development`, `Web` |
| `/api/auth/logout` | `src/app/api/auth/logout/route.ts` | `auth` | `Development`, `Web` |
| `/api/auth/password-recovery/request` | `src/app/api/auth/password-recovery/request/route.ts` | `password-recovery` | `Development`, `Web` |
| `/api/auth/password-recovery/reset` | `src/app/api/auth/password-recovery/reset/route.ts` | `password-recovery` | `Development`, `Web` |
| `/api/auth/password-recovery/verify` | `src/app/api/auth/password-recovery/verify/route.ts` | `password-recovery` | `Development`, `Web` |
| `/api/auth/profile` | `src/app/api/auth/profile/route.ts` | `auth`, `@asol/auth-core` | `Development`, `Web` |
| `/api/auth/register` | `src/app/api/auth/register/route.ts` | `auth`, `@asol/auth-core` | `Development`, `Web` |
| `/api/contact` | `src/app/api/contact/route.ts` | `contact` | `Development`, `Web` |
| `/api/dev/catalog-studio` | `src/app/api/dev/catalog-studio/route.ts` | `catalog-studio`, `super-admin` | `Development`, `Web` |
| `/api/dev/catalog-studio/images` | `src/app/api/dev/catalog-studio/images/route.ts` | `catalog-studio`, `super-admin` | `Development`, `Web` |
| `/api/dev/product-style` | `src/app/api/dev/product-style/route.ts` | `categories`, `@asol/product-style-core` | `Development`, `Web` |
| `/api/feature-flags` | `src/app/api/feature-flags/route.ts` | `feature-flags` | `Development`, `Web` |
| `/api/follow` | `src/app/api/follow/route.ts` | `follow` | `Development`, `Web` |
| `/api/follow/notifications` | `src/app/api/follow/notifications/route.ts` | `follow` | `Development`, `Web` |
| `/api/follow/status` | `src/app/api/follow/status/route.ts` | `follow` | `Development`, `Web` |
| `/api/health` | `src/app/api/health/route.ts` |  | `Development`, `Web` |
| `/api/notifications/broadcast/recipients` | `src/app/api/notifications/broadcast/recipients/route.ts` | `notifications` | `Development`, `Web` |
| `/api/notifications/broadcast/send` | `src/app/api/notifications/broadcast/send/route.ts` | `notifications` | `Development`, `Web` |
| `/api/notifications/device-token` | `src/app/api/notifications/device-token/route.ts` | `notifications` | `Development`, `Web` |
| `/api/notifications/devices` | `src/app/api/notifications/devices/route.ts` | `auth`, `notifications` | `Development`, `Web` |
| `/api/notifications/mobile-push/unlock` | `src/app/api/notifications/mobile-push/unlock/route.ts` | `notifications` | `Development`, `Web` |
| `/api/notifications/preferences` | `src/app/api/notifications/preferences/route.ts` | `notifications` | `Development`, `Web` |
| `/api/notifications/recipient-tokens` | `src/app/api/notifications/recipient-tokens/route.ts` | `notifications` | `Development`, `Web` |
| `/api/notifications/send` | `src/app/api/notifications/send/route.ts` | `notifications` | `Development`, `Web` |
| `/api/notifications/test/self` | `src/app/api/notifications/test/self/route.ts` | `auth`, `notifications` | `Development`, `Web` |
| `/api/notifications/test/send` | `src/app/api/notifications/test/send/route.ts` | `notifications`, `super-admin` | `Development`, `Web` |
| `/api/orders` | `src/app/api/orders/route.ts` | `@asol/data-core`, `@asol/orders-core` | `Development`, `Web` |
| `/api/orders/[orderId]` | `src/app/api/orders/[orderId]/route.ts` | `profile`, `system-logs`, `@asol/data-core`, `@asol/orders-core` | `Development`, `Web` |
| `/api/orders/[orderId]/actions` | `src/app/api/orders/[orderId]/actions/route.ts` | `orders` | `Development`, `Web` |
| `/api/orders/custom-request-from-profile` | `src/app/api/orders/custom-request-from-profile/route.ts` | `auth`, `notifications`, `orders`, `profile`, `@asol/data-core`, `@asol/orders-core`, `@asol/storage-core` | `Development`, `Web` |
| `/api/orders/from-cart` | `src/app/api/orders/from-cart/route.ts` | `auth`, `cart`, `notifications`, `orders`, `profile`, `seller-discounts`, `system-logs`, `@asol/data-core`, `@asol/orders-core` | `Development`, `Web` |
| `/api/ota/access` | `src/app/api/ota/access/route.ts` | `ota`, `@asol/ota-core` | `Development`, `Web` |
| `/api/ota/admin/releases` | `src/app/api/ota/admin/releases/route.ts` | `ota`, `@asol/ota-core` | `Development`, `Web` |
| `/api/ota/admin/releases/diff` | `src/app/api/ota/admin/releases/diff/route.ts` | `ota`, `@asol/ota-core` | `Development`, `Web` |
| `/api/pharmacy-profile-catalog` | `src/app/api/pharmacy-profile-catalog/route.ts` | `pharmacy-profile-catalog` | `Development`, `Web` |
| `/api/products` | `src/app/api/products/route.ts` | `product` | `Development`, `Web` |
| `/api/products/reviews` | `src/app/api/products/reviews/route.ts` | `product` | `Development`, `Web` |
| `/api/products/reviews/helpful` | `src/app/api/products/reviews/helpful/route.ts` | `product` | `Development`, `Web` |
| `/api/products/reviews/reply` | `src/app/api/products/reviews/reply/route.ts` | `product` | `Development`, `Web` |
| `/api/profile/contacts` | `src/app/api/profile/contacts/route.ts` | `profile` | `Development`, `Web` |
| `/api/profile/discounts` | `src/app/api/profile/discounts/route.ts` | `seller-discounts` | `Development`, `Web` |
| `/api/profile/discounts/quote` | `src/app/api/profile/discounts/quote/route.ts` | `seller-discounts` | `Development`, `Web` |
| `/api/profile/editor` | `src/app/api/profile/editor/route.ts` | `profile`, `@asol/auth-core` | `Development`, `Web` |
| `/api/profile/fulfillment-settings` | `src/app/api/profile/fulfillment-settings/route.ts` | `notifications`, `orders`, `profile`, `@asol/data-core` | `Development`, `Web` |
| `/api/profile/reviews` | `src/app/api/profile/reviews/route.ts` | `product`, `profile` | `Development`, `Web` |
| `/api/profile/reviews/helpful` | `src/app/api/profile/reviews/helpful/route.ts` | `profile` | `Development`, `Web` |
| `/api/profile/reviews/reply` | `src/app/api/profile/reviews/reply/route.ts` | `profile` | `Development`, `Web` |
| `/api/profile/specialties` | `src/app/api/profile/specialties/route.ts` | `profile` | `Development`, `Web` |
| `/api/profile/store-details` | `src/app/api/profile/store-details/route.ts` | `profile` | `Development`, `Web` |
| `/api/profile/store-images` | `src/app/api/profile/store-images/route.ts` | `profile` | `Development`, `Web` |
| `/api/profile/users-by-specialty` | `src/app/api/profile/users-by-specialty/route.ts` | `profile` | `Development`, `Web` |
| `/api/search/fields` | `src/app/api/search/fields/route.ts` | `categories`, `product-search` | `Development`, `Web` |
| `/api/search/products` | `src/app/api/search/products/route.ts` | `product-search` | `Development`, `Web` |
| `/api/search/sellers` | `src/app/api/search/sellers/route.ts` | `product-search` | `Development`, `Web` |
| `/api/specialty-chat/messages` | `src/app/api/specialty-chat/messages/route.ts` | `specialty-chat` | `Development`, `Web` |
| `/api/specialty-chat/preferences` | `src/app/api/specialty-chat/preferences/route.ts` | `specialty-chat` | `Development`, `Web` |
| `/api/specialty-chat/product-conversations` | `src/app/api/specialty-chat/product-conversations/route.ts` | `specialty-chat` | `Development`, `Web` |
| `/api/specialty-chat/profile-conversations` | `src/app/api/specialty-chat/profile-conversations/route.ts` | `specialty-chat` | `Development`, `Web` |
| `/api/specialty-chat/receipts` | `src/app/api/specialty-chat/receipts/route.ts` | `specialty-chat` | `Development`, `Web` |
| `/api/specialty-chat/requests` | `src/app/api/specialty-chat/requests/route.ts` | `specialty-chat` | `Development`, `Web` |
| `/api/storage/images/[imageKey]` | `src/app/api/storage/images/[imageKey]/route.ts` | `storage` | `Development`, `Web` |
| `/api/storage/images/upload` | `src/app/api/storage/images/upload/route.ts` | `storage`, `@asol/storage-core` | `Development`, `Web` |
| `/api/storage/profiles/[profileId]` | `src/app/api/storage/profiles/[profileId]/route.ts` | `storage` | `Development`, `Web` |
| `/api/super-admin/build-jobs` | `src/app/api/super-admin/build-jobs/route.ts` | `release-commands`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/build-jobs/[jobId]/artifacts` | `src/app/api/super-admin/build-jobs/[jobId]/artifacts/route.ts` | `release-commands`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/build-jobs/[jobId]/artifacts/[name]` | `src/app/api/super-admin/build-jobs/[jobId]/artifacts/[name]/route.ts` | `google-play-console`, `release-commands`, `super-admin`, `@asol/release-core` | `Development`, `Web` |
| `/api/super-admin/build-jobs/[jobId]/artifacts/[name]/analysis` | `src/app/api/super-admin/build-jobs/[jobId]/artifacts/[name]/analysis/route.ts` | `google-play-console`, `release-commands`, `super-admin`, `@asol/release-core` | `Development`, `Web` |
| `/api/super-admin/build-jobs/[jobId]/cancel` | `src/app/api/super-admin/build-jobs/[jobId]/cancel/route.ts` | `release-commands`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/build-jobs/[jobId]/log` | `src/app/api/super-admin/build-jobs/[jobId]/log/route.ts` | `release-commands`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/build-jobs/analysis` | `src/app/api/super-admin/build-jobs/analysis/route.ts` | `google-play-console`, `super-admin`, `@asol/release-core` | `Development`, `Web` |
| `/api/super-admin/build-jobs/analysis/compare` | `src/app/api/super-admin/build-jobs/analysis/compare/route.ts` | `google-play-console`, `super-admin`, `@asol/release-core` | `Development`, `Web` |
| `/api/super-admin/build-jobs/catalog` | `src/app/api/super-admin/build-jobs/catalog/route.ts` | `release-commands`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health` | `src/app/api/super-admin/data-health/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/cleanup` | `src/app/api/super-admin/data-health/cleanup/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/history` | `src/app/api/super-admin/data-health/history/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/history/audit/clear` | `src/app/api/super-admin/data-health/history/audit/clear/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/history/runs/clear` | `src/app/api/super-admin/data-health/history/runs/clear/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/orders/plan` | `src/app/api/super-admin/data-health/orders/plan/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/orders/purge` | `src/app/api/super-admin/data-health/orders/purge/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/orders/retry-images` | `src/app/api/super-admin/data-health/orders/retry-images/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/plan` | `src/app/api/super-admin/data-health/plan/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/quarantine/clear` | `src/app/api/super-admin/data-health/quarantine/clear/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/quarantine/delete` | `src/app/api/super-admin/data-health/quarantine/delete/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/quarantine/release` | `src/app/api/super-admin/data-health/quarantine/release/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/data-health/schema` | `src/app/api/super-admin/data-health/schema/route.ts` | `data-health`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/dev-cloud-backup` | `src/app/api/super-admin/dev-cloud-backup/route.ts` | `dev-cloud-backup`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/dev-cloud-backup/backups/compare-saved` | `src/app/api/super-admin/dev-cloud-backup/backups/compare-saved/route.ts` | `dev-cloud-backup`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/dev-cloud-backup/backups/create` | `src/app/api/super-admin/dev-cloud-backup/backups/create/route.ts` | `dev-cloud-backup`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/dev-cloud-backup/backups/delete` | `src/app/api/super-admin/dev-cloud-backup/backups/delete/route.ts` | `dev-cloud-backup`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/dev-cloud-backup/backups/download` | `src/app/api/super-admin/dev-cloud-backup/backups/download/route.ts` | `dev-cloud-backup`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/dev-cloud-backup/backups/inspect-saved` | `src/app/api/super-admin/dev-cloud-backup/backups/inspect-saved/route.ts` | `dev-cloud-backup`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/dev-cloud-backup/backups/restore-saved` | `src/app/api/super-admin/dev-cloud-backup/backups/restore-saved/route.ts` | `dev-cloud-backup`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/dev-cloud-backup/backups/update-saved` | `src/app/api/super-admin/dev-cloud-backup/backups/update-saved/route.ts` | `dev-cloud-backup`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/google-play-console` | `src/app/api/super-admin/google-play-console/route.ts` | `google-play-console`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets` | `src/app/api/super-admin/google-play-store-assets/route.ts` | `google-play-console`, `super-admin`, `@asol/google-play-store-assets-core` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/backups` | `src/app/api/super-admin/google-play-store-assets/backups/route.ts` | `google-play-console`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/backups/restore` | `src/app/api/super-admin/google-play-store-assets/backups/restore/route.ts` | `google-play-console`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/fastlane` | `src/app/api/super-admin/google-play-store-assets/fastlane/route.ts` | `google-play-console`, `super-admin`, `@asol/google-play-store-assets-core` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/images/delete` | `src/app/api/super-admin/google-play-store-assets/images/delete/route.ts` | `google-play-console`, `super-admin`, `@asol/google-play-store-assets-core` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/images/upload` | `src/app/api/super-admin/google-play-store-assets/images/upload/route.ts` | `google-play-console`, `super-admin`, `@asol/google-play-store-assets-core` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/listings/delete` | `src/app/api/super-admin/google-play-store-assets/listings/delete/route.ts` | `google-play-console`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/mapping/upload` | `src/app/api/super-admin/google-play-store-assets/mapping/upload/route.ts` | `google-play-console`, `super-admin` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/tracks` | `src/app/api/super-admin/google-play-store-assets/tracks/route.ts` | `google-play-console`, `super-admin`, `@asol/google-play-store-assets-core` | `Development`, `Web` |
| `/api/super-admin/google-play-store-assets/tracks/promote` | `src/app/api/super-admin/google-play-store-assets/tracks/promote/route.ts` | `google-play-console`, `super-admin`, `@asol/google-play-store-assets-core` | `Development`, `Web` |
| `/api/super-admin/impersonate` | `src/app/api/super-admin/impersonate/route.ts` | `super-admin` | `Development`, `Web` |
| `/api/super-admin/users/delete` | `src/app/api/super-admin/users/delete/route.ts` | `super-admin` | `Development`, `Web` |
| `/api/super-admin/users/search` | `src/app/api/super-admin/users/search/route.ts` | `super-admin` | `Development`, `Web` |
| `/api/system-logs` | `src/app/api/system-logs/route.ts` | `super-admin`, `system-logs` | `Development`, `Web` |
| `/api/system-logs/ingest` | `src/app/api/system-logs/ingest/route.ts` | `system-logs`, `@asol/system-logs-core` | `Development`, `Web` |
| `/api/system-logs/stream` | `src/app/api/system-logs/stream/route.ts` | `auth`, `@asol/auth-core`, `@asol/system-logs-core` | `Development`, `Web` |
| `/api/system-logs/summary` | `src/app/api/system-logs/summary/route.ts` | `super-admin`, `system-logs` | `Development`, `Web` |
| `/cart` | `src/app/cart/page.tsx` | `cart` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/categories/[categoryId]` | `src/app/categories/[categoryId]/page.tsx` | `categories` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/categories/[categoryId]/doctor-appointment/[specialtyId]` | `src/app/categories/[categoryId]/doctor-appointment/[specialtyId]/page.tsx` | `categories` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/categories/[categoryId]/sellers/[subcategoryId]` | `src/app/categories/[categoryId]/sellers/[subcategoryId]/page.tsx` | `categories` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/collections/[collectionId]` | `src/app/collections/[collectionId]/page.tsx` | `categories` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/contact-us` | `src/app/contact-us/page.tsx` | `contact` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/custom-request` | `src/app/custom-request/page.tsx` | `profile` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/delete-account` | `src/app/delete-account/page.tsx` | `auth` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/catalog-studio` | `src/app/dev/catalog-studio/page.tsx` | `catalog-studio` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/category-selector` | `src/app/dev/category-selector/page.tsx` | `dev-tools` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/cloud-accounts` | `src/app/dev/cloud-accounts/page.tsx` | `super-admin` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/data-health` | `src/app/dev/data-health/page.tsx` | `data-health` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/deploy-all` | `src/app/dev/deploy-all/page.tsx` | `google-play-console` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/dev-cloud-backup` | `src/app/dev/dev-cloud-backup/page.tsx` | `dev-cloud-backup` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/google-play-console` | `src/app/dev/google-play-console/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/monitor` | `src/app/dev/monitor/page.tsx` | `@asol/format-core`, `@asol/observability-core` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/notification-tests` | `src/app/dev/notification-tests/page.tsx` | `super-admin` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/ota-releases` | `src/app/dev/ota-releases/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/dev/release-console` | `src/app/dev/release-console/page.tsx` | `google-play-console` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/favorites` | `src/app/favorites/page.tsx` | `favorites`, `product-card`, `seller-card` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | `password-recovery` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/home` | `src/app/home/page.tsx` | `categories`, `home` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/login` | `src/app/login/page.tsx` | `auth` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/notifications` | `src/app/notifications/page.tsx` | `notifications` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/notifications/chat` | `src/app/notifications/chat/page.tsx` | `specialty-chat` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/orders` | `src/app/orders/page.tsx` | `orders` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/orders/[orderId]` | `src/app/orders/[orderId]/page.tsx` | `orders` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/orders/details` | `src/app/orders/details/page.tsx` | `orders` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/privacy-policy` | `src/app/privacy-policy/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/product` | `src/app/product/page.tsx` | `product` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/profile` | `src/app/profile/page.tsx` | `profile` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/profile/pharmacy-catalog` | `src/app/profile/pharmacy-catalog/page.tsx` | `pharmacy-profile-catalog` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/registration` | `src/app/registration/page.tsx` | `auth` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/s/product` | `src/app/s/product/page.tsx` | `product`, `sharing` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/s/profile` | `src/app/s/profile/page.tsx` | `profile`, `sharing` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/search` | `src/app/search/page.tsx` | `product-search` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/settings` | `src/app/settings/page.tsx` | `settings` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/settings/notifications` | `src/app/settings/notifications/page.tsx` | `settings` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/specialty-request` | `src/app/specialty-request/page.tsx` | `specialty-chat` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/catalog` | `src/app/super-admin/catalog/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/data-health` | `src/app/super-admin/data-health/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/dev-cloud-backup` | `src/app/super-admin/dev-cloud-backup/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/featured-marquee` | `src/app/super-admin/featured-marquee/page.tsx` | `super-admin` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/google-play-console` | `src/app/super-admin/google-play-console/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/google-play-store-assets` | `src/app/super-admin/google-play-store-assets/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/hero-slider` | `src/app/super-admin/hero-slider/page.tsx` | `super-admin` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/logs` | `src/app/super-admin/logs/page.tsx` | `super-admin` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/notifications-broadcast` | `src/app/super-admin/notifications-broadcast/page.tsx` | `super-admin` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/ota-releases` | `src/app/super-admin/ota-releases/page.tsx` |  | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/trending-ribbon` | `src/app/super-admin/trending-ribbon/page.tsx` | `super-admin` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
| `/super-admin/users` | `src/app/super-admin/users/page.tsx` | `super-admin` | `Android`, `Development`, `iOS`, `Static out`, `Web` |
