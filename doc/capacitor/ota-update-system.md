# OTA Web Bundle Update System

GOVA includes an opt-in over-the-air (OTA) update system for the web bundle embedded in the Capacitor Android and iOS applications.

The system updates Next.js static-export files such as pages, React components, hooks, client services, translations, CSS, JSON, and public assets. It does not replace the Android APK, Android App Bundle, or iOS IPA, and it does not update native code or native plugins.

An ordinary source-code change is never announced automatically. Applications discover a release only after an operator explicitly runs `npm run ota:publish` with a new version number.

## Supported and Unsupported Changes

### Supported by OTA

- Next.js pages and layouts
- React components
- Client-side hooks and services
- Browser-side TypeScript and JavaScript
- CSS, theme tokens, and visual assets
- Arabic and English dictionaries
- Static JSON and public files

### Requires a Store Release

- Android Java or Kotlin
- iOS Swift or Objective-C
- Capacitor plugin additions or upgrades
- AndroidManifest permissions
- Gradle, Xcode, or signing configuration
- `capacitor.config.ts` changes that affect the native shell
- Native application version changes

## High-Level Architecture

```text
Developer explicitly runs ota:publish
  → build:static with a new web bundle version
  → ZIP the complete out/ directory
  → calculate SHA-256
  → sign the manifest with ECDSA P-256
  → upload immutable release objects to R2
  → upload channel manifest last

Application startup (Splash)
  → check signed manifest
  → compare web and native versions
  → download update automatically
  → verify signature, size, and SHA-256
  → extract to application-private storage
  → notify the user that a verified update is ready
  → continue normal Splash initialization

Application while open
  → check every 15 minutes
  → check whenever the application becomes visible
  → download a new update automatically
  → show the restart prompt after download
```

## Explicit Publication Rule

Editing or committing a source file does not create an OTA release. The following command is the only normal operation that announces a release to installed applications:

```bash
npm run ota:publish -- --version 1.2.3 --notes "Improved seller page"
```

The command:

1. validates the semantic version;
2. builds a fresh static export;
3. bakes the version, API URL, OTA manifest URL, and public verification key into the bundle;
4. creates a ZIP archive of `out/`;
5. calculates its exact byte size and SHA-256 checksum;
6. signs a canonical manifest using ECDSA P-256;
7. refuses to overwrite an existing version;
8. uploads the ZIP and immutable release manifest;
9. publishes the channel manifest last.

Publishing the channel manifest last prevents applications from discovering an incomplete release.

## R2 Object Layout

By default the OTA system uses the configured R2 bucket under a separate prefix:

```text
app-updates/
├── manifest.json
└── releases/
    ├── 1.2.2/
    │   ├── manifest.json
    │   └── web-bundle.zip
    └── 1.2.3/
        ├── manifest.json
        └── web-bundle.zip
```

`manifest.json` at the root of the prefix is the current release channel. Versioned release objects use immutable caching. The channel manifest uses `no-store`.

A dedicated OTA bucket is recommended, but the system can fall back to the existing image-storage R2 credentials. OTA and product images remain isolated by object prefix even when they share a bucket.

## Manifest Contract

Example:

```json
{
  "schemaVersion": 1,
  "releaseId": "1.2.3-1782700000000",
  "version": "1.2.3",
  "createdAt": "2026-06-29T00:00:00.000Z",
  "bundleUrl": "https://cdn.example.com/app-updates/releases/1.2.3/web-bundle.zip",
  "size": 8251440,
  "sha256": "64-character-hex-value",
  "minimumNativeVersion": "1.0.0",
  "mandatory": false,
  "notes": "Improved seller page",
  "signature": "base64-p256-signature"
}
```

The signature covers every field except `signature`, using a fixed canonical field order. Changing a signed value invalidates the manifest.

## Signing Keys

Generate the key pair once:

```bash
npm run ota:keygen
```

Generated files:

```text
.ota/private-key.pem
.ota/public-key.txt
```

The `.ota/` directory is ignored by Git.

Important rules:

- Back up `private-key.pem` securely.
- Never commit or send the private key to a client.
- Every native installation must contain the matching public key.
- Losing the private key means existing installations cannot trust new OTA releases signed by a replacement key.
- Rotating the signing key requires a new store release that embeds the new public key.

CI can provide the private key through `GOVA_OTA_SIGNING_PRIVATE_KEY`. Escaped `\n` newlines are supported.

## Splash Behavior

OTA work happens before the normal Splash reaches **Application ready — 100%**.

Suggested progress allocation implemented by the client:

