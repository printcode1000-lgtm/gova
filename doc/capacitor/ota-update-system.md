# OTA Update System

## Contract

ASOL uses one forward-only, file-level OTA channel. There are no ZIP bundles, version directories, or automatic rollback. Release approval history is stored in the users Turso database; R2 still contains only the current file tree and manifest.

The application downloads or activates an update only when:

```text
remote.version > local.version
AND (release.approved = true OR actor is the super-admin)
```

An equal or lower remote version is ignored. A missing approval record, a revoked release, or an unavailable approval API fails closed: the client continues with its running bundle and downloads no OTA files.

## Release Approval Gate

Every R2 manifest is identified by the exact pair `releaseId + version`. Approval is server-side and applies to that exact release only.

- Newly discovered releases are inserted with `approved = false`.
- Guests and ordinary authenticated users cannot download or activate an unapproved release.
- The super-admin bypasses approval and can download a release immediately for device testing.
- Approving a release makes it available to all clients on their next automatic check.
- Revoking a release prevents new downloads and activation of pending copies. It does not roll back devices that already activated the release.
- The signed manifest is validated by the server before it can be shown or approved in the admin UI.

Approval is exposed through Business APIs:

```text
POST /api/ota/access
GET  /api/ota/admin/releases
PUT  /api/ota/admin/releases
GET  /api/ota/admin/releases/diff
```

The access endpoint returns only the decision for a release. Admin endpoints require the configured super-admin identity.

The Business API server resolves the manifest from `NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL`, or derives it from `ASOL_OTA_R2_PUBLIC_URL` / `R2_PUBLIC_URL` plus `ASOL_OTA_R2_PREFIX`. Signature verification uses `ASOL_OTA_PUBLIC_KEY` (preferred for the deployed API), `NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY`, or a local `.ota/public-key.pem`. Development may derive the public key from the existing local `.ota/private-key.pem`; production should configure the public key directly and does not need the signing private key.

### Approval Database

The users database owns two tables:

| Table | Purpose |
|---|---|
| `ota_releases` | Manifest snapshot, release metadata, approval/revocation state, and actor timestamps |
| `ota_release_audit` | Append-only discovery, approval, and revocation events |

The full manifest JSON is retained in `ota_releases` so historical metadata remains available after the single R2 manifest is replaced by a later publication.

### Super-admin Page

`/super-admin/ota-releases` is linked from the super-admin sidebar and provides:

- current R2 release/version and release ID;
- server-side signature verification state;
- approval and revocation controls with confirmation;
- size, file count, minimum native version, mandatory flag, URLs, notes, and timestamps;
- searchable per-file path, size, and SHA-256 list;
- a release-diff section that compares the current manifest with any stored prior release;
- added, modified, deleted, and unchanged file classifications based on path and SHA-256;
- actual OTA download size (`new file sizes + full new sizes of modified files`), deleted bytes, unchanged bytes, and total bundle-size delta;
- diff search plus change-kind and file-extension filters, with old/new sizes and hashes for every file;
- manifest copy action;
- release and decision audit history;
- an immediate download-for-testing action that uses the super-admin bypass.

### Release Diff Semantics

`GET /api/ota/admin/releases/diff` accepts a prior `baseReleaseId` and always compares it with the currently signed R2 manifest. The comparison runs on the server so clients do not download historical manifest snapshots.

| Classification | Rule |
|---|---|
| Added | Path exists only in the current manifest |
| Modified | Path exists in both manifests and SHA-256 differs |
| Deleted | Path exists only in the prior manifest |
| Unchanged | Path and SHA-256 are identical |

OTA transfers a modified file in full. Therefore `downloadBytes` is the sum of every added file's current size plus every modified file's current size; it is not a binary patch-size estimate. Historical comparisons are available only for releases whose manifest was discovered and retained by the approval system.

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
5. Runs the static build and generates `out/asol-web-manifest.json`.
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

If publication succeeded but verification or `cap sync` was interrupted, resume the already published manifest without incrementing or publishing another version:

```powershell
npm run cap:build:resume
```

Resume mode compares the existing `out/asol-web-manifest.json` with the current R2 manifest, updates native version metadata, verifies every R2 object, and runs `npx cap sync`. It never calls `ota:publish`.

## Delta Publication

For every local output path, publication compares its SHA-256 and size with the previous manifest:

- Missing or different: upload it.
- Identical: leave the existing R2 object unchanged.
- Present on R2 but absent locally: delete it.

Changed files use revalidation cache headers because their URLs remain stable between versions. The signed manifest uses `no-store` and is written only after file uploads and deletions complete.

All R2 GET, HEAD, LIST, PUT, and DELETE operations use SDK adaptive retries plus explicit exponential-backoff retries for timeouts, rate limits, server errors, `InternalError`, and `SlowDown`. A final error includes the operation, object key, HTTP status, request ID, and SDK attempt count when provided.

