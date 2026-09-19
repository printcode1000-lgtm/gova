# Public Product Name

## Purpose

Defines the name ordinary end users see and separates it from the historical technical identity of the repository.

- English display name: **Pbook**
- Arabic display name: **بيبوك**

These two spellings are exact. Do not introduce other spellings or spacings of either name in user-visible text.

The payment method formerly shown as `AsolPay` is displayed as **Pbook Pay** in English and **بيبوك باي** in Arabic.

## Scope

Included — every surface an ordinary end user can see:

- Localized UI strings in `src/shared/locales/ar.json` and `src/shared/locales/en.json`, plus in-component copy (contact, privacy policy, account deletion, install prompt, product share text).
- Browser title/metadata in `src/app/layout.tsx` and Open Graph share metadata in `src/features/sharing/server/share-metadata.server.ts`.
- Android launcher/system label: `android/app/src/main/res/values/strings.xml` (`Pbook`) and `values-ar/strings.xml` (`بيبوك`).
- iOS home-screen name and permission explanations: `ios/App/App/Info.plist` (`Pbook`) and `ios/App/App/ar.lproj/InfoPlist.strings` (`بيبوك`); the share extension mirrors this in `ios/ShareExtension/`. Both `ar.lproj/InfoPlist.strings` files are registered in `ios/App/App.xcodeproj/project.pbxproj` and `ar` is a known region.
- `capacitor.config.ts` `appName`.
- Android notification channel names (`packages/native-core`, Java and TypeScript mirrors), fallback push titles on server providers, the web push service worker, the native push service, and notification templates.
- User-facing email and SMS copy (verification, password recovery, contact form).
- Account-deletion confirmation phrases displayed to users (`@asol/auth-core`).
- The fallback order-number prefix `Pbook-` for newly created orders (`@asol/data-core` marketplace orders), plus display-only normalization of historical `ASOL-`/`GOVA-` prefixes to `Pbook-` in ordinary-user order surfaces and notifications.
- User-downloaded sharing/QR artifact names use the lowercase `pbook-` public prefix.
- The persisted native push `deviceLabel` (`Pbook Android` / `Pbook iOS`), owned by `src/features/notifications/infrastructure/native/native-device-label.ts`, because it can reach device-management surfaces. Labels already stored on existing registrations are not rewritten; they refresh on the next native registration.

Excluded — internal identity that intentionally keeps historical `asol`/`gova` tokens:

- Android `applicationId`/package `hgh.asol.app`, iOS bundle identifiers, the app group, the `asol://` URL scheme, Java/Swift namespaces and class names.
- npm package names (`@asol/*`), source folders, types, functions, API routes, headers such as `X-Asol-*`, log prefixes such as `[Asol]`, environment variables (`ASOL_*`, `NEXT_PUBLIC_ASOL_*`), IndexedDB names, notification channel IDs, storage keys, OTA keys, Firebase identifiers, Vercel project/account names (`gova`), domains, and the repository name.
- Operator-only surfaces (super-admin, release console, dev monitor, developer badge, local-agent tooling, backend service page titles) and build artifact names such as the Fastlane `ASOL.ipa`.
- Persisted data: historical order-number values are not rewritten in Turso. Ordinary-user presentation and notification interpolation normalize historical `ASOL-`/`GOVA-` prefixes to `Pbook-` at the display boundary only.
- Project documentation that names the codebase historically.
- Compatibility logic that is never rendered: the legacy `ASOL` fallback inside the inbound-push dedupe key (`inbound-notification-mapper.ts`), the `ASOL` entry in empty-placeholder detection (mapper and `asol-notification-repository.ts`), and the pre-rename account-deletion phrases accepted by `isAccountDeletionPhraseValid()`.
- The common Arabic word «أصول» meaning "assets" in operator release-console copy; it is not the brand.

## Invariants

- Renaming the public name never renames an identifier. When a string is both technical and visible, separate the display label from the identifier.
- Empty app-name push placeholders are dropped for every historical and current name (`ASOL`, `Pbook`, `بيبوك`), because the operating system may title a data-only message with the installed label.
- The pre-rename account-deletion phrases stay accepted server-side so lagging installed clients still work.

## Store Listings

The repository does not store Google Play or App Store listing metadata: Fastlane uploads run with `skip_upload_metadata`, there is no `fastlane/metadata` tree, and the release console edits Play listings live through the Play API. The store title is therefore changed in Play Console / App Store Connect (or through the release console) as a separate, explicitly authorized operation. The binaries built from this repository already carry the new installed-app names.

## Runtime Surfaces

- Development / Web: locale strings, metadata, and server emails/SMS.
- Static `out/`: the same client strings and the synced `public/asol-push-sw.js`.
- Android: `values`/`values-ar` labels and notification channel names; channel names update in place on next channel registration because channel IDs are unchanged.
- iOS: `CFBundleDisplayName` plus the Arabic `InfoPlist.strings` localization.

## Verification

- `npm run test:native-core` (includes `public-app-name.test.ts`, which pins the Android/iOS display names and the unchanged package/bundle identity).
- `npm run test:auth-core`, `npm run test:notifications` (includes `native-device-label.test.ts`), `npm run test:notifications-core`.
