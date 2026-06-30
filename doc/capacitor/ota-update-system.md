# OTA Update System

## Contract

GOVA uses one forward-only, file-level OTA channel. There are no ZIP bundles, version directories, release history, or rollback.

The application updates only when:

```text
remote.version > local.version
```

An equal or lower remote version is ignored.

## R2 Layout

R2 has one current manifest and one current file tree:

```text
app-updates/
|-- manifest.json
`-- files/
    |-- index.html
    |-- _next/static/...
    `-- ...
```

Expected object counts are always:

```text
1 manifest object + manifest.fileCount file objects
```

`app-updates/releases/` is legacy and must remain absent. `cap:build` removes any legacy objects found there.

## Standard Command

Use one command for R2, Android, and iOS:

```powershell
npm run cap:build
```

Do not pass `--version` or `--notes`. The command performs this sequence:

1. Reads the current version from `app-updates/manifest.json`.
2. Increments the patch component automatically, such as `0.1.7` to `0.1.8`.
3. Creates notes using the current date and time in `Africa/Cairo`.
4. Pins the web version, native version, and deterministic Next.js Build ID to the new version.
5. Runs the static build and generates `out/gova-web-manifest.json`.
6. Compares the new local file list with the previous R2 manifest.
7. Uploads only new or changed files to `app-updates/files/`.
8. Deletes remote file objects that no longer exist locally.
9. Signs and publishes `app-updates/manifest.json` last.
10. Deletes legacy objects under `app-updates/releases/`.
11. Updates Android `versionName` and `versionCode`.
12. Updates iOS `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`.
13. Compares the local and remote manifests.
14. Downloads every R2 file and verifies its byte size and SHA-256.
15. Runs `npx cap sync` only after all checks pass.

No APK or IPA is created. The command prepares the Android Studio and Xcode projects.

If R2 has no manifest yet, the initial version comes from `package.json`. Every later execution increments the R2 patch version.

## Publish-Only Command

```powershell
npm run ota:publish
```

This command uses the same automatic version, automatic Cairo notes, static build, delta upload, deletion, signing, and single-directory layout. It does not update native project version files and does not run `cap sync`.

For normal native development, use `npm run cap:build` instead.

## Delta Publication

For every local output path, publication compares its SHA-256 and size with the previous manifest:

- Missing or different: upload it.
- Identical: leave the existing R2 object unchanged.
- Present on R2 but absent locally: delete it.

Changed files use revalidation cache headers because their URLs remain stable between versions. The signed manifest uses `no-store` and is written only after file uploads and deletions complete.

There is intentionally no rollback. If publication fails before the new manifest is written, clients continue to see the previous version. A client that reads an old manifest while files are being replaced may reject a checksum and retry on a later launch.

## Manifest Schema

Example schema v2 manifest:

```json
{
  "schemaVersion": 2,
  "delivery": "files",
  "releaseId": "0.1.8-1782794363515",
  "version": "0.1.8",
  "createdAt": "2026-06-30T06:30:15.000Z",
  "baseUrl": "https://.../app-updates/files",
  "size": 14356238,
  "fileCount": 373,
  "minimumNativeVersion": "0.0.0",
  "mandatory": false,
  "notes": "Automatic build - 2026-06-30 09:30:15 Africa/Cairo",
  "files": {
    "index.html": {
      "sha256": "...",
      "size": 1234
    }
  },
  "signature": "..."
}
```

The manifest is signed with P-256. File entries are sorted for canonical signing. Every listed path has a SHA-256 and byte size.

`baseUrl` always points to the non-versioned `app-updates/files` directory.

## Local Manifest

`npm run build:static` generates:

```text
out/gova-web-manifest.json
public/gova-web-manifest.json
```

The local manifest contains the bundled version and the complete file inventory. `gova-web-manifest.json` itself is excluded from the file inventory and is not stored under `app-updates/files`.

Hidden control files whose path contains a segment beginning with `.`, such as `.gitkeep` and `.DS_Store`, are excluded because Capacitor's local WebView does not reliably serve them.