| Progress | Activity |
|---|---|
| 0–10% | Check manifest |
| 10–25% | Compare versions |
| 25–55% | Download bundle |
| 55–65% | Verify signature, size, and SHA-256 |
| 65–70% | Extract bundle to private storage |
| 70–100% | Run normal application initialization |

If no update exists, the process proceeds to normal initialization. Network or OTA failures do not prevent the bundled application from starting.

If an update was already downloaded and the user previously selected **Later**, the next Splash activates it automatically before continuing.

## Automatic Download and Restart Prompt

When a valid newer release is found:

1. the application downloads it automatically;
2. the archive is verified and extracted;
3. no running page is replaced immediately;
4. a global dialog informs the user that the update has been downloaded;
5. the user can choose **Restart now** or **Later**.

### Restart now

The application changes the Capacitor WebView base path to the extracted release and reloads the web interface.

### Later

- The downloaded bundle remains in application-private storage.
- The current session continues without interruption.
- The update is applied automatically on the next application launch.
- If the application remains open, the restart prompt appears again after 24 hours.

The 24-hour reminder uses a scheduled timer and is also restored from persistent state after foreground transitions.

## Detection While the Application Is Open

The provider checks for updates:

- every 15 minutes while the document is visible;
- whenever the document returns to the visible state;
- once after mounting outside the Splash route.

Only one download can run at a time. A pending downloaded release suppresses additional checks until it is activated or rejected by rollback protection.

## Activation and Automatic Rollback

Activation is intentionally temporary at first:

```text
Old persisted bundle
  → temporarily load new extracted bundle
  → run Splash initialization
  → reach 100% successfully
  → persist the new WebView base path
```

The new path is persisted only after Splash initialization succeeds. If the new bundle crashes, cannot load, or never completes initialization, the native shell uses the previously persisted bundle on the next launch.

When the old bundle detects that a temporary activation failed, it:

- removes the pending activation state;
- blocks that exact `releaseId`;
- continues running the last known-good bundle.

A newly published release receives a new `releaseId` and can be attempted normally.

## Security Controls

The client enforces all of the following before extraction:

- HTTPS bundle URL
- supported manifest schema
- valid semantic version
- maximum bundle size of 50 MB
- exact downloaded byte size
- ECDSA P-256 manifest signature
- SHA-256 ZIP checksum
- minimum native shell version
- safe ZIP paths with traversal rejection
- required `index.html`

The ZIP is extracted only into the application-private data directory:

```text
gova-ota/releases/<version>/
```

Passwords, API credentials, and signing secrets are not stored in the web bundle.

## Capacitor Integration

The system uses:

- `@capacitor/filesystem` to store extracted files privately;
- Capacitor's built-in `WebView` plugin to switch and persist the server base path;
- browser `visibilitychange` events for foreground detection.

The implementation does not require a feature-specific Android or iOS native class. Capacitor provides the platform implementations for both systems.

`npm run cap:build` embeds the following values:

- remote GOVA API URL;
- OTA manifest URL;
- OTA public verification key;
- bundled web version;
- native shell version.

## Configuration

Optional dedicated OTA R2 configuration:

```env
GOVA_OTA_R2_BUCKET_NAME=
GOVA_OTA_R2_PUBLIC_URL=
GOVA_OTA_R2_ENDPOINT=
GOVA_OTA_R2_ACCESS_KEY_ID=
GOVA_OTA_R2_SECRET_ACCESS_KEY=
GOVA_OTA_R2_PREFIX=app-updates
```

When these values are empty, the publisher falls back to:

```env
R2_BUCKET_NAME=
R2_PUBLIC_URL=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

Version configuration:

```env
GOVA_NATIVE_VERSION=1.0.0
GOVA_WEB_BUNDLE_VERSION=0.1.0
```

The publisher overrides the web bundle version with the value supplied to `--version`.

## Commands

### Generate signing keys

```bash
npm run ota:keygen
```

This refuses to overwrite an existing private key.

### Publish a release

```bash
npm run ota:publish -- --version 1.2.3 --notes "Description"
```

Optional fields:

```bash
npm run ota:publish -- --version 1.2.3 \
  --notes "Description" \
  --minimum-native-version 1.0.0 \
  --mandatory
