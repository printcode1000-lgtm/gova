# OTA Update System

## Contract

ASOL uses one forward-only OTA channel. File paths, sizes, and SHA-256 values
remain the unit of truth, while each native download uses one signed ZIP
transport object selected from the current release. The device keeps the previously served
tree intact during activation so rollback is a path switch followed by removal
of the failed candidate. Release approval history is stored in the users
Turso database.

The application downloads or activates an update only when:

```text
remote.version > local.version
AND remote.minimumNativeVersion <= installed native version
AND every remote.requiredCapabilities entry is present in the installed shell
AND (release.approved = true OR actor is the super-admin)
```

An equal or lower remote version is ignored. A missing approval record, a
revoked release, or an unavailable approval API fails closed: the client
continues with its running bundle and downloads no OTA files.

**Failing closed means declining to install — not destroying what was already
downloaded.** A release held for approval or rollout stays on disk and installs
when it is cleared. Only revocation deletes.

Two facts follow from "an equal or lower remote version is ignored", and both
have bitten:

- Republishing content under a version a device already has produces no update,
  and the client is right to say so. If the settings page reports "no update"
  while you expect one, compare `app_version` on the device with the published
  `version` before assuming a fault.
- A version string is a promise that the content is identical everywhere. Deltas
  are computed against it, so reusing one with different content breaks them —
  see [the open gap](#the-gap-that-is-still-open).

## The Golden Rule

> **OTA ships UI and logic that run inside the native capabilities already
> installed on the device. Any new device capability is a store release.**

A web bundle that calls a Capacitor plugin, permission, or intent filter the
installed shell does not contain **will not crash**. The Native Platform layer
degrades it to an `Unavailable` error. That silent degradation is more
dangerous than a crash, because nothing reports it and the feature simply does
nothing for the user.

Two mechanisms enforce the rule:

### 1. Runtime gate — the device refuses an incompatible bundle

`ota-update-service.ts` compares `manifest.minimumNativeVersion` against the
installed version returned at runtime by Capacitor App and skips the release with the
`ota.nativeUpdateRequired` status when the shell is too old. It also asks the
capability registry, which resolves each key through
`Capacitor.isPluginAvailable` — see
[Capability-aware delivery](#capability-aware-delivery).

### 2. Publish gate — the channel refuses an unsafe upload

`scripts/ota/ota-native-compatibility.ts` compares the **working tree** against
the commit the last store build was made from. When any native surface changed,
`npm run ota:publish` **refuses to run**.

The comparison is deliberately working-tree based, not `baseline..HEAD`: the
static build compiles the working tree, so a gate that only read commits would
let an uncommitted edit to `android/` or a plugin adapter ship silently. The
candidate set is `git diff --name-only <baseline>` plus
`git ls-files --others --exclude-standard`, which together span committed,
uncommitted, and untracked changes.

**Outside `src/`, a path is a native surface:**

| Surface                             | Why it matters                        |
| ----------------------------------- | ------------------------------------- |
| `android/` · `ios/`                 | Manifest, entitlements, native sources |
| `capacitor.config.ts` · `platform/` | Shell configuration                   |
| `assets/` · `fastlane/`             | Bundled resources and release tooling |

**Inside `src/`, a file is a native surface because of what it contains, not
where it lives.** A file is classified native when it either:

1. imports a native plugin package — `@capacitor/*`, `@capacitor-mlkit/*`,
   `@capawesome/*`, `@capgo/*` — statically or through `import()`, or
2. is listed in `NATIVE_CONTRACT_FILES`, each with the native artifact it is
   coupled to.

This replaces the previous `^src/native-platform/` prefix rule, which was wrong
in both directions. It under-matched: the four sanctioned Capacitor-import
exceptions (`src/platform/ota/capacitor-ota-adapter.ts`,
`src/platform/navigation/capacitor-back-button-adapter.ts`,
`src/features/ota/services/ota-api-service.ts`,
`src/features/page-snapshot/hooks/use-page-snapshot.tsx`) sit outside that
prefix and passed the gate untouched. It also over-matched: facades, web
adapters, `share-validator.ts`, and `duplicate-filter.ts` are pure TypeScript
that ships inside the web bundle, and blocking them pushed publishers toward
routinely declaring an override, which costs more than the risk it removed.

A file the change **deleted** is classified from its baseline content, so
removing a plugin binding still counts as a native change. Test sources never
reach a device and never trip the gate.

Files currently declared in `NATIVE_CONTRACT_FILES`:

| File                                                     | Coupled native artifact                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `capabilities/shell-capabilities.ts`                      | Declares what the compiled shell contains                          |
| `capabilities/capability-keys.ts`                         | Vocabulary shared by manifests, shells, and bundles                |
| `capabilities/capability-registry.ts`                     | Maps keys onto the plugin names the shell registers                |
| `notifications/types.ts`                                  | Channel ids and `DEFAULT_CHANNEL_SOUND` must match `res/raw` and `strings.xml` |
| `permissions/types.ts`                                    | `PermissionKinds` must match `AndroidManifest.xml` and `Info.plist` |

Do not add a file here to be safe. Add it only when you can name the native
artifact it would break.

**Native dependencies** are checked from two sources, because either alone
misses a real change:

| Source              | Catches                                                         |
| ------------------- | --------------------------------------------------------------- |
| `package.json`      | A plugin added, removed, or moved to a different semver range    |
| `package-lock.json` | A resolved-version drift *inside* an unchanged range — different native code from an identical manifest |

Both are read from the working tree and compared against the baseline commit.

To publish anyway, the requirement must be **declared deliberately**:

```bash
ASOL_OTA_MINIMUM_NATIVE_VERSION=<version> npm run ota:publish
```

### Testing the gate safely

```bash
npm run ota:check              # runs the gate only — builds nothing, uploads nothing
npm run test:ota-compatibility # unit tests for the surface classifier
```

**Never run `npm run ota:publish` to test the gate.** Passing the gate
continues straight into a real build and a real upload that overwrites the
live channel.

### Baseline

The gate needs to know which commit the installed shell was built from. Tag it
at every store release:

```bash
git tag native-v0.1.52 && git push origin native-v0.1.52
```

Or override for one run with `ASOL_OTA_NATIVE_BASELINE=<commit>`. Without a
baseline the gate fails closed: `inspectNativeCompatibility` reports
`baselineMissing` with `requiresStoreRelease = true`, and `ota:publish` refuses
to run. The failure is closed in the classifier itself, not only in its caller,
so no future caller can inherit an open default.

## Release Approval Gate

Every R2 manifest is identified by the exact pair `releaseId + version`. Approval is server-side and applies to that exact release only.

- Newly discovered releases are inserted with `approved = false`. **Approval is
  per release**, so approving 0.1.2 says nothing about 0.1.3 — every publish
  starts unapproved again.
- Guests and ordinary authenticated users cannot download or activate an unapproved release.
- The super-admin bypasses approval and both downloads **and activates**
  immediately, for device testing.

### "Not allowed" is not "never allowed"

`POST /api/ota/access` answers with one of four reasons:

| Reason | Meaning | What the client does |
|---|---|---|
| `approved` | cleared | install |
| `super_admin` | cleared, no approval needed | install |
| `awaiting_approval` | **later** — a super admin has not approved it yet | hold, report `ota.awaitingApproval` |
| `rollout_pending` | **later** — the device's bucket is outside the percentage | hold, report `ota.ready` |

The two "later" reasons must never destroy a downloaded release. Three call
sites used to call `discardPending` on any `allowed: false`, which deleted a
verified, fully extracted tree and recorded it as `ota.revoked` — the update was
gone, the reason was wrong, and the UI kept spinning with nothing to install.

This also broke the super-admin rule, subtly: `prepareAtSplash` asks for the
decision at launch, *before the session has hydrated*. The identity is anonymous
for that moment, the answer is `awaiting_approval`, and destroying the update
there means the super admin never gets the release they were entitled to install
without approval. Holding it costs nothing — the next check, with a hydrated
identity, activates it.

**Only revocation discards**, and that lives in `enforceRevocations`.
- Approving a release makes it available to the configured rollout cohort on
  its next automatic check; the default 100% preserves the previous behaviour.
- Each release has a server-side rollout percentage, defaulting to 100%. An
  anonymous installation key and release ID produce a stable 0-99 bucket. A
  percentage increase only admits additional buckets and requires no republish.
- Revoking approval prevents new downloads and pending activation. Emergency
  version revocation also returns an activated OTA to the native store baseline
  at the first connected foreground session.
- The signed manifest is validated by the server before it can be shown or approved in the admin UI.

Approval is exposed through Business APIs:

```text
POST /api/ota/access
GET  /api/ota/admin/releases
PUT  /api/ota/admin/releases
GET  /api/ota/admin/releases/diff
```

The access endpoint returns only the decision for a release. Admin endpoints require the configured super-admin identity.

The Business API server resolves the manifest from `NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL`, or derives it from `ASOL_OTA_R2_PUBLIC_URL` plus `ASOL_OTA_R2_PREFIX`. It no longer falls back to `PRODUCT_R2_PUBLIC_URL` or `R2_PUBLIC_URL` — see [OTA storage](#ota-storage). Signature verification uses `ASOL_OTA_PUBLIC_KEY` (preferred for the deployed API), `NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY`, or a local `.ota/public-key.pem`. Development may derive the public key from the existing local `.ota/private-key.pem`; production should configure the public key directly and does not need the signing private key.

### Approval Database

The users database owns two tables:

| Table               | Purpose                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| `ota_releases`      | Manifest snapshot, release metadata, approval/revocation state, and actor timestamps |
| `ota_release_audit` | Append-only discovery, approval, and revocation events                               |

The full manifest JSON is retained in `ota_releases` so historical metadata remains available after the single R2 manifest is replaced by a later publication.

### Super-admin Page

`/super-admin/google-play-store-assets?tab=ota-releases` is the OTA section of the unified release console and provides:

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

| Classification | Rule                                              |
| -------------- | ------------------------------------------------- |
| Added          | Path exists only in the current manifest          |
| Modified       | Path exists in both manifests and SHA-256 differs |
| Deleted        | Path exists only in the prior manifest            |
| Unchanged      | Path and SHA-256 are identical                    |

OTA transfers a modified file in full. Therefore `downloadBytes` is the sum of every added file's current size plus every modified file's current size; it is not a binary patch-size estimate. Historical comparisons are available only for releases whose manifest was discovered and retained by the approval system.

## Declaring the minimum native version

When the compatibility gate finds changed native surfaces it refuses to publish,
and asks the publisher either to re-tag the baseline or to declare the shell
this bundle needs. Three channels, one meaning:

```bash
npm run ota:publish -- --minimum-native-version=0.2.0
```

```bash
ASOL_OTA_MINIMUM_NATIVE_VERSION=0.2.0 npm run ota:publish
```

…or the release console's **minimum native version** field on the OTA publish
command. The flag exists because the console starts commands with flags, not
environment variables: before it, the button could only ever reach the gate's
refusal, whose message named a variable no button can set. Leaving the field
empty keeps the gate in force.

A declaration is a claim that every targeted shell can run the bundle, and it is
checked. `CAPABILITY_AVAILABILITY` records, per key, the first shell that
**contains** the plugin and the first that **knows the key's name**:

| Declared version vs the key | Result |
| --- | --- |
| at/above `vocabularySince` | listed in the manifest |
| below `vocabularySince`, at/above `backedSince` | withheld — the plugin is there, the word for it is not |
| below `backedSince` | **throws** — that is a store release |

Withholding is not a loophole. A shipped client answers `false` for any key
outside its vocabulary, so naming a newer key does not make an old device
cautious — it makes it reject every release permanently, recoverable only from
the store.

The 0.1.0 release is the worked example. It requires `app.state`, whose
`@capacitor/app` plugin was compiled into the 0.2.0 shell all along — the
`native-v0.2.0` tag's `capacitor.build.gradle` already links `capacitor-app` —
while the key naming it is new. Declaring 0.2.0 was therefore honest, and the
publisher withheld `app.state` from the manifest, along with
`optionalCapabilities`: that field is inside the signed payload, so a client
built before it existed computes a different canonical string and rejects the
manifest outright. Both omissions are announced in the publish output.

## Moving the OTA origin

**The manifest URL is inlined into the web bundle at static build time.** A shell
already installed on a device asks the origin it was built with, and no server
setting changes that. Moving OTA to another bucket therefore strands every
installed copy with a 404 — the release is fine, the address it knows is not.
This is what happened when OTA was moved off the product account: a store-built
Android shell reported

```text
OTA request failed (404): https://pub-e1fa9cec….r2.dev/app-updates/manifest.json
```

**A store release is not the fix.** The client reads two documents from the
baked URL — `manifest.json` and its sibling `revocations.json` — and takes every
file and bundle URL from the manifest's own `baseUrl`. Mirroring those two small
documents to the old origin is enough:

```bash
npm run ota:mirror-legacy
```

It copies them byte for byte, so the signature the device verifies is the one
the publisher produced. `ASOL_OTA_LEGACY_R2_*` names the old origin explicitly —
never derived from `PRODUCT_R2_*`, since OTA reading a product variable is the
coupling that caused the problem in the first place.

`ota:publish` refreshes the mirror itself whenever `ASOL_OTA_LEGACY_R2_*` is
configured, so the old origin cannot fall behind the live release.

### When to remove it

```bash
npm run ota:mirror-legacy:remove
```

**Not when the release is published — when a store build against the new origin
has rolled out.** A device only stops needing the mirror after it *installs* a
bundle carrying the new URL, and reaching a manifest is merely the first of
three gates:

| Gate | What blocks it |
|---|---|
| Fetch the manifest | the baked origin must answer — this is what the mirror provides |
| `POST /api/ota/access` | `awaiting_approval` until a super-admin approves the release |
| Rollout | `rollout_pending` until the device's bucket is inside `rolloutPercentage` |

Removing the mirror between publishing and installing puts every store-installed
shell straight back on

```text
OTA request failed (404): …/app-updates/manifest.json
```

which is exactly what happened once: the mirror was removed while the release
was still unapproved, so no device had ever been able to install it.

## OTA storage

OTA reads `ASOL_OTA_R2_*` and nothing else: endpoint, access key, secret,
bucket, public URL, prefix. A missing value throws.

These used to fall back to `PRODUCT_R2_*` and then `R2_*`. **A fallback across
an account boundary is a silent redirect, not a default.** No `ASOL_OTA_R2_*`
was ever configured, so every release landed on the Cloudflare account reserved
for product images — 3,463 objects and 50 MB of build artefacts beside a single
product image. They were deleted, and OTA now points at the general account.

`npm run test:r2-separation` fails if any OTA accessor names an R2 variable that
is not its own. See
[R2 Storage Accounts](../../05-platform-features/r2-storage-accounts.md).

## Directory creation

`recursive: true` creates missing parents but does **not** make `mkdir`
idempotent on Capacitor Android: the plugin rejects when the target directory
already exists, with code `OS-PLUG-FILE-0010`. The adapter's comment used to
claim the opposite and nothing caught the rejection, so every install after the
first aborted with

```text
Directory at '…/asol-ota/current/' already exists, cannot be overwritten
```

— which is the normal state for an update, not an error.

The rejection is now caught by code and swallowed. It is also mostly avoided:
`ensureDirectory` is called once per extracted file, for that file's parent, so
a 3,458-file release asked for the same handful of directories hundreds of
times. Ensured paths are memoised, and `removeReleaseRoot` drops the subtree
from that memo so a deleted tree is recreated rather than assumed present.

This matters beyond speed. Capacitor logs each native rejection through
`console.error` before any JavaScript sees it, and the system-log collector
ships those to the server: one install once produced 602 of 614 rows in the
cloud log.

## R2 Layout

R2 has one current manifest and file tree, three manifest history entries, and
only the current release's immutable transport bundles:

```text
app-updates/
|-- manifest.json
|-- revocations.json
|-- files/
    |-- index.html
    |-- _next/static/...
    `-- ...
|-- history/
|   |-- <version>.json
|   `-- ... latest three only
`-- bundles/<releaseId>/
    |-- full.zip
    |-- from-<version-1>.zip
    |-- from-<version-2>.zip
    `-- from-<version-3>.zip
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
4. Pins the next web version and deterministic Next.js Build ID. Separately,
   it keeps the current native version for web-only changes or increments the
   native baseline patch when compiled shell code changed.
5. Runs the static build and generates `out/asol-web-manifest.json`.
6. Compares the new local file list with the previous R2 manifest.
7. Creates a full transport bundle and up to three changed-files-only bundles
   from retained manifest history.
8. Uploads only new or changed individual files and the immutable bundles.
9. Deletes remote file objects that no longer exist locally.
10. Signs and publishes `app-updates/manifest.json`, including bundle hashes.
11. Archives the manifest, republishes revocations, retains three history
    records, removes older bundle directories, and deletes legacy releases.
12. Updates Android `versionName` and `versionCode` to the native shell version.
13. Updates iOS `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` to the native shell version.
14. Compares the local and remote manifests.
15. Downloads every R2 file and bundle and verifies its byte size and SHA-256.
16. Runs `npx cap sync` only after all checks pass.

No APK or IPA is created. The command prepares the Android Studio and Xcode projects.

If R2 has no manifest yet, the initial version comes from `package.json`. Every later execution increments the R2 patch version.

## Publish-Only Command

```powershell
npm run ota:publish
```

This command uses the same automatic version, automatic Cairo notes, static build, delta upload, deletion, signing, and single-directory layout. It does not update native project version files and does not run `cap sync`.

The static build includes the fresh-install defaults and private-data audit.
OTA changes application files but deliberately preserves AsolDB, the current
session, theme, locale, cart, favorites, notifications, and page state. It must
not be used as a remote data-reset mechanism. For the first-install test flow,
see
[installation-state-and-clean-testing.md](./installation-state-and-clean-testing.md).

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

The mutable `files/` tree is exposed between the first file PUT and the final
manifest commit. The publisher prints this exact window in milliseconds; for a
multi-thousand-file release it can last several minutes depending on R2 and the
connection. Native ZIP keys are immutable and unaffected. A per-file client
that detects an old-manifest/new-file checksum race discards discovery and
staging, waits one second, refetches the manifest, and retries the whole check
once. Avoid publishing at peak usage times. Version-scoping the full `files/`
tree was rejected because it would permanently multiply storage for a bounded
race already handled by verification and retry.

The normal native path searches up to three `deltas` for a `fromVersion` equal
to the running bundle. A client farther behind downloads `full.zip`.
Web/recovery clients retain the individual-file path. ZIP is only
the transport: its hash is signed, extraction is streamed with `fflate.Unzip`,
every entry passes path validation, and every extracted file is checked against
the signed per-file hash before the release can become ready.

The native downloader checks ZIP size and SHA-256 in 64 KB chunks before it
reports `completed`. JavaScript then crosses the bridge once for streaming
extraction; per-file hashes are still checked after extraction.

All R2 GET, HEAD, LIST, PUT, and DELETE operations use SDK adaptive retries plus explicit exponential-backoff retries for timeouts, rate limits, server errors, `InternalError`, and `SlowDown`. A final error includes the operation, object key, HTTP status, request ID, and SDK attempt count when provided.

JSON files below `app-updates/files` are uploaded as `application/octet-stream`, not `application/json`. Android `CapacitorHttp` otherwise parses JSON before honoring `arraybuffer`, which changes the byte representation and prevents SHA-256 verification. JSON OTA objects are therefore refreshed on every publication to guarantee the correct transport metadata; the manifest itself remains `application/json`.

There is intentionally no server-side channel rollback. If publication fails before the new manifest is written, clients continue to see the previous version. A client that reads an old manifest while files are being replaced may reject a checksum and retry on a later launch. This is separate from the device-side candidate rollback used during activation.

## Manifest Schema

`minimumNativeVersion` is **enforced**, not advisory: a device whose native
version is lower skips the release entirely. See [The Golden Rule](#the-golden-rule).

Its floor comes from one constant, `MINIMUM_SUPPORTED_NATIVE_VERSION` in
`src/native-platform/capabilities/shell-capabilities.ts`. The publisher, the
static build, the client bundle, and `next.config.ts` all read it, so the value
cannot drift between them. `next.config.ts` previously defaulted to `1.0.0`
while every other consumer used `0.2.0`, which would have made an unpinned
build claim a shell it could not prove was installed. Raise the constant only
together with `SHELL_CAPABILITIES` and a store release whose `native-v*`
baseline tag has moved.

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
  "requiredCapabilities": ["camera.takePhoto", "share.send"],
  "optionalCapabilities": ["barcode.scan"],
  "mandatory": false,
  "notes": "Automatic build - 2026-06-30 09:30:15 Africa/Cairo",
  "files": {
    "index.html": {
      "sha256": "...",
      "size": 1234
    }
  },
  "bundles": {
    "full": { "path": "bundles/<releaseId>/full.zip", "sha256": "...", "size": 21000000 },
    "deltas": [
      { "path": "bundles/<releaseId>/from-0.1.5.zip", "fromVersion": "0.1.5", "sha256": "...", "size": 13000000 },
      { "path": "bundles/<releaseId>/from-0.1.6.zip", "fromVersion": "0.1.6", "sha256": "...", "size": 12500000 },
      { "path": "bundles/<releaseId>/from-0.1.7.zip", "fromVersion": "0.1.7", "sha256": "...", "size": 12000000 }
    ]
  },
  "signature": "..."
}
```

The manifest is signed with P-256. Capability keys, file entries, and Delta
metadata are sorted for canonical signing. Every listed path has a SHA-256 and byte size.
`optionalCapabilities` is absent entirely when empty — see
[Required and optional capabilities](#required-and-optional-capabilities).

`baseUrl` always points to the non-versioned `app-updates/files` directory.

## Local Manifest

`npm run build:static` generates:

```text
out/asol-web-manifest.json
public/asol-web-manifest.json
```

The local manifest contains the bundled version and the complete file inventory. `asol-web-manifest.json` itself is excluded from the file inventory and is not stored under `app-updates/files`.

Hidden control files whose path contains a segment beginning with `.`, such as `.gitkeep` and `.DS_Store`, are excluded because Capacitor's local WebView does not reliably serve them.

Static builds use an explicit public-asset allowlist. Runtime initialization assets, the complete
versioned catalog under `catagory` (core, pharmacy, vehicles and JSON Schemas), category images,
and product style definitions under `product/style` are copied from `public/`. Development
databases, `sync_data`, schema reports and duplicate logos are not included in `out`, R2, Android,
or iOS.

The policy is reviewed directly in `scripts/build-static.ts` through `STATIC_PUBLIC_ALLOW_FILES`, `STATIC_PUBLIC_ALLOW_DIRECTORIES`, `STATIC_PUBLIC_IGNORE_FILES`, `STATIC_PUBLIC_IGNORE_DIRECTORIES`, and `STATIC_ROUTE_IGNORELIST`. The build fails when a new public asset is not classified by these lists.

The development-only `/dev/*` routes and the `/test1` UI test route are removed from the temporary static-build source tree. They remain available during local development but do not generate production HTML, RSC payloads, or JavaScript chunks.

After `cap sync`, Android and iOS receive the same local manifest and static files from `out/`.

## The install is not finished when the download is

An update passes through five stages, and only the last one changes what the
user sees. Reading a device log, the stage names are the vocabulary:

```text
check → download → verify → extract → promote → activate
```

| Stage | Evidence on the device |
|---|---|
| download | `BackgroundDownload.schedule`, then `status` transitions `pending → downloading` |
| verify | `status: "verifying"`, then `completed` with the file path |
| extract | thousands of `Filesystem.writeFile` calls under `asol-ota/current/` |
| promote | the tree appears as `asol-ota/active/<version>/` |
| **activate** | `WebView.setServerBasePath` → that path, persisted in `CapWebViewSettings.xml` |

**Activation happens at the next launch, not when the download ends.** Between
extract and activate the release is complete on disk and doing nothing. Two
independent checks tell you which side of that line a device is on:

```bash
adb shell run-as hgh.asol.app ls files/asol-ota/active
adb shell run-as hgh.asol.app cat shared_prefs/CapWebViewSettings.xml | grep serverBasePath
```

If `active/<version>` exists but `serverBasePath` still points at the old
version, the download succeeded and the activation has not run. That is the
normal state until relaunch — not a failure, and not something to fix by
re-downloading.

### What the settings page shows

The page must never leave the user guessing which of the six stages they are in.
Three rules make that true:

- **The button label is the stage, not a boolean.** It used to read
  "checking for updates" for the whole of `busy` — check, download *and*
  extraction, several minutes — so a working update looked hung. It now renders
  the live status key: downloading, verifying, awaiting approval, and so on.
- **"Restart now" exists only while there is something to restart for.** It is
  rendered when `pending.ready` is set, and does not exist otherwise — not
  disabled, absent. It calls `activatePending` and reloads, so the user never
  has to know that activation happens at launch.
- **Holding is a state, not a silence.** A release waiting on approval or
  rollout reports `ota.awaitingApproval` / `ota.ready` rather than looking
  identical to "still working".

### How often the app checks

| Who | When |
|---|---|
| Ordinary user | automatically once per 24 hours, or on the button |
| **Super admin** | **every launch** |

The super admin is the person testing a release, and waiting up to a day to see
a build they just published is not a test loop. `checkDailyAndDownload` treats a
super-admin identity as always due. This changes only *how often the client
asks*; the server still decides what may be installed.

### Reading `[object Object]`

The console prints thrown OTA errors as `[object Object]`, so the device log
alone will not tell you why a check failed. The message is persisted in full:

```sql
SELECT last_occurred_at, operation, message
FROM system_logs
WHERE platform = 'android'
ORDER BY last_occurred_at DESC;
```

Every real diagnosis in the on-device test round came from that table, not from
logcat.

`Filesystem mkdir` rejections with code `OS-PLUG-FILE-0010` are noise: recursive
mkdir is not idempotent on Capacitor Android, the adapter swallows the
rejection, and Capacitor logs it natively before any JavaScript sees it. They
are not errors, and one install used to produce hundreds of them — see
[Directory creation](#directory-creation).

## Runtime Update

After the interactive UI opens, the application checks silently at most once
per 24 hours. A successful discovery starts downloading immediately. Manual
checks bypass the interval. Failed discovery does not advance the successful
check timestamp. Native Android uses one `DownloadManager` task and iOS uses
one background `URLSession` task; task identity is persisted and reattached
after normal process recreation. Web falls back to verified per-file transfer.

Before creating a native download, the shell measures free bytes on the app's
data volume. Atomic activation needs one complete candidate, up to one complete
staged payload, and the transport; required free space is therefore
`(2 * manifest.size + transport.size) * 1.20`. The 20% margin covers filesystem
metadata and temporary I/O. Insufficient space is retryable, not a failed
release. If measurement is unavailable, OTA proceeds with its integrity checks.

A successful daily timestamp that lies in the device's future is immediately
due and is clamped to the current wall clock. This self-heals manual clock
changes, dead-RTC boots, factory resets, and backwards time jumps.

Every foreground entry also fetches the compact signed `revocations.json` with
a three-second bound independent of the daily interval. Successfully verified
documents and their highest accepted `issuedAt` are persisted together in
AsolDB. Offline, timed-out, invalid, or tampered responses fall back to that
persisted document and are never cached as successful fetches. A correctly
signed document older than the persisted high-water mark is rejected as a
replay. A revoked pending release is discarded. A revoked running OTA returns
to Capacitor's bundled `public` assets and clears OTA staging and transaction
state. This never runs on splash, so emergency rollback applies on the first
foreground session, using either a fresh verified document or the last verified
offline copy.

The web application is outside this kill switch by design: `isEnabled()` is
false without the Capacitor adapter, and web deployments are served fresh from
the host. During an incident, do not interpret web behavior as proof that native
clients have received or applied a revocation.

Emergency revocation does not build the project and uploads only the compact
control document:

```bash
npm run ota:revoke -- 0.2.4
npm run ota:revoke -- --restore 0.2.4
```

The command updates `scripts/ota/ota-revocations.json`, signs it with the OTA
key, and writes `app-updates/revocations.json` with `no-store, max-age=0`.
Normal publication republishes the tracked list.

Never reuse a revoked version number. Revocation identifies the version string,
not the release ID, so republishing a fixed build under the same version remains
revoked. Publish the fix with a higher version.

### Escalation ladder — pick the lowest rung that covers the blast radius

The rollout percentage is **not** a brake: it can only be raised, never lowered
(`otaRolloutCannotDecrease`), because lowering it would strand devices that were
already told they were eligible. Stopping a bad release uses these three rungs
instead, in order:

| Rung | Command | Stops | Does not stop |
| --- | --- | --- | --- |
| 1. Withdraw approval | super-admin page, set the release unapproved | New downloads, immediately | Anything already downloaded or activated |
| 2. Withdraw approval, then wait one launch | as above | Staged releases — `reverifyPendingApproval` discards them at splash | Devices that already activated |
| 3. Revoke | `npm run ota:revoke -- <version>` | Everything, including activated devices, which revert to the store bundle | Offline devices, until their first connected foreground session |

Rung 1 is the default response and needs no build. Escalate to rung 3 only when
the release is already running on devices — it forces every one of them back to
the store-bundled version, which is disruptive but always safe.

### Emergency revocation runbook

1. Record the current tracked and live `revokedVersions` lists.
2. Run `npm run ota:revoke -- <version>` and confirm the command reports the
   version while changing only `revocations.json` and the tracked list.
3. Bring a test device online, foreground the installed app, and confirm it
   returns to the store-bundled version. The check is not performed on splash.
4. Confirm pending devices refuse the version and offline devices continue to
   enforce it after one successful foreground fetch.
5. Publish the repaired application under a new version. Restore the old entry
   only when deliberately required with
   `npm run ota:revoke -- --restore <version>`, then repeat the live/tracked
   comparison.

A ready pending release no longer blocks discovery. If the signed remote
manifest is newer, its staged payload and native task are cleaned, status moves
through `ota.superseded`, and normal download continues for the newer release.
The automatic 24-hour gate remains unchanged; manual checks still bypass it.

Splash performs no discovery and no download. A fully ready release receives
one approval request bounded to two seconds. Explicit revocation discards it;
approval activates it; timeout/offline failure activates using the approval
proven at download time. The next foreground session rechecks pending approval.
The deliberate residual gap is that a release revoked after download can still
activate when the device is offline both at revocation recheck and launch.

After activation, the expected bundle must initialize and confirm itself. If it
does not, the previous WebView path is reactivated and the failed complete
candidate is removed. A partial download is never activated.

Android continues normal DownloadManager work across backgrounding, process
death, and reboot where the OS permits. Android Force Stop blocks it until the
next launch. iOS background URLSession survives suspension and normal system
termination, but user Force Quit cancels transfers; ASOL resumes on next launch.
These limitations are OS policy and are not represented as stronger guarantees.

AOSP restricts `DOWNLOAD_WITHOUT_NOTIFICATION` to platform-signed/system apps.
ASOL requests hidden DownloadManager visibility only when an OEM has granted
that permission; ordinary Play installations show Android's running download
notification so the transfer remains functional and policy-compliant. Silent
refers to discovery and in-app prompts, not suppression of mandatory OS UI.

Files absent from the remote manifest are absent from the staged release, so deletion propagates to the application.

Android and iOS use native `CapacitorHttp` for R2 requests. R2 CORS also includes `https://localhost` for older bootstrap compatibility.

## Version Synchronization

The repository defaults live in
`src/core/config/app-version.ts`. `CURRENT_NATIVE_APP_VERSION` identifies the
compiled shell and `CURRENT_WEB_CONTENT_VERSION` identifies the bundled web
content. Release environment variables may pin a build explicitly, but an
ordinary development/static build must fall back to these current versions,
not to the older minimum-supported native baseline. Run
`npm run version:validate` to compare the constants, package metadata, Android,
iOS, `.env.example`, and every generated manifest currently present.

After a successful `cap:build`, version synchronization has two independent
groups.

The web release group must be equal:

- R2 `manifest.version`.
- `out/asol-web-manifest.json` version.
- Android bundled manifest version.
- iOS bundled manifest version.
- `NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION` inside the synchronized assets.

The native shell group must be equal:

- R2 `manifest.minimumNativeVersion` for a newly published full release.
- `NEXT_PUBLIC_ASOL_NATIVE_VERSION` inside the synchronized assets.
- Android `versionName`.
- iOS `MARKETING_VERSION`.

Android `versionCode` and iOS `CURRENT_PROJECT_VERSION` are calculated from the
native semantic version. For example, native `0.2.1` becomes `201`, while its
bundled web release may independently be `0.1.8`.

## Diagnostics

OTA lifecycle outcomes use the existing `system_logs` ingestion path. Devices
queue and batch check, discovery, download, verification, activation, rollback,
and revocation outcomes in AsolDB; logging failure never blocks OTA. Payloads
contain only local/target versions, outcome/reason codes, and platform. Each
installation sends a terminal release outcome once, so the server's deduplicated
`occurrences` count is displayed as an adoption count on the super-admin OTA
page without transmitting account or device identity.

Splash displays technical current/R2 versions, changed/deleted counts, download size, and failure details only to the super-admin. Other users see a loading spinner. Android Studio Logcat messages use `[AsolOTA]`.

| Message                                      | Meaning                                                       |
| -------------------------------------------- | ------------------------------------------------------------- |
| `OTA disabled`                               | OTA URL/key is missing or the app is not running in Capacitor |
| `No OTA update: remote version is not newer` | R2 is equal to or older than the running bundle               |
| `OTA release awaiting approval`              | A newer release exists but is not approved for ordinary users |
| `Unsupported OTA manifest schema`            | The installed bootstrap predates schema v2                    |
| `OTA manifest signature is invalid`          | The manifest does not match the embedded public key           |
| `checksum mismatch`                          | A downloaded or copied file differs from the manifest         |
| `R2 object content mismatch`                 | `cap:build` found a remote size or SHA-256 mismatch           |

### PowerShell / PSReadLine rendering failure

`Microsoft.PowerShell.PSConsoleReadLine.ReallyRender` with `Actual value was -1` is a terminal rendering bug, not an OTA or Node.js failure. It is commonly triggered by the very long debugger bootstrap command injected into an old PSReadLine integrated terminal.

- The VS Code `Capacitor Build`, `Capacitor Build Local`, and `OTA Publish` launch configurations use the Debug Console instead of the integrated PowerShell terminal.
- Prefer `Terminal > Run Task > Capacitor Build` when debugging is unnecessary.
- Running `npm run cap:build` directly from a fresh terminal also avoids the injected debugger command.
- If the terminal still reports the rendering exception, restart the terminal or update PSReadLine; do not treat the rendering stack trace as a build failure. The actual build result begins at the npm command output.

## Main Files

| File                                                                         | Responsibility                                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `scripts/cap-build.ts`                                                       | Publish, full R2 verification, native versioning, and Capacitor sync         |
| `scripts/ota-publish.ts`                                                     | Automatic version and single-directory delta publication                     |
| `scripts/build-static.ts`                                                    | Static build and local manifest generation                                   |
| `scripts/ota/ota-config.ts`                                                  | Schema, signing, URLs, and deterministic build environment                   |
| `scripts/ota/ota-r2.ts`                                                      | R2 list/get/put/delete operations                                            |
| `scripts/ota/ota-native-compatibility.ts`                                    | Working-tree native-surface classifier and dependency drift check           |
| `scripts/ota/ota-capability-scan.ts`                                         | Source capability detection and coverage guard                              |
| `src/native-platform/capabilities/capability-registry.ts`                    | Bridge-backed capability resolution and the native version floor consumers  |
| `src/features/ota/services/ota-update-service.ts`                            | Runtime comparison, staging, verification, and activation                    |
| `src/features/ota/services/ota-api-service.ts`                               | Native/browser manifest and file transport                                   |
| `src/features/ota/services/ota-release-service.server.ts`                    | Server-side manifest verification, access decisions, and approval management |
| `src/modules/data-access/domains/ota/repositories/ota-release-repository.ts` | Release state and audit persistence                                          |
| `src/platform/ota/capacitor-ota-adapter.ts`                                  | Private storage and WebView activation                                       |
| `src/components/splash/SplashInitializer.tsx`                                | Startup execution and progress details                                       |
| `src/components/super-admin/SuperAdminOtaReleasesPage.tsx`                   | Approval dashboard and device testing controls                               |

## Verification

```powershell
npm run typecheck
npm run architecture:check
npm run test:ota-compatibility
npm run test:native-platform
npm run ota:self-test
npm run ota:check
npm run cap:build
```

`npm run ota:check` is the only safe way to exercise the publish gate: it runs
the classifier and stops before building or uploading anything.

After adding or changing approval tables, apply/synchronize the schema before deploying the API:

```powershell
npx drizzle-kit migrate
npm run db:schema:sync
```

After `cap:build`, R2 may contain only `manifest.json`, `revocations.json`, the
objects under `files/`, the latest three entries under `history/`, and the
current release's immutable objects under `bundles/<releaseId>/`. It must
contain zero objects under legacy `releases/`.

## Rules

- Never create ad-hoc or unsigned ZIP bundles; only the publisher creates the
  signed `full.zip` and retained-history delta transports.
- Never create versioned copies of the mutable `files/` tree or restore the
  legacy `releases/` layout. `bundles/<releaseId>/` is the required immutable
  transport layout.
- Never weaken the path-switch rollback transaction or remove its pre-mutation activation state.
- Never publish the manifest before file operations complete.
- Never update when `remote.version <= local.version`.
- Never download or activate an unapproved release for a guest or ordinary user.
- Treat approval lookup failure as denial; OTA failure must not block normal app startup.
- Recheck approval immediately before activating a pending release.
- The super-admin is the only approval bypass.
- Treat the manifest as the complete source of truth for additions, changes, and deletions.
- Never classify a native surface by path alone inside `src/`; classify it by
  the plugin binding it contains or the native artifact it is declared against.
- Never compare only commits in the publish gate; the build compiles the
  working tree, so the gate must inspect the working tree.
- Never let a capability be reported present because its JavaScript loaded; ask
  the bridge.
- Never duplicate the native version floor; import
  `MINIMUM_SUPPORTED_NATIVE_VERSION`.
- Never add a field to the canonical signing payload without a withholding rule
  tied to a native version; an old client cannot verify what it does not know
  about, and it cannot be fixed over OTA.
- Never publish a capability key an installed client cannot name; give every new
  key a `CAPABILITY_AVAILABILITY` entry so the publisher withholds or refuses it
  deliberately.
- Never let a capability that exists on one platform only enter
  `requiredCapabilities`.

## Bootstrap Compatibility Note

The gate is enforced by clients containing this approval implementation. A native or already activated web bundle built before this feature cannot know about the approval API and retains its historical behavior. Roll out the gate as a controlled bootstrap/native baseline before relying on it for later unapproved releases.

The complete source-file allowlist, ignorelist, route exclusions, and review process are documented in [static-export-policy.md](./static-export-policy.md).

## Capability-aware delivery

Every manifest carries `requiredCapabilities`. The static build generates
`asol-required-capabilities.json` automatically from Native Platform API and
`CapabilityKeys` references; the publisher reads that built artifact and puts
the sorted list inside the canonical ECDSA-signed payload. The client asks the
runtime capability registry for missing keys before approval lookup or file
download. Any missing key produces `ota.nativeUpdateRequired` with the exact
keys. `minimumNativeVersion` remains as a compatibility floor.

### Required and optional capabilities

`requiredCapabilities` blocks a release. `optionalCapabilities` never does.

The split is **derived**, not hand-kept: `SHELL_CAPABILITIES_BY_PLATFORM`
declares what each shell contains, a capability present on every platform is
required, and one present on only some is optional. The publisher prints both
lists.

| Manifest field         | Device is missing one                                        |
| ---------------------- | ------------------------------------------------------------ |
| `requiredCapabilities` | Release skipped with `ota.nativeUpdateRequired`               |
| `optionalCapabilities` | Release installs; `optional_capabilities_missing` is recorded |

A single list made every capability all-or-nothing. `barcode.scan` exists only
on Android, so the moment any screen called the scanner, `barcode.scan` would
enter the required set and **every iOS device would refuse every release** —
permanently, since no store build can add a plugin that has no SPM support. A
bundle may use an optional capability only behind `capabilities.has()` or a
feature flag.

#### A key an installed client cannot name

A shipped client answers `false` for any capability key outside its own
`ALL_CAPABILITY_KEYS`. Listing a newly added key therefore does **not** make an
old device cautious — it makes it treat the key as missing and refuse every
release, permanently, recoverable only from the store. Adding a capability is
exactly as dangerous as adding a signed field.

`CAPABILITY_AVAILABILITY` records two versions per key, and the compiler rejects
an incomplete record, so adding a capability forces the question to be answered:

| Field             | Meaning                                             |
| ----------------- | --------------------------------------------------- |
| `backedSince`     | First native version whose **shell has the plugin** |
| `vocabularySince` | First native version whose **client knows the key** |

`resolveManifestCapabilities` then decides per key, against the release's
`minimumNativeVersion`:

| Targeted version vs the key                     | Result                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| at/above `vocabularySince`                        | listed normally                                                                     |
| below `vocabularySince`, at/above `backedSince`   | **withheld** — every targeted shell has the plugin, so naming it guards nothing more |
| below `backedSince`                               | **publish refused** — a targeted shell genuinely lacks it, and that is a store release |

The third row is the golden rule and still fails loudly; withholding is only
ever applied when the capability is provably present.

The `app.*` keys are the current case: `@capacitor/app` has been in the shell
since 0.2.0, but the keys naming it are new, so a manifest aimed at 0.2.0 omits
them and one aimed at 0.2.1 carries them.

#### Signing-payload transition

`optionalCapabilities` is part of the **signed** payload. A client built before
the field existed computes a different canonical string and rejects the release
as `OTA manifest signature is invalid` — and a device that rejects every release
can only be recovered from the store. Two rules make the transition safe, and
neither needs anyone to remember it:

1. **Empty means absent.** An empty set is omitted from the manifest and from
   the canonical payload, so a release with no platform-specific features signs
   the exact bytes the pre-split schema signed.
2. **Below the floor it is withheld.** `OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION`
   names the first store shell whose client understands the field. While a
   release declares a `minimumNativeVersion` below it, the publisher drops the
   field and prints what it withheld. Optional keys gate nothing, so withholding
   them changes no device behaviour.

To start using the field: ship a store build containing the split-aware client,
move the `native-v*` tag, raise
`OPTIONAL_CAPABILITIES_MINIMUM_NATIVE_VERSION` to that version, and publish with
a `minimumNativeVersion` at or above it.

`ota-delivery.test.ts` guards the omission, the withholding rule, and the
byte-equality of the publisher and client payloads.

The publisher no longer keeps its own copy of the canonical payload — it
delegates to `canonicalOtaManifestPayload`. Two implementations of one
byte-exact format is a signature outage waiting to happen, and the only recovery
from one would be a store build.

### The registry asks the shell, not the bundle

On a device, `capability-registry.ts` resolves each key through
`Capacitor.isPluginAvailable(<registered plugin name>)`. That reads
`PluginHeaders`, which the native bridge injects for the plugins it actually
registered, so it is a genuine statement about the installed shell.

It does **not** rely on a dynamic `import()` of the plugin package. A plugin's
JavaScript ships inside the web bundle, so on a native platform the import
always resolves whether or not the matching Java/Swift exists — the check
proved only that the bundle contains its own code. `pluginNameByFamily` holds
the registration name for every family, and the Native Platform tests assert
that every `CapabilityKey` maps to a family with a name.

The shell declaration still participates, but only as a narrowing filter, and
it is read **for the running platform** via `shellCapabilitiesFor()`. It is a
constant compiled into the web bundle, so an OTA release carries its own copy:
it can withdraw a capability, never grant one. The bridge check is what the
decision rests on.

### The source scan must stay honest

`scanSourceCapabilityReferences` recognises a capability by matching call
tokens against feature source. A token that matches nothing is worse than no
token: the key silently disappears from `requiredCapabilities` and the device
gate stops protecting it. Four tokens previously named methods that do not
exist — `files.user.saveFile`, `files.user.openFile`, `share.receive`, and
`barcode.scan` — so `files.save`, `files.open`, `share.receive`, and
`barcode.scan` could never appear in a manifest. The tokens now match the real
facade methods (`saveToDevice`, `openExternally`, `initializeReceiving`,
`scanOnce`), and `notifications.push` / `notifications.local` are prefix tokens
rather than call tokens.

`assertDetectionCoverage()` runs at the start of every scan and fails the build
when any `CapabilityKey` has no detection token, so the map cannot rot again.

## Delta, resume, and rollback

The staged release *is* the activation candidate: before downloading, the client
clones the served tree to `asol-ota/active/<version>` and writes changed files
straight into that clone, with a concurrency of six. A completion marker stores
the expected SHA-256 per file. On restart the client re-reads and hashes every
marked file before skipping its download, and a resume whose candidate directory
no longer exists restarts from a fresh clone. Unchanged files have no download
or write operation during a normal OTA.

The shell performs one baseline provisioning when it first moves from read-only
store assets to private OTA storage. It reports dedicated progress, copies local
files with concurrency 24, and checkpoints every 32 verified files so process
death resumes near the interruption instead of restarting all 3,457 files.

Activation never mutates the directory currently served by WebView, and never
copies anything. The candidate is already complete when the download finishes —
deletions are applied to it at that point — so activation is a single WebView
path switch with no startup cost.

At peak, storage holds the served tree, the candidate tree, and the ZIP:
`2 * manifest.size + transport.size`. That is exactly what
`requiredOtaFreeBytes` reserves before scheduling a download, so a device that
passes the free-space check cannot run out of space during activation. There is
no separate staging tree to reclaim; after confirmation the previous candidate
and the baseline working tree are removed, leaving one active full tree.

Rollback first records `rollbackPending`, switches to the prior path, and only
then removes the candidate; interruption at any rollback step is retried on the
next launch.

## iOS Xcode verification checklist

The source review verifies that `BackgroundDownloadPlugin.swift` and
`StorageCapacityPlugin.swift` are members of the App target Sources phase, use
Capacitor 8's `CAPPlugin`/`CAPBridgedPlugin` registration shape, and use the
installed `CAPPluginCall` optional accessors. The background session reuses the
same identifier through `AppDelegate`, moves the temporary file synchronously,
and hashes it as 64 KB chunks. This is source review only; Windows does not
compile Swift. Before the store release, verify all of the following in Xcode:

1. Compile both local plugins against the resolved Capacitor 8 package.
2. Confirm `volumeAvailableCapacityForImportantUsageKey` and its numeric bridge
   on the minimum supported iOS version.
3. Start a download, let iOS terminate and relaunch the app, and confirm the
   background-session completion handler is called exactly once.
4. Exercise download completion while protected data is unavailable and confirm
   the temporary-file move into Application Support remains valid.
5. Run Thread Sanitizer while status, completion, and removal overlap to verify
   `UserDefaults` and session callback coordination.

## Failure modes proven on a device

Every entry below was found by installing a debug build on a real Android phone
and driving the update by hand. All of them predate the R2 account move; moving
the origin only caused the OTA path to be exercised end to end for the first
time. They are recorded with their exact signatures because each one was
diagnosed from a string, and the next person will start from the same string.

| Symptom on the device | Signature | Cause |
|---|---|---|
| Update check fails instantly | `"StorageCapacity.then()" is not implemented on android` | `registerPlugin` returns a Proxy that answers every property with a function, `then` included. Returning it from an `async` function makes promise resolution call `then` on it, which Capacitor forwards to native as a method of that name. Box the proxy: `return { plugin: registerPlugin(...) }`. |
| Download never starts | `Invalid background download request` | Capacitor's `PluginCall.getLong` returns its default unless the JSON value is literally a `Long`. Any bundle under ~2.1 GB arrives as an `Integer`, so `size` was always null. Use `call.getData().optLong("size", -1)`. |
| Download and verify succeed, install fails | `Directory at '…/asol-ota/current/' already exists, cannot be overwritten` | `recursive: true` does not make `mkdir` idempotent on Android. See [Directory creation](#directory-creation). |
| Cloud error log floods | hundreds of `OS-PLUG-FILE-0010` rows | Same rejection, logged natively before JavaScript can catch it, once per file rather than once per directory. |
| "Checking and downloading" forever, version never moves | no error at all | A stored download was resumed indefinitely: the `download`/`discovered` branch never re-read the live manifest, so a device holding 0.1.1 kept re-extracting it after 0.1.2 shipped. |
| Update downloads, then silently disappears | log says `ota.revoked`, nothing was revoked | `allowed: false` was treated as "never". `awaiting_approval` and `rollout_pending` mean "later" — see [the access table](#not-allowed-is-not-never-allowed). |
| Update completes but nothing changes | `active/<version>` exists, `serverBasePath` unchanged | Activation happens at the next launch. Not a failure — use **Restart now**. |
| Delta validation falls back to full | `OTA delta bundle failed; retrying with full bundle` after an entry/hash error | The device's content did not match the published base for its version string. The bad candidate and task are removed, then the signed full bundle is tried once. |

### Delta mismatch recovery

`selectOtaBundle` initially picks a delta by version string. If download,
transport verification, extraction, entry validation, or per-file verification
fails, the client removes that native task and incomplete candidate, rechecks
free space for the larger signed `full.zip`, and retries the same release once
with the full bundle. The selected full-bundle path is persisted before retry,
so process death resumes the fallback instead of selecting the bad delta again.
Failure of the full bundle remains terminal and is never retried as a delta.

## How a change is classified as native

The layered scheme this sits inside — what reports, what enforces, and what was
deliberately left out — is described in
[Native Surface Protection](./native-surface-protection.md).

The gate decides by **what a file binds to, not where it sits**. Three rules, in
order:

| Rule | Result |
|---|---|
| Path is `android/`, `ios/`, or `capacitor.config.ts` | native — these *are* the store binary |
| Path is `fastlane/` or `assets/` | **not native** — CI tooling and source art, never compiled in |
| Anything under `src/` or `platform/` | native only if its **content** imports a Capacitor plugin, or it is a listed `NATIVE_CONTRACT_FILES` entry |

`platform/` used to be native by path. It is not: `capacitor.config.ts` imports
nothing from it, and its constants are read by build scripts and baked into the
web bundle, so they travel over OTA like any other string. The same folder still
counts the moment a file in it imports a plugin.

### Why the noise was removed rather than tolerated

A gate is only worth what its alarms are believed to mean. One release flagged
six files:

| Flagged | Actually needed a store release? |
|---|---|
| `BackgroundDownloadPlugin.java` | **yes** — Java compiled into the binary |
| `platform/capacitor.defaults.ts` | no — build-time URL constants |
| `fastlane/Fastfile` | no — CI tooling |
| three `src/native-platform/*.ts` | no — TypeScript facades over a plugin already compiled into the shipped shell |

Five of six were false. The publisher's response was to declare
`ASOL_OTA_MINIMUM_NATIVE_VERSION` five times in a row without re-reading the
list — which is what an over-reporting gate trains you to do, and it is more
dangerous than no gate at all, because the one true alarm arrives looking
exactly like the five false ones.

`scripts/test-ota-native-compatibility.ts` pins both directions: the real
surfaces must be detected, and `fastlane/`, `assets/`, and a build-time constant
under `platform/` must stay silent while a plugin import under `platform/` still
fires.

### The classification that is still coarse

A TypeScript file importing `@capacitor/app` is flagged native even when that
plugin was already compiled into the installed shell — so the change is
genuinely OTA-safe. `CAPABILITY_AVAILABILITY` already records this as
`backedSince`, and the gate does not consult it. Until it does, this class of
alarm needs the same judgement call described in
[Declaring the minimum native version](#declaring-the-minimum-native-version):
check whether the plugin is in the shipped shell before assuming a store
release.

## What still requires a store release

- Adding or upgrading native plugin code, including a resolved-version change
  inside an unchanged semver range.
- Adding an Android/iOS permission or changing its purpose text.
- Adding an Android intent filter, iOS Share Extension, App Group, entitlement,
  background mode, URL scheme, or native privacy manifest entry.
- Changing native application code, signing/provisioning, target SDK, icons,
  splash assets, bundle identifiers, or the native/build version.
- Expanding the shell capability set and bumping `NATIVE_CAPABILITY_VERSION`.

UI, JavaScript business logic, localization, and features that use capabilities
already reported by the installed shell may use OTA after the compatibility and
approval gates pass.

There is a third, faster lane. Withdrawing a feature does not need OTA at all:
`feature_flags` in the users database takes effect on the next client refresh.
See [Live control without a release](./native-platform.md#live-control-without-a-release).

### Where the line falls per feature

The question is never "does this feature touch the camera?" but "does this
change alter something compiled into the store binary?".

| Change                                                                | Delivery       |
| --------------------------------------------------------------------- | -------------- |
| Any page, route, component, layout, or style                          | OTA            |
| Business logic, hooks, client services, validation                    | OTA            |
| `src/locales/*`, theme, RTL/LTR                                       | OTA            |
| Notification content, category, routing, dedupe, persistence, badge   | OTA            |
| Creating or updating Android notification channels at runtime         | OTA            |
| Calling camera, location, speech, share, or barcode from a new screen | OTA            |
| Application state, deep links, or exit via `nativePlatform.app`       | OTA            |
| Turning a feature on or off for every device                          | **Neither** — a feature flag, live |
| Changing capture quality, formats, or picker options                  | OTA            |
| A new `public/` asset, once classified in `build-static.ts`           | OTA            |
| Notification tray icon, accent colour, or `custom_notification.mp3`   | Store release  |
| `default_notification_channel_id`, `google-services.json`, APNs setup | Store release  |
| `PushNotifications.presentationOptions` or any `capacitor.config.ts` key | Store release |
| A channel id whose sound file is not already in `res/raw`             | Store release  |
| A capability the shell does not declare                               | Store release  |

Two traps that are OTA-deliverable but still dangerous:

- **Channel ids are matched by already-installed clients.** Renaming
  `asol_general_v4` over OTA creates a duplicate channel and silently discards
  the user's existing preference. `notifications/types.ts` is a declared native
  contract for exactly this reason.
- **An OTA bundle replaces the OTA client itself.** A defect in
  `ota-update-service.ts` can stop future updates; recovery is
  `npm run ota:revoke`, which returns devices to the store bundle.

### Branding regeneration must not dirty the native tree

`build:static` runs `branding:generate`, which writes into
`android/app/src/main/res/` and `ios/App/App/Assets.xcassets/`. Those writes are
now conditional on the bytes actually differing.

An unconditional write dirtied the native tree on every OTA publication; once
committed, the compatibility gate would refuse the *next* publication because
"the native shell changed" — for nothing but a re-encode of an unchanged icon.
That is how a correct gate trains people to bypass it. `writeIfChanged` reports
`nothing rewritten` on a no-op run, so a pure web release stays a pure web
release.