Static builds use an explicit public-asset allowlist. The runtime initialization scripts, `logo.png`, `catagory/categories.json`, the main-category images referenced by that JSON, and the complete `public/images/subCategories` directory are copied from `public/`. Development databases, `sync_data`, schema reports, source category databases, unused category exports, and duplicate logos remain available to local tooling but are not included in `out`, R2, Android, or iOS.

The policy is reviewed directly in `scripts/build-static.ts` through `STATIC_PUBLIC_ALLOW_FILES`, `STATIC_PUBLIC_ALLOW_DIRECTORIES`, `STATIC_PUBLIC_IGNORE_FILES`, `STATIC_PUBLIC_IGNORE_DIRECTORIES`, and `STATIC_ROUTE_IGNORELIST`. The build fails when a new public asset is not classified by these lists or by the category-image rule.

The development-only `/dev/*` routes and the `/test1` UI test route are removed from the temporary static-build source tree. They remain available during local development but do not generate production HTML, RSC payloads, or JavaScript chunks.

After `cap sync`, Android and iOS receive the same local manifest and static files from `out/`.

## Runtime Update

At Splash, the application:

1. Reads the local `gova-web-manifest.json`.
2. Loads the signed R2 manifest.
3. Validates schema, delivery type, version, metadata, signature, paths, counts, and total size.
4. Stops when `remote.version <= local.version`.
5. Calculates changed and deleted paths.
6. Downloads changed files and copies unchanged files from the running bundle.
7. Verifies every file by SHA-256.
8. Creates a clean staged release in private Capacitor storage.
9. Writes the signed remote manifest into the staged release as its local manifest.
10. Activates the completed release.

Files absent from the remote manifest are absent from the staged release, so deletion propagates to the application.

Android and iOS use native `CapacitorHttp` for R2 requests. R2 CORS also includes `https://localhost` for older bootstrap compatibility.

## Version Synchronization

After a successful `cap:build`, all these values must be equal:

- R2 `manifest.version`.
- `out/gova-web-manifest.json` version.
- Android bundled manifest version.
- iOS bundled manifest version.
- Android `versionName`.
- iOS `MARKETING_VERSION`.

Android `versionCode` and iOS `CURRENT_PROJECT_VERSION` are calculated numerically from the semantic version. For example, `0.1.8` becomes `108`.

## Diagnostics

Splash displays current/R2 versions, changed and deleted counts, download size, and failure details. Android Studio Logcat messages use `[GovaOTA]`.

| Message | Meaning |
|---|---|
| `OTA disabled` | OTA URL/key is missing or the app is not running in Capacitor |
| `No OTA update: remote version is not newer` | R2 is equal to or older than the running bundle |
| `Unsupported OTA manifest schema` | The installed bootstrap predates schema v2 |
| `OTA manifest signature is invalid` | The manifest does not match the embedded public key |
| `checksum mismatch` | A downloaded or copied file differs from the manifest |
| `R2 object content mismatch` | `cap:build` found a remote size or SHA-256 mismatch |

## Main Files

| File | Responsibility |
|---|---|
| `scripts/cap-build.ts` | Publish, full R2 verification, native versioning, and Capacitor sync |
| `scripts/ota-publish.ts` | Automatic version and single-directory delta publication |
| `scripts/build-static.ts` | Static build and local manifest generation |
| `scripts/ota/ota-config.ts` | Schema, signing, URLs, and deterministic build environment |
| `scripts/ota/ota-r2.ts` | R2 list/get/put/delete operations |
| `src/features/ota/services/ota-update-service.ts` | Runtime comparison, staging, verification, and activation |
| `src/features/ota/services/ota-api-service.ts` | Native/browser manifest and file transport |
| `src/platform/ota/capacitor-ota-adapter.ts` | Private storage and WebView activation |
| `src/components/splash/SplashInitializer.tsx` | Startup execution and progress details |

## Verification

```powershell
npm run typecheck
npm run architecture:check
npm run ota:self-test
npm run cap:build
```

After `cap:build`, R2 must contain exactly `manifest.json` plus the objects under `files/`, and zero objects under `releases/`.

## Rules

- Never create ZIP bundles.
- Never create versioned R2 directories.
- Never add rollback behavior.
- Never publish the manifest before file operations complete.
- Never update when `remote.version <= local.version`.
- Treat the manifest as the complete source of truth for additions, changes, and deletions.
