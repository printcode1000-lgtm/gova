# OTA Update System

## Purpose

GOVA uses a file-level Capacitor OTA system. Updates are delivered as real static files on R2, not as a ZIP bundle. The app compares a local web manifest with the signed manifest on R2, downloads only changed or new files, and creates a clean staged release that contains exactly the files listed by the remote manifest.

The update rule is forward-only:

```text
remote.version > local.version  -> update
remote.version <= local.version -> do nothing
```

There is no R2 rollback path. If R2 points to an older or equal version, the installed app ignores it.

## Release Layout

R2 stores each release as individual files:

```text
app-updates/
├── manifest.json                         # Channel manifest, published last
└── releases/
    └── 0.1.3/
        ├── manifest.json                 # Immutable release manifest
        └── files/
            ├── index.html
            ├── _next/static/...
            └── ...
```

The channel manifest and release manifest use schema v2:

```json
{
  "schemaVersion": 2,
  "delivery": "files",
  "version": "0.1.3",
  "releaseId": "0.1.3-1782754463078",
  "baseUrl": "https://.../app-updates/releases/0.1.3/files",
  "size": 14356238,
  "fileCount": 373,
  "minimumNativeVersion": "0.0.0",
  "mandatory": false,
  "notes": "File-level OTA",
  "files": {
    "index.html": {
      "sha256": "...",
      "size": 1234
    }
  },
  "signature": "..."
}
```

The manifest is signed. Each file is verified by SHA-256 after it is loaded.

## Local Manifest

`npm run build:static` generates:

```text
out/gova-web-manifest.json
public/gova-web-manifest.json
```

The local manifest records the currently bundled static web assets:

- `version`
- `fileCount`
- total `size`
- every file path
- every file `sha256`
- every file size

The app reads `/gova-web-manifest.json` at startup and compares it with the R2 manifest. This local file is generated for bundled/staged app assets. It is not uploaded as one of the remote release files; the signed R2 manifest itself is written back into the staged release as `gova-web-manifest.json` after all files are verified.

## Update Algorithm

At splash time, the app:

1. Reads the local manifest.
2. Downloads the signed R2 channel manifest.
3. Verifies manifest schema, delivery type, version format, file list, total size, and signature.
4. Skips the update if `remote.version <= local.version`.
5. Builds a diff:
   - changed files: missing locally or different SHA-256
   - deleted files: present locally but not present remotely
6. Creates a clean release directory in Capacitor private storage.
7. For each remote file:
   - downloads it from R2 if changed;
   - copies it from the currently served app if unchanged;
   - verifies SHA-256;
   - writes it into the staged release.
8. Writes `gova-web-manifest.json` into the staged release.
9. Saves the staged release as pending.
10. Activates the pending release.
11. Persists it only after the app reaches splash initialization successfully.

On Android and iOS, remote R2 requests use native `CapacitorHttp`, so OTA does not depend on browser CORS. Browser builds continue to use the normal HTTP gateway. R2 CORS must still include `https://localhost` to support older installed builds during the one-time schema v2 bootstrap.

Deleted files are removed by design. The staged release is created from the remote manifest only, so a file that is missing from the remote manifest is not copied into the new app version.

## Build And Publish Order

For a native build that must match R2 exactly, publish first, then run `cap:build` with the same version:

```powershell
npm run ota:publish -- --version 0.1.3 --notes "File-level OTA"
npm run cap:build -- --version 0.1.3
```

`ota:publish`:

1. Runs `npm run build:static`.
2. Pins the public web version, native version, and Next.js Build ID to the release version.
3. Generates the file manifest.
4. Uploads every file from `out/` to R2 except `gova-web-manifest.json`.
5. Uploads `releases/<version>/manifest.json`.
6. Uploads the channel `manifest.json` last.

`cap:build`:

1. Updates Android `versionName` and `versionCode`.
2. Updates iOS `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`.
3. Runs `npm run build:static` with the same web bundle version.
4. Reads `out/gova-web-manifest.json`.
5. Reads the R2 channel manifest.
6. Fails if versions differ.
7. Fails if any file path, size, or SHA-256 differs.
8. Runs `npx cap sync` only after the local files match R2 exactly.