```

The current UI still allows **Later** even when `mandatory` is present. The field is reserved for a future store/update policy and must not be treated as forced behavior without an explicit product decision.

### Read the current channel

```bash
npm run ota:status
```

### Roll the channel back

```bash
npm run ota:rollback -- --version 1.2.2
```

Channel rollback affects devices that have not installed a newer version. A client already running `1.2.3` does not downgrade to `1.2.2`, because OTA version comparison is upgrade-only. Failed local activation is handled separately by automatic last-known-good rollback.

### Run local security checks

```bash
npm run ota:self-test
```

Include an R2 write/delete probe:

```bash
npm run ota:self-test -- --r2
```

The probe does not publish a channel manifest and is invisible to applications.

## First-Time Setup

1. Configure R2 public URL and S3-compatible credentials.
2. Run `npm run ota:keygen` once.
3. Back up `.ota/private-key.pem` securely.
4. Run `npm run cap:build` so Android and iOS contain the public key and manifest URL.
5. Build and publish the native applications through the stores.
6. For a later web change, publish a higher OTA version explicitly.

The native store release must contain OTA configuration before it can discover future OTA releases.

## File Map

```text
scripts/
├── ota-keygen.ts
├── ota-publish.ts
├── ota-rollback.ts
├── ota-self-test.ts
├── ota-status.ts
└── ota/
    ├── ota-config.ts
    └── ota-r2.ts

src/
├── components/
│   ├── ota/OtaUpdatePrompt.tsx
│   └── splash/SplashInitializer.tsx
├── features/ota/
│   ├── hooks/use-ota-update.tsx
│   ├── services/ota-api-service.ts
│   ├── services/ota-update-service.ts
│   └── types/ota.types.ts
├── platform/ota/
│   └── capacitor-ota-adapter.ts
├── core/
│   ├── api/gova-api-client.ts
│   └── config/public-env.ts
└── locales/
    ├── ar.json
    └── en.json
```

## Verification Checklist

Before publishing:

```bash
npm run typecheck
npm run architecture:check
npm run ota:self-test -- --r2
npm run cap:build
```

Android native build:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
cd android
.\gradlew.bat assembleDebug
```

Expected Android debug APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

iOS must be compiled and device-tested on macOS with Xcode.

## Test Scenario

1. Install a native build containing web version `1.0.0`.
2. Modify a visible component.
3. Run:

   ```bash
   npm run ota:publish -- --version 1.0.1 --notes "OTA test"
   ```

4. Open the application on Splash.
5. Confirm update progress appears before 100%.
6. Confirm the restart dialog appears only after the bundle is downloaded and verified.
7. Select **Later** and confirm the current session continues.
8. Restart the application and confirm `1.0.1` activates automatically.
9. Repeat with `1.0.2`, leave the app running, and verify the reminder returns after 24 hours.
10. Test a deliberately invalid signature and checksum; neither bundle may be extracted or activated.

## Troubleshooting

### Applications do not discover a release

Check:

- the installed native build contains the OTA manifest URL and public key;
- the published version is greater than the running web version;
- `manifest.json` is publicly readable;
- the device has working DNS and internet access;
- R2 CORS permits GET requests from Capacitor origins;
- the manifest signature matches the public key embedded in the application.

### `OTA manifest signature is invalid`

The publisher and application use different keys, or the manifest was modified after signing. Reinstall a native build containing the correct public key. Do not replace the private key for existing installations.

### Update downloads repeatedly but never activates

Inspect Logcat for `[GovaOTA]` messages. Confirm the archive contains `index.html`, the extracted path is accessible, and Splash reaches 100%. A failed release ID is blocked after rollback.

### `Filesystem` or `WebView` is unavailable

Run:

```bash
npm install
npm run cap:build
```

Then rebuild and reinstall the native application. Static browser previews intentionally do not activate native OTA bundles.

## Store Policy Note

OTA behavior must remain within current Apple App Store and Google Play policies. Native code and application binaries must always be updated through their stores. Apple may reject downloaded code that introduces or changes application features or functionality. Google Play also restricts self-updating applications and downloaded executable code, while interpreted JavaScript in a WebView has narrower exceptions.

Treat OTA as a mechanism for compatible web-bundle fixes and controlled UI updates, not as a way to bypass store review or materially change the application's declared purpose. Review store policies before each production rollout. Automatic downloads may also require clear user disclosure, including download size, depending on the store policy and the nature of the downloaded resources.

## Operational Rules

| Do | Do not |
|---|---|
| Publish with a new semantic version. | Overwrite an existing release directory. |
| Back up and protect the private key. | Commit signing material to Git. |
| Use OTA for compatible web-bundle changes. | Ship native/plugin changes through OTA. |
| Test Android and iOS on real devices. | Assume Android success proves iOS behavior. |
| Keep the last-known-good bundle. | Persist a new path before Splash succeeds. |
| Publish release objects before the channel manifest. | Announce a partially uploaded release. |
| Use HTTPS, signature, size, and checksum validation. | Trust a URL or checksum alone. |
