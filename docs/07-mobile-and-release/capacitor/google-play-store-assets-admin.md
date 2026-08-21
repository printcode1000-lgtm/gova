# Unified Super-Admin Release Console

The development-only release console is available at `/super-admin/google-play-store-assets`. Its state is URL-addressable with `?tab=<id>`. The former Google Play and OTA pages redirect to their matching tabs.

The console is intentionally absent outside local development:

- production web requests receive `404`;
- its sidebar link is compiled for development and additionally rejected on native runtimes (Capacitor's `localhost` is never treated as proof of development);
- `build-static.ts` removes the console and its legacy redirect routes from the temporary source tree, then fails the build if any matching route leaks into `out`;
- all API and job services retain their independent server-side development guard.

## Tabs

1. `overview`: package, language, environment guard, credentials source, live OTA version, tracks, and build lock state.
2. `store-text`: store details and localized listings with a required pending-diff acknowledgement.
3. `store-images`: validated image uploads, galleries, deletion, backups, and restore.
4. `play-console`: read-only Android Publisher endpoints, configuration status, tracks, listings, reviews, products, APKs, and bundles.
5. `play-tracks`: release status, staged rollout, changelogs, promotion, and R8 mapping upload.
6. `build-publish`: the validated command catalog and command-specific operational documentation. The **Android release paths** section (`AndroidReleasePaths`) renders each catalog path as its own tab (labels from `releaseConsole.androidPaths.*`); the active tab shows one path card with its enable checkbox, primary/secondary actions, env readiness warnings, and job status. Shared actions (open outputs, static preview) stay below the tab strip.
7. `jobs`: persisted job history, bounded streaming logs, cancellation, and changed artifacts.
8. `bundle-analysis`: APK/AAB composition, device-delivery estimates, R8 provenance, and comparisons.
9. `ota-releases`: approval, revocation, rollout, download testing, manifests, file changes, adoption, and audit history.

## Safety Model

- The page and every API route require a super-admin session and the server-side development guard.
- Client requests use `asolApi`; credentials and private keys never reach the browser.
- Live commands require their exact confirmation phrase and readiness settings.
- Native, Fastlane, and OTA jobs use a persisted exclusive lock. Cancellation verifies that the process tree has stopped before releasing it.
- Store mutations use Google Play edits and create JSON backups under `.backups/google-play-store-assets` before commit.

## Store Image Validation

The Store assets contracts and image validators are sealed in `@asol/google-play-store-assets-core`.
The app module keeps only the browser hooks, server Google API wiring, edit locking, and credential
access that cannot live in a pure package.

- Icon: PNG, exactly 512 x 512, at most 1 MB.
- Feature graphic: PNG or JPEG, exactly 1024 x 500, at most 15 MB.
- TV banner: PNG or JPEG, exactly 1280 x 720, at most 15 MB.
- Screenshots: PNG or JPEG, each side 320 to 3840 pixels, ratio at most 2:1, at most eight images per type, and at most 8 MB each.

## Publisher Snapshot

The read-only Publisher tab keeps endpoint failures isolated. A denied reviews or subscriptions permission is shown on that endpoint without hiding successful track, listing, APK, or bundle data. Service-account secrets are redacted server-side.

## Bundle Analysis

The analyzer reads the ZIP central directory once, caches by path metadata and SHA-256, rejects unclassified known-format entries, and reconciles compressed entries plus header and directory overhead against archive size. R8 reports appear only beside a matching optimized release artifact within the provenance time window. Delivery size remains explicitly estimated because Google Play can split and recompress by ABI, density, and language.