JSON files below `app-updates/files` are uploaded as `application/octet-stream`, not `application/json`. Android `CapacitorHttp` otherwise parses JSON before honoring `arraybuffer`, which changes the byte representation and prevents SHA-256 verification. JSON OTA objects are therefore refreshed on every publication to guarantee the correct transport metadata; the manifest itself remains `application/json`.

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
out/asol-web-manifest.json
public/asol-web-manifest.json
```

The local manifest contains the bundled version and the complete file inventory. `asol-web-manifest.json` itself is excluded from the file inventory and is not stored under `app-updates/files`.

Hidden control files whose path contains a segment beginning with `.`, such as `.gitkeep` and `.DS_Store`, are excluded because Capacitor's local WebView does not reliably serve them.

Static builds use an explicit public-asset allowlist. Runtime initialization assets, category/subcategory data and images, vehicle data/images under `catagory/cars`, and product style definitions under `product/style` are copied from `public/`. Development databases, `sync_data`, schema reports, unused source exports, and duplicate logos remain available to local tooling but are not included in `out`, R2, Android, or iOS.

The policy is reviewed directly in `scripts/build-static.ts` through `STATIC_PUBLIC_ALLOW_FILES`, `STATIC_PUBLIC_ALLOW_DIRECTORIES`, `STATIC_PUBLIC_IGNORE_FILES`, `STATIC_PUBLIC_IGNORE_DIRECTORIES`, and `STATIC_ROUTE_IGNORELIST`. The build fails when a new public asset is not classified by these lists.

The development-only `/dev/*` routes and the `/test1` UI test route are removed from the temporary static-build source tree. They remain available during local development but do not generate production HTML, RSC payloads, or JavaScript chunks.

After `cap sync`, Android and iOS receive the same local manifest and static files from `out/`.

## Runtime Update

At Splash, the application:

1. Reads the local `asol-web-manifest.json`.
2. Loads the signed R2 manifest.
3. Validates schema, delivery type, version, metadata, signature, paths, counts, and total size.
4. Stops when `remote.version <= local.version`.
5. Calls `/api/ota/access` with the exact remote release identity and the current user identity when available.
6. Stops before diff calculation or file download unless the release is approved or the actor is the super-admin.
7. Calculates changed and deleted paths.
8. Downloads changed files and copies unchanged files from the running bundle.
9. Verifies every file by SHA-256.
10. Creates a clean staged release in private Capacitor storage.
11. Writes the signed remote manifest into the staged release as its local manifest.
12. Rechecks release access before activation, then activates the completed release.

Files absent from the remote manifest are absent from the staged release, so deletion propagates to the application.

Android and iOS use native `CapacitorHttp` for R2 requests. R2 CORS also includes `https://localhost` for older bootstrap compatibility.

## Version Synchronization

After a successful `cap:build`, all these values must be equal:

- R2 `manifest.version`.
- `out/asol-web-manifest.json` version.
- Android bundled manifest version.
- iOS bundled manifest version.
- Android `versionName`.
- iOS `MARKETING_VERSION`.

Android `versionCode` and iOS `CURRENT_PROJECT_VERSION` are calculated numerically from the semantic version. For example, `0.1.8` becomes `108`.

## Diagnostics

Splash displays technical current/R2 versions, changed/deleted counts, download size, and failure details only to the super-admin. Other users see a loading spinner. Android Studio Logcat messages use `[AsolOTA]`.

| Message | Meaning |
|---|---|
| `OTA disabled` | OTA URL/key is missing or the app is not running in Capacitor |
| `No OTA update: remote version is not newer` | R2 is equal to or older than the running bundle |
| `OTA release awaiting approval` | A newer release exists but is not approved for ordinary users |
| `Unsupported OTA manifest schema` | The installed bootstrap predates schema v2 |
| `OTA manifest signature is invalid` | The manifest does not match the embedded public key |
| `checksum mismatch` | A downloaded or copied file differs from the manifest |
| `R2 object content mismatch` | `cap:build` found a remote size or SHA-256 mismatch |

### PowerShell / PSReadLine rendering failure

`Microsoft.PowerShell.PSConsoleReadLine.ReallyRender` with `Actual value was -1` is a terminal rendering bug, not an OTA or Node.js failure. It is commonly triggered by the very long debugger bootstrap command injected into an old PSReadLine integrated terminal.

- The VS Code `Capacitor Build`, `Capacitor Build Local`, and `OTA Publish` launch configurations use the Debug Console instead of the integrated PowerShell terminal.
- Prefer `Terminal > Run Task > Capacitor Build` when debugging is unnecessary.
- Running `npm run cap:build` directly from a fresh terminal also avoids the injected debugger command.
- If the terminal still reports the rendering exception, restart the terminal or update PSReadLine; do not treat the rendering stack trace as a build failure. The actual build result begins at the npm command output.

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
| `src/features/ota/services/ota-release-service.server.ts` | Server-side manifest verification, access decisions, and approval management |
| `src/features/ota/repositories/ota-release-repository.ts` | Release state and audit persistence |
| `src/platform/ota/capacitor-ota-adapter.ts` | Private storage and WebView activation |
| `src/components/splash/SplashInitializer.tsx` | Startup execution and progress details |
| `src/components/super-admin/SuperAdminOtaReleasesPage.tsx` | Approval dashboard and device testing controls |

## Verification

```powershell
npm run typecheck
npm run architecture:check
npm run ota:self-test
npm run cap:build
```

After adding or changing approval tables, apply/synchronize the schema before deploying the API:

```powershell
npx drizzle-kit migrate
npm run db:schema:sync
```

After `cap:build`, R2 must contain exactly `manifest.json` plus the objects under `files/`, and zero objects under `releases/`.

## Rules

- Never create ZIP bundles.
- Never create versioned R2 directories.
- Never add rollback behavior.
- Never publish the manifest before file operations complete.
- Never update when `remote.version <= local.version`.
- Never download or activate an unapproved release for a guest or ordinary user.
- Treat approval lookup failure as denial; OTA failure must not block normal app startup.
- Recheck approval immediately before activating a pending release.
- The super-admin is the only approval bypass.
- Treat the manifest as the complete source of truth for additions, changes, and deletions.

## Bootstrap Compatibility Note

The gate is enforced by clients containing this approval implementation. A native or already activated web bundle built before this feature cannot know about the approval API and retains its historical behavior. Roll out the gate as a controlled bootstrap/native baseline before relying on it for later unapproved releases.

The complete source-file allowlist, ignorelist, route exclusions, and review process are documented in [static-export-policy.md](./static-export-policy.md).