This means Android, iOS, the local web manifest, and R2 are pinned to the same release version.

## Files

| File | Responsibility |
|---|---|
| `scripts/ota-publish.ts` | Publishes file-level OTA releases to R2 |
| `scripts/build-static.ts` | Builds static output and writes `gova-web-manifest.json` |
| `scripts/cap-build.ts` | Pins Android/iOS versions and verifies local files against R2 |
| `scripts/ota/ota-config.ts` | OTA manifest schema, signing, and public build env |
| `scripts/ota/ota-r2.ts` | R2 object access |
| `src/features/ota/services/ota-update-service.ts` | Runtime check, diff, download, staging, activation |
| `src/features/ota/services/ota-api-service.ts` | Manifest and file loading |
| `src/platform/ota/capacitor-ota-adapter.ts` | Capacitor private storage and WebView base path activation |
| `src/components/splash/SplashInitializer.tsx` | Runs OTA during splash and exposes progress details |
| `src/components/splash/ProgressIndicator.tsx` | Shows current/R2 version, changed/deleted file counts, and download size |

## Splash Diagnostics

During update checks, Splash can show:

- current local version
- R2 version
- changed file count
- deleted file count
- download size
- currently processed file

Runtime logs are emitted with the prefix:

```text
[GovaOTA]
```

Use Android Studio Logcat and filter by `GovaOTA` or package `com.gova.app`.

Common log reasons:

| Message | Meaning |
|---|---|
| `OTA disabled` | Missing manifest URL/public key or not running on native Capacitor |
| `No OTA update: remote version is not newer` | R2 version is equal or lower |
| `Unsupported OTA manifest schema` | The installed native build predates schema v2 and must be run once from Android Studio/Xcode |
| Browser CORS error | Run `npm run r2:sync:cors`; current native builds use `CapacitorHttp` as a fallback-free path |
| `OTA manifest signature is invalid` | R2 manifest does not match the signing key |
| `OTA ... checksum mismatch` | A downloaded/copied file does not match manifest SHA-256 |
| `OTA changed files exceed limit` | Changed files exceed the client safety limit |

## Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `GOVA_WEB_BUNDLE_VERSION` | `cap:build`, `build:static` | Web/native release version when `--version` is not provided |
| `GOVA_NATIVE_VERSION` | legacy override | Prefer matching native version to web version via `cap:build -- --version` |
| `GOVA_CAPACITOR_API_BASE_URL` | `cap:build`, `ota:publish` | API base URL baked into static assets |
| `GOVA_OTA_R2_PUBLIC_URL` or `R2_PUBLIC_URL` | OTA scripts | Public R2 base URL |
| `GOVA_OTA_R2_BUCKET_NAME` or `R2_BUCKET_NAME` | OTA scripts | R2 bucket name |
| `GOVA_OTA_R2_ENDPOINT` or `R2_ENDPOINT` | OTA scripts | R2 S3 endpoint |
| `GOVA_OTA_R2_ACCESS_KEY_ID` or `R2_ACCESS_KEY_ID` | OTA scripts | R2 access key |
| `GOVA_OTA_R2_SECRET_ACCESS_KEY` or `R2_SECRET_ACCESS_KEY` | OTA scripts | R2 secret key |
| `GOVA_OTA_SIGNING_PRIVATE_KEY` | OTA scripts | Optional signing key; otherwise `.ota/private-key.pem` is used |

## Verification

Run:

```powershell
npm run typecheck
npm run ota:self-test
npm run build:static
```

For a strict native/R2 match:

```powershell
npm run ota:publish -- --version 0.1.3
npm run cap:build -- --version 0.1.3
```

`cap:build` intentionally fails if R2 is not already published with the same version and identical file hashes.

## Design Constraints

- Do not reintroduce `web-bundle.zip`.
- Do not update when `remote.version <= local.version`.
- Do not write into the currently running release in place.
- Always stage a clean release from the remote manifest.
- Treat the remote manifest as the source of truth for file deletion.
- Keep Capacitor APIs inside `src/platform/ota/capacitor-ota-adapter.ts`.
- Keep signing and R2 upload logic inside `scripts/`.
