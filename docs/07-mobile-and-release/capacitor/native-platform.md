# Native Platform

`src/native-platform` is the **only** sanctioned bridge between ASOL application
code and native device capabilities.

Pages, components, hooks, and feature services import from `@/native-platform`.

The **Native Platform Contract** check in `npm run architecture:check` rejects,
anywhere outside `src/native-platform`:

| Forbidden                                | Use instead                                  |
| ---------------------------------------- | -------------------------------------------- |
| `@capacitor/*` imports                   | the module's public API                      |
| `navigator.share` / `navigator.canShare` | `nativePlatform.share.send`                  |
| `navigator.geolocation`                  | `nativePlatform.location`                    |
| `navigator.clipboard`                    | `nativePlatform.clipboard`                   |
| `Notification.requestPermission`         | `nativePlatform.permissions.requestIfNeeded` |

Forbidding only the Capacitor imports would leave the layer bypassable through
the equivalent browser APIs, which carry none of its permission handling or
error normalization.

---

## Contents

- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Public APIs](#public-apis)
- [Platform differences](#platform-differences)
- [Permission flow](#permission-flow)
- [Share & Receive flow](#share--receive-flow)
- [Notification flow](#notification-flow)
- [Error handling](#error-handling)
- [Extension points](#extension-points)
- [Native project setup](#native-project-setup)
- [Future maintenance notes](#future-maintenance-notes)

---

## Architecture

```
Pages · Components · Hooks · Feature services
                  │
                  ▼
        @/native-platform            ← the only import surface
                  │
   ┌──────────────┼──────────────┐
   ▼              ▼              ▼
Module facade  Permission    core/
(camera.ts)     Manager      (errors, platform,
   │                          binary, listener,
   ▼                          lazy-plugin)
Adapters (native / web)
   │
   ▼
@capacitor/* plugins          ← never imported outside this layer
```

Every module follows the same three-file shape, each file with one
responsibility:

| File           | Responsibility                                                            |
| -------------- | ------------------------------------------------------------------------- |
| `types.ts`     | The contract: inputs, normalized outputs, presets. No logic.              |
| `<module>.ts`  | Facade: pick the platform adapter, enforce permissions. No plugin code.   |
| `*-adapter.ts` | Talk to exactly one plugin (or the browser API) and normalize its result. |

**Design rules**

1. **Single responsibility.** A facade never parses bytes; an adapter never
   decides about permissions; `types.ts` never contains behaviour.
2. **Lazy by default.** Plugins load through `createLazyPlugin` on first use.
   An uninstalled plugin degrades to an `Unavailable` error instead of breaking
   the bundle. This is what makes every feature optional.
3. **Normalized results.** Callers receive browser-native values (`File`,
   numbers, plain objects) on every platform. Platform paths such as
   `content://…` or `file:///data/user/0/…` never cross the boundary.
4. **One error type.** Everything throws `NativePlatformError`.

---

## Folder structure

```text
src/native-platform/
├── index.ts                     # public barrel + nativePlatform namespace
├── core/
│   ├── platform.ts              # web/android/ios detection
│   ├── errors.ts                # NativePlatformError + classification
│   ├── lazy-plugin.ts           # failure-tolerant dynamic import
│   ├── binary.ts                # base64/bytes/Blob/File + image sniffing
│   └── listener.ts              # emitter + plugin-handle cleanup
├── permissions/
│   ├── types.ts                 # PermissionKind / PermissionState
│   ├── permission-adapters.ts   # one adapter per kind, per platform
│   ├── permission-manager.ts    # check / request / requestIfNeeded / openSettings
│   └── index.ts
├── app/
│   ├── types.ts
│   ├── app-native-adapter.ts
│   ├── app.ts
│   └── index.ts
├── camera/
│   ├── types.ts
│   ├── camera-native-adapter.ts
│   ├── camera-web-adapter.ts
│   ├── camera.ts
│   └── index.ts
├── location/                    # types.ts · location.ts · index.ts
├── speech/                      # types.ts · speech-native-adapter.ts ·
│                                #  speech-web-adapter.ts · speech.ts
├── files/
│   ├── types.ts
│   ├── app-storage.ts           # application-private storage
│   ├── user-files.ts            # picking, opening, saving to device
│   └── index.ts
├── share/
│   ├── types.ts
│   ├── share-validator.ts       # untrusted-input validation
│   ├── share-queue.ts           # pending queue, deliver-once
│   ├── share.ts
│   └── index.ts
├── notifications/
│   ├── types.ts                 # channels live here
│   ├── push-notifications.ts    # FCM/APNs transport
│   ├── local-notifications.ts   # scheduling + badge
│   └── index.ts
├── barcode/
│   ├── types.ts
│   ├── duplicate-filter.ts
│   ├── barcode-scanner.ts
│   └── index.ts
└── tests/
    └── native-platform-contract.test.ts
```

Native project files:

```text
android/app/src/main/AndroidManifest.xml            # permissions + intent filters
android/app/src/main/java/hgh/asol/app/
├── MainActivity.java                               # registers ShareReceivePlugin
└── ShareReceivePlugin.java                         # ACTION_SEND bridge
ios/App/App/Info.plist                              # usage descriptions
ios/App/App/ShareReceivePlugin.swift                # App Group → WebView bridge
ios/ShareExtension/                                 # Share Extension target
├── ShareViewController.swift
├── Info.plist
└── ShareExtension.entitlements
```

---

## Public APIs

Import either the namespace or the individual module:

```ts
import { nativePlatform } from "@/native-platform";
// or
import { camera } from "@/native-platform/camera";
```

### App

Application lifecycle and identity. Before this module, `@capacitor/app` was
installed on both platforms but had no facade, so feature code could not reach
it at all — the contract forbids the direct import and there was no alternative.

```ts
app.info(): Promise<AppInfo>                                  // name, id, version, build
app.state(): Promise<AppState>                                // { isActive }
app.onStateChange(listener): Promise<AppUnsubscribe>
app.onDeepLink(listener): Promise<AppUnsubscribe>             // custom scheme + app links
app.exit(): Promise<void>                                     // Android only
app.canExit(): boolean
```

The web half is real, not a stub: `visibilitychange` carries the same meaning as
`appStateChange`, and the bundled manifest carries the same version the shell
reports. `exit()` throws `Unavailable` off Android — iOS treats a programmatic
exit as a crash and rejects it in review — and `onDeepLink` never fires in a
browser.

### Camera

```ts
camera.isAvailable(): Promise<boolean>
camera.takePhoto(options?: CapturePhotoOptions): Promise<CameraImage>
camera.pickImage(options?: PickImageOptions): Promise<CameraImage>
camera.pickImages(options?: PickImageOptions): Promise<CameraImage[]>
```

`CapturePhotoOptions`: `direction` (`rear` | `front`), `quality`
(`low` | `medium` | `high`), `correctOrientation`, `saveToGallery`.

`CameraImage` carries a browser `File`, the container detected from the actual
bytes (not the device's claim), the MIME type, and the byte size.

### Location

```ts
location.isAvailable(): Promise<boolean>
location.isServiceEnabled(): Promise<boolean>
location.getCurrentPosition(options?): Promise<LocationFix>
location.watchPosition(listener, options?, onError?): Promise<WatchHandle>
location.stopAllWatches(): Promise<void>
location.openSettings(): Promise<boolean>
```

Accuracy presets: `low` · `balanced` · `high`. **Background location tracking is
deliberately not implemented** and no background permission is requested.

### Speech Recognition

Voice-to-text only. This module never records, stores, or uploads audio.

```ts
speechRecognition.isAvailable(): Promise<boolean>
speechRecognition.checkPermission(): Promise<PermissionResult>
speechRecognition.requestPermission(): Promise<PermissionResult>
speechRecognition.startListening(options?): Promise<SpeechSession>
speechRecognition.stopListening(): Promise<string>
speechRecognition.transcribeOnce(options?): Promise<string>
speechRecognition.isListening(): boolean
```

`SpeechSession` exposes `onResult` (interim **and** final), `onEnd`, `onError`,
and `stop()`. Options: `language` (any BCP-47 tag), `partialResults`,
`continuous`, `addPunctuation`.

Only one session runs at a time; `startListening` stops any previous session
first.

### Files

Two halves with distinct responsibilities:

```ts
// Application-private storage the user never browses
files.app.write(path, data, { area })      // area: "data" | "cache"
files.app.writeText(path, text, { area })
files.app.read(path, { area }): Promise<Uint8Array>
files.app.readText(path, { area }): Promise<string>
files.app.exists(path, { area }): Promise<boolean>
files.app.info(path, { area }): Promise<AppFileInfo | null>
files.app.delete(path, { area })
files.app.clearCache()
files.app.ensureDirectory(path, { area })

// User-facing
files.user.pickFile(options?): Promise<PickedFile>
files.user.pickFiles(options?): Promise<PickedFile[]>
files.user.pickImages(options?): Promise<PickedFile[]>
files.user.pickPdf(): Promise<PickedFile>
files.user.pickDocuments(options?): Promise<PickedFile[]>
files.user.saveToDevice(blob, { fileName, mimeType })
files.user.openExternally(cachePath)
```

Application paths are **logical and relative**. `assertSafePath` rejects
traversal (`../`), absolute paths, drive letters, and null bytes.

### Share & Receive

```ts
// Sending
share.canSend(): Promise<boolean>
share.send(options: ShareSendOptions): Promise<void>

// Receiving
share.initializeReceiving(): Promise<void>   // call once at startup
share.getPendingItems(): ReceivedItem[]
share.consumeItem(id): ReceivedItem | null
share.consumeAllItems(): ReceivedItem[]
share.clearItem(id): void
share.addListener(listener): Unsubscribe
share.dispose(): Promise<void>
```

### Notifications

```ts
// Push (FCM / APNs)
notifications.push.isSupported(): boolean
notifications.push.checkPermission(): Promise<PermissionResult>
notifications.push.requestPermission(): Promise<PermissionResult>
notifications.push.register(): Promise<PushToken>
notifications.push.unregister(): Promise<void>
notifications.push.getDelivered(): Promise<NotificationPayload[]>
notifications.push.removeAllDelivered(): Promise<void>
notifications.push.onToken(listener): Unsubscribe
notifications.push.onReceived(listener): Unsubscribe
notifications.push.onAction(listener): Unsubscribe
notifications.push.createChannels(): Promise<void>

// Local
notifications.local.requestPermission(): Promise<PermissionResult>
notifications.local.schedule(notification): Promise<void>
notifications.local.scheduleMany(notifications): Promise<void>
notifications.local.cancel(id): Promise<void>
notifications.local.cancelAll(): Promise<void>
notifications.local.getPending(): Promise<number[]>
notifications.local.setBadge(count): Promise<void>
notifications.local.clearBadge(): Promise<void>
notifications.local.clearDelivered(): Promise<void>
```

### Barcode Scanner

```ts
barcodeScanner.isAvailable(): Promise<boolean>
barcodeScanner.scanOnce(options?): Promise<ScanResult>
barcodeScanner.startScan(options?): Promise<ScanSession>
barcodeScanner.stopScan(): Promise<void>
barcodeScanner.isScanning(): boolean
```

`ScanSession` exposes `onScan`, `setTorch(enabled)`, `isTorchAvailable()`, and
`stop()`. Options: `formats` (defaults to every supported format; `QR_ONLY`
preset available), `facing`, `duplicateWindowMs` (default 2000).

### Permission Manager

```ts
permissionManager.check(kind): Promise<PermissionResult>
permissionManager.request(kind): Promise<PermissionResult>
permissionManager.requestIfNeeded(kind): Promise<PermissionResult>
permissionManager.checkAll(kinds): Promise<Record<string, PermissionResult>>
permissionManager.requestAllIfNeeded(kinds): Promise<boolean>
permissionManager.requestLocalNotificationsIfNeeded(): Promise<PermissionResult>
permissionManager.canOpenSettings(): boolean
permissionManager.openSettings(): Promise<boolean>
```

`canOpenSettings()` answers *before* trying, so a caller can choose a different
recovery instead of rendering a button that always resolves `false`. It is
`true` on Android only — the in-house `AppSettings` plugin lives in the Android
shell; iOS has no implementation yet and a browser has no route at all. Ask it
rather than testing `isNativePlatform()`, which would wrongly include iOS.

Kinds: `camera` · `photos` · `location` · `microphone` · `speech-recognition` ·
`notifications`.

`photos` is a no-op on Android by design. Gallery selection goes through the
Android Photo Picker, which returns a scoped `content://` URI, so ASOL declares
no media permission and the alias always reports `granted` without prompting.
The manifest actively strips `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`,
`READ_MEDIA_VISUAL_USER_SELECTED`, and the legacy external-storage permissions
from the merged output so a dependency cannot reintroduce broad media access.
See [Storage Image Source Picker System](../../02-data-and-storage/storage-image-source-picker-system.md#gallery-selection-uses-the-android-photo-picker).
`camera` is unaffected and still prompts normally.

---

## Platform differences

| Capability          | Web                      | Android                  | iOS                      |
| ------------------- | ------------------------ | ------------------------ | ------------------------ |
| App state           | `visibilitychange`       | `@capacitor/app`         | `@capacitor/app`         |
| App deep links      | not supported            | `appUrlOpen`             | `appUrlOpen`             |
| App exit            | not supported            | `App.exitApp()`          | not supported (policy)   |
| Camera capture      | `<input capture>`        | `@capacitor/camera`      | `@capacitor/camera`      |
| Gallery pick        | `<input type=file>`      | Android Photo Picker     | native picker            |
| Location            | Geolocation API          | Geolocation plugin       | Geolocation plugin       |
| Speech              | Web Speech API           | plugin (partial results) | plugin (partial results) |
| App storage         | in-memory, page lifetime | Filesystem Data/Cache    | Filesystem Data/Cache    |
| File picking        | `<input type=file>`      | FilePicker plugin        | FilePicker plugin        |
| Save to device      | anchor download          | share sheet              | share sheet              |
| Share (send)        | `navigator.share`        | Share plugin             | Share plugin             |
| Share (receive)     | not supported            | intent filters           | Share Extension          |
| Push                | not supported here       | FCM                      | APNs                     |
| Local notifications | Web Notification + timer | LocalNotifications       | LocalNotifications       |
| Barcode             | not supported            | ML Kit                   | **not installed**        |
| Open settings       | not supported            | in-house `AppSettings`   | not shipped yet          |

**Notable asymmetries**

- Web app storage is **page-lifetime only**. It matches `cache` semantics; do
  not rely on `data` persisting in a browser.
- The browser file input has no cancel event; the adapters detect dismissal via
  a window `focus` heuristic, so a cancel resolves ~400 ms later.
- Android needs the Google ML Kit scanner module, downloaded on demand by
  `ensureReady()`. iOS has **no** scanner: the plugin is CocoaPods-only and the
  iOS project is SPM-only, so `barcode.scan` is declared for Android alone and
  is a platform-optional capability.
- iOS reports `limited` photo access; the layer maps it to `granted` because
  the picker still works.

---

## Permission flow

```
Caller                Module facade         Permission Manager      Adapter
  │  takePhoto()          │                        │                   │
  ├──────────────────────►│                        │                   │
  │                       │  requestIfNeeded()     │                   │
  │                       ├───────────────────────►│  check()          │
  │                       │                        ├──────────────────►│
  │                       │                        │◄── Granted ───────┤
  │                       │◄── granted:true ───────┤  (no prompt)      │
  │                       │                        │                   │
  │                       │   plugin call          │                   │
  │◄──── CameraImage ─────┤                        │                   │
```

`requestIfNeeded` prompts only when it can help:

| Current state                         | Behaviour                      |
| ------------------------------------- | ------------------------------ |
| `granted`                             | returns immediately, no prompt |
| `unsupported`                         | returns immediately            |
| `prompt`                              | shows the system prompt        |
| `denied` → still denied after request | reported as **`blocked`**      |

`blocked` means the OS will not prompt again in this install. The UI should
offer `permissionManager.openSettings()` rather than a button that silently
does nothing.

On Android, `openSettings()` is backed by the narrow in-house `AppSettings`
plugin. It opens `ACTION_APPLICATION_DETAILS_SETTINGS` for `hgh.asol.app` and
cannot launch an arbitrary intent or another package. The unsupported iOS path
returns `false` until an iOS implementation is shipped.

Camera and photo requests pass explicit Capacitor aliases. Camera uses
`{ permissions: ["camera"] }`; Photo Picker uses
`{ permissions: ["photos"] }`. A rejected bridge call is propagated as a real
native-platform error instead of being disguised as `unsupported` or `denied`.

**Notification permission is never requested implicitly.** After an
interactive login, ASOL explains the benefit in its own dialog. Only pressing
the enable action invokes `requestPermission()`; `push.register()` still
throws if permission is absent. Session hydration never opens the prompt.

---

## Share & Receive flow

### Sending

```
send({ text, url, files })
      │
      ├─ files? → copy into app cache → resolve native URI
      │
      └─ Share plugin (native) or navigator.share (web) → OS share sheet
```

Blobs cannot be handed to a share sheet directly, so outgoing files are staged
into `cache/outbox/` first.

### Receiving

```
Other app ──► OS share sheet ──► ASOL
                                  │
        ┌─────────────────────────┴──────────────────────────┐
        ▼ Android                                   ▼ iOS
  Intent filter (ACTION_SEND /                Share Extension writes to
  ACTION_SEND_MULTIPLE)                       App Group container
        │                                             │
  ShareReceivePlugin.java                      ShareReceivePlugin.swift
  reads the intent, caps at 25 MB,             drains pending.json + ShareInbox/
  base64-encodes                                       │
        └─────────────────┬───────────────────────────┘
                          ▼
              share-validator.ts   ← untrusted input boundary
                          │  • URL scheme allow-list (http/https only)
                          │  • MIME allow-list
                          │  • 25 MB cap
                          │  • file-name sanitisation
                          ▼
                  share-queue.ts   ← deliver-once, bounded to 50
                          │
                          ▼
        share.getPendingItems() / addListener()
```

**Guarantees**

1. Content arriving before the WebView is ready is **buffered**, then drained by
   `initializeReceiving()`. Nothing is lost when the OS cold-starts the app into
   a share.
2. A late-mounting subscriber still receives everything queued — `addListener`
   replays the backlog.
3. `consumeItem` returns an item **exactly once**.
4. **Nothing is ever uploaded automatically.** Received content is validated,
   held in application-private storage, and surfaced only when the application
   asks.

Content shared into the app is treated as hostile input. `javascript:`,
`file:`, and `data:` URLs are rejected; unknown binary MIME types are dropped
rather than trusted; file names are stripped of path separators.

---

## Notification flow

```
Server ──► FCM (Android) / APNs (iOS) ──► device
                                            │
                                    push-notifications.ts
                                            │
                        ┌───────────────────┼───────────────────┐
                        ▼                   ▼                   ▼
                  onToken()           onReceived()          onAction()
                (register/refresh)   (foreground)        (user tapped)
                        │                   │                   │
                        └───────────────────┴───────────────────┘
                                            ▼
                          features/notifications  ← business meaning
                          (category, routing, dedupe, persistence)
```

The Native Platform layer is a **transport**. It carries no business meaning:
categories, routing, dedupe keys, and persistence remain in
`src/features/notifications`, which now consumes this layer instead of importing
the plugin directly.

Android channels are declared once in `notifications/types.ts`. **Their ids,
names, and sound are matched by already-installed clients — changing them
creates a duplicate channel and silently discards the user's existing
preference.**

---

## Error handling

Everything throws `NativePlatformError` with a `code`, the `module` that raised
it, and the original `cause`.

| Code                | Meaning                                       | Typical UI response                      |
| ------------------- | --------------------------------------------- | ---------------------------------------- |
| `unavailable`       | No such feature here, or the plugin is absent | Hide the entry point                     |
| `permission-denied` | Access refused                                | Explain why; offer settings if `blocked` |
| `cancelled`         | User dismissed a picker or prompt             | Do nothing — this is not an error        |
| `timeout`           | Operation exceeded its budget                 | Offer retry                              |
| `invalid-argument`  | Caller passed something impossible            | Programming error; fix the call          |
| `service-disabled`  | GPS or a device service is off                | Ask the user to enable it                |
| `internal`          | Unclassified plugin failure                   | Generic message; log the cause           |

```ts
import {
  camera,
  isCancelledError,
  NativePlatformError,
} from "@/native-platform";

try {
  const image = await camera.takePhoto();
  upload(image.file);
} catch (error) {
  if (isCancelledError(error)) return; // user backed out
  if (error instanceof NativePlatformError) {
    if (error.code === "permission-denied") showPermissionHelp();
    else showError(error.message);
  }
}
```

Raw plugin errors are classified by `toNativeError()`; no module re-implements
cancellation or permission detection.

---

## Extension points

### Add a new module

1. Create `src/native-platform/<module>/`.
2. `types.ts` — contract only.
3. `<module>-native-adapter.ts` and/or `<module>-web-adapter.ts` — one plugin
   each, wrapped in `createLazyPlugin`, errors funnelled through
   `toNativeError`.
4. `<module>.ts` — facade: platform selection and permission enforcement.
5. `index.ts` — public exports.
6. Re-export from `src/native-platform/index.ts` and add to the
   `nativePlatform` namespace.

### Add a new permission kind

1. Add it to `PermissionKinds` in `permissions/types.ts`.
2. Add an entry to both `NATIVE_ADAPTERS` and `WEB_ADAPTERS` in
   `permission-adapters.ts`.
3. Declare the OS strings (`Info.plist`, `AndroidManifest.xml`).

### Add a barcode format

Add it to `BarcodeFormats` in `barcode/types.ts`; `ALL_FORMATS` derives
automatically.

### Add a notification channel

Add it to `DEFAULT_CHANNELS` in `notifications/types.ts`. Both push and local
modules register from that one list.

### Accept a new shared MIME type

1. Add it to `DOCUMENT_MIME` (or a new classifier) in `share-validator.ts`.
2. Add a matching `<data android:mimeType>` intent filter.
3. Widen `NSExtensionActivationRule` in the Share Extension `Info.plist`.

---

## Native project setup

### Android — complete

Everything is committed and applied by `npx cap sync`:

- Permissions and `<queries>` in `AndroidManifest.xml`
- Share intent filters on `MainActivity`
- `ShareReceivePlugin.java`, registered in `MainActivity.onCreate`

### iOS — project registration complete

The `ShareExtension` target, embedded `.appex`, bridge source, App Group
entitlements, and `asol` URL scheme are committed in the Xcode project.
`scripts/configure-ios-share-extension.rb` makes this registration idempotent.

Apple Developer provisioning is still external: register
`hgh.asol.app.ShareExtension`, enable `group.hgh.asol.app` for both identifiers,
and regenerate the two provisioning profiles before archive. Validate the
extension on macOS and a real iPhone because Windows cannot compile or launch
it.

---

## Future maintenance notes

### Capability registry

`nativePlatform.capabilities` reports support without requesting permissions:

```ts
if (await nativePlatform.capabilities.has(CapabilityKeys.BarcodeScan)) {
  // It is safe to expose the scanner entry point; scanning still requests
  // camera permission only when the user starts it.
}
```

`has`, `hasAll`, `missing`, and `snapshot` resolve plugin presence lazily and
cache results for the process session. `shell-capabilities.ts` declares the
keys compiled into the shell and `NATIVE_CAPABILITY_VERSION` changes whenever
that set changes. Capability discovery never asks for an OS permission.

The declaration is **per platform**. `SHELL_CAPABILITIES_BY_PLATFORM` names what
each shell contains; `shellCapabilitiesFor(platform)` reads the running one, and
`UNIVERSAL_SHELL_CAPABILITIES` / `PLATFORM_OPTIONAL_SHELL_CAPABILITIES` are
derived from it. A flat list forced both platforms to claim the union, which is
how `barcode.scan` came to be declared on iOS where it does not exist.

**On a device, presence means `Capacitor.isPluginAvailable`, not a successful
`import()`.** Every plugin's JavaScript ships inside the web bundle, so on
Android and iOS the import resolves whether or not the installed shell contains
the matching Java/Swift — it proves only that the bundle contains its own code.
`pluginNameByFamily` records the name each family is registered under, and the
registry asks the bridge for that name; `PluginHeaders` is injected by the
native side for the plugins it actually registered.

`SHELL_CAPABILITIES` is a constant compiled into the web bundle, so an OTA
release carries its own copy of it. It therefore acts as a **narrowing filter
only** — it can withdraw a capability, never grant one. Treating it as proof of
shell contents would let a bundle vouch for itself.

`shell-capabilities.ts` also owns `MINIMUM_SUPPORTED_NATIVE_VERSION`, the floor
stamped into `manifest.minimumNativeVersion` and the fallback installed-version
value. Every consumer imports it rather than repeating the literal.

The curated `0.2.0` shell adds Browser, Haptics, Network, Device, Clipboard,
Status Bar, Keyboard, Splash Screen, Preferences, Screen Orientation, Dialog,
Toast, Action Sheet, and Text Zoom. Each has `types.ts`, a facade, and a lazy
native adapter. None adds a dangerous Android permission. ML Kit Barcode remains
CocoaPods-only and is intentionally not migrated; every compatible plugin is
listed in `ios/App/CapApp-SPM/Package.swift`.

The shell also includes the local `BackgroundDownload` and `StorageCapacity`
bridges. Android hands
one signed OTA bundle to `DownloadManager`; iOS uses one background
`URLSession` and forwards completion through `AppDelegate`. Feature code sees
only `nativePlatform.backgroundDownload`. `nativePlatform.storageCapacity`
measures free bytes on the app data volume before OTA scheduling and reports
`Unavailable` on web or when the native measurement cannot be obtained.
Completion metadata is untrusted:
the web layer streams the file, verifies its signed bundle hash, validates ZIP
entry paths, and verifies every extracted file hash before activation.

To add a capability:

1. Add one user-visible key to `capability-keys.ts`.
2. Add a plugin family, its registered native name in `pluginNameByFamily`, and
   a platform support decision to `capability-registry.ts`.
3. Add a detection token to `apiPatterns` in `scripts/ota/ota-capability-scan.ts`
   naming the **real** facade method. `assertDetectionCoverage()` fails the
   build if you skip this, because an undetectable key never reaches
   `requiredCapabilities` and the device gate would stop protecting it.
4. Add the key to the shell declaration for **each platform that has the
   plugin**, add its `CAPABILITY_AVAILABILITY` entry (`backedSince` = the shell
   that has the plugin, `vocabularySince` = the store release adding the key),
   and bump `NATIVE_CAPABILITY_VERSION`. The compiler rejects a missing
   availability entry; without it the publisher could list a key installed
   clients cannot name, which makes them refuse every release.
5. Expose the operation through a Native Platform facade; permissions remain
   explicit in the operation, never in capability detection.
6. Run the Native Platform, OTA delivery, architecture, type, and lint checks.
7. Publish a store shell and move the `native-v*` baseline tag before relying
   on the key from OTA-delivered UI.

### Plugin matrix

`npm run test:native-platform` includes `plugin-matrix.test.ts`, which reads the
real project files and fails when the picture below stops being true — the npm
dependency, the Android module in `capacitor.settings.gradle` and
`capacitor.build.gradle`, the iOS SPM package in `Package.swift`, the custom
plugins' `registerPlugin` call and `jsName`, and the capability each one backs.
The matrix is checked, not remembered.

| Plugin | Android | iOS | Capability keys |
| ------ | :-----: | :-: | --------------- |
| `@capacitor/app` | ✅ | ✅ | `app.state` · `app.info` · `app.deepLink` · `app.exit` |
| `@capacitor/action-sheet` | ✅ | ✅ | `actionSheet.show` |
| `@capacitor/browser` | ✅ | ✅ | `browser.open` |
| `@capacitor/camera` | ✅ | ✅ | `camera.takePhoto` · `camera.pickImages` |
| `@capacitor/clipboard` | ✅ | ✅ | `clipboard.read` · `clipboard.write` |
| `@capacitor/device` | ✅ | ✅ | `device.info` · `device.id` |
| `@capacitor/dialog` | ✅ | ✅ | `dialog.alert` · `dialog.confirm` · `dialog.prompt` |
| `@capacitor/filesystem` | ✅ | ✅ | `files.appStorage` |
| `@capacitor/geolocation` | ✅ | ✅ | `location.current` · `location.watch` |
| `@capacitor/haptics` | ✅ | ✅ | `haptics.impact` · `haptics.notification` |
| `@capacitor/keyboard` | ✅ | ✅ | `keyboard.control` · `keyboard.listen` |
| `@capacitor/local-notifications` | ✅ | ✅ | `notifications.local` |
| `@capacitor/network` | ✅ | ✅ | `network.status` · `network.listen` |
| `@capacitor/preferences` | ✅ | ✅ | `preferences.read` · `preferences.write` |
| `@capacitor/push-notifications` | ✅ | ✅ | `notifications.push` |
| `@capacitor/screen-orientation` | ✅ | ✅ | `screenOrientation.lock` · `screenOrientation.current` |
| `@capacitor/share` | ✅ | ✅ | `share.send` · `files.save` · `files.open` |
| `@capacitor/splash-screen` | ✅ | ✅ | `splashScreen.control` |
| `@capacitor/status-bar` | ✅ | ✅ | `statusBar.style` · `statusBar.visibility` · `statusBar.backgroundColor` |
| `@capacitor/text-zoom` | ✅ | ✅ | `textZoom.get` · `textZoom.set` |
| `@capacitor/toast` | ✅ | ✅ | `toast.show` |
| `@capawesome/capacitor-file-picker` | ✅ | ✅ | `files.pick` |
| `@capgo/capacitor-speech-recognition` | ✅ | ✅ | `speech.recognize` |
| `@capacitor-mlkit/barcode-scanning` | ✅ | ❌ | `barcode.scan` — **platform-optional** |
| `ShareReceive` (custom) | ✅ | ✅ | `share.receive` |
| `BackgroundDownload` (custom) | ✅ | ✅ | `backgroundDownload.bundle` |
| `StorageCapacity` (custom) | ✅ | ✅ | `storageCapacity.freeSpace` |

`files.save` and `files.open` resolve through the **Share** family, not
FilePicker: `saveToDevice` and `openExternally` stage the file with Filesystem
and hand it to the system share sheet. Mapping them to the picker reported them
available on a shell without Share.

#### Barcode scanning is Android only

`@capacitor-mlkit/barcode-scanning` ships a CocoaPods podspec and no
`Package.swift`, and `ios/App` is an SPM project with no Podfile, so the plugin
is not compiled into the iOS shell. Three options were considered:

| Option | Verdict |
| ------ | ------- |
| Declare it Android-only | **Chosen.** Honest, verifiable on Windows, and the entry point simply stays hidden on iOS. |
| Add CocoaPods beside SPM | Deferred — a native project change that cannot be compiled or tested from this workstation. |
| Web `BarcodeDetector` fallback | Rejected — not implemented in WKWebView. |

The plugin-matrix test asserts that a package without SPM support is never
declared for iOS, so this cannot be undone by accident. Restoring it means
adding CocoaPods and rebuilding on macOS.

### Live control without a release

`src/features/feature-flags` is the only switch that reaches devices without
publishing anything. OTA replaces the web bundle; a store release needs review;
a row in `feature_flags` takes effect on the next refresh.

```
feature_flags (users DB)
        │  GET /api/feature-flags
        ▼
FeatureFlagController   ← mounted once in the root layout
        │  refresh on mount, every 15 min, and on foreground
        ▼
featureFlags.isEnabled(definition)
        │
        └─ remotely enabled  AND  capabilities.has(definition.capability)
```

The AND is what makes a platform-optional capability safe to ship:
`barcode.scanner` can be on for everyone and still stay dark on iOS, because the
capability half of the answer is false there.

Flags are declared once in `definitions.ts`. The server answers **every** declared
flag, falling back to its `defaultEnabled`, so adding a definition never depends
on seeding a row. A failed refresh keeps the last known values — a device that
cannot reach the server behaves as it did a moment ago instead of resetting to
defaults.

`feature_flags` is created by
`migrations/0008_feature_flags.sql` and is registered in the users shard in
`schema-sync.ts`. Apply it before deploying the endpoint:

```powershell
npx drizzle-kit migrate
npm run db:schema:sync
```

### Verified vs. not verified

| Area                                                             | Status                                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| TypeScript layer, contracts, validation, queue, duplicate filter | Unit-tested (`npm run test:native-platform`)                                            |
| Plugin/shell/capability matrix                                   | Verified against the real Android and iOS projects by `plugin-matrix.test.ts`           |
| Architecture contract enforcement                                | Verified — the rule was proven to reject a real violation                               |
| Existing consumers (image picker, voice input, push)             | Migrated; behaviour preserved; existing suites pass                                     |
| Application migration to the layer                               | Complete — no page uses `navigator.share`, `navigator.geolocation`, or a raw file input |
| Plugin behaviour on real hardware                                | **Not verified in this environment**                                                    |
| Android share receiving                                          | Source complete; **needs a device run**                                                 |
| iOS share receiving                                              | Xcode target complete; **needs Apple provisioning and a device run**                    |

Camera, Location, Speech, Files, Share-send, Push, Local notifications, and
Barcode all depend on device hardware and cannot be exercised on a Windows
workstation. Test them on a real device before release.

### Plugin versions

All plugins are pinned to the Capacitor 8 line:

| Plugin                                | Version |
| ------------------------------------- | ------- |
| `@capacitor/camera`                   | ^8.2.0  |
| `@capacitor/filesystem`               | ^8.1.2  |
| `@capacitor/geolocation`              | ^8.2.0  |
| `@capacitor/share`                    | ^8.0.1  |
| `@capacitor/push-notifications`       | ^8.1.2  |
| `@capacitor/local-notifications`      | ^8.2.1  |
| `@capacitor-mlkit/barcode-scanning`   | ^8.1.0  |
| `@capawesome/capacitor-file-picker`   | ^8.0.3  |
| `@capgo/capacitor-speech-recognition` | ^8.1.7  |
| `@capacitor/browser`                  | ^8.0.4  |
| `@capacitor/haptics`                  | ^8.0.2  |
| `@capacitor/network`                  | ^8.0.1  |
| `@capacitor/device`                   | ^8.0.3  |
| `@capacitor/clipboard`                | ^8.0.1  |
| `@capacitor/status-bar`               | ^8.0.3  |
| `@capacitor/keyboard`                 | ^8.0.5  |
| `@capacitor/splash-screen`            | ^8.0.2  |
| `@capacitor/preferences`              | ^8.0.1  |
| `@capacitor/screen-orientation`       | ^8.0.1  |
| `@capacitor/dialog`                   | ^8.0.1  |
| `@capacitor/toast`                    | ^8.0.1  |
| `@capacitor/action-sheet`             | ^8.1.1  |
| `@capacitor/text-zoom`                | ^8.0.1  |

Upgrading Capacitor requires upgrading all of them together. A resolved-version
change inside an unchanged range still ships different native code, so the OTA
publish gate compares `package-lock.json` as well as `package.json`.

### Sanctioned exceptions to the contract

**Capacitor imports** — four files, listed in `CAPACITOR_IMPORT_ALLOWED_FILES`
in `scripts/architecture-check.ts`. They cover native concerns outside the
Native Platform modules: OTA delivery, the native HTTP bridge, and two
lifecycle adapters that predate the App module.

```
src/platform/navigation/capacitor-back-button-adapter.ts
src/platform/ota/capacitor-ota-adapter.ts
src/features/ota/services/ota-api-service.ts
src/features/page-snapshot/hooks/use-page-snapshot.tsx
```

These four are plugin bindings that happen to live outside the layer, so the
OTA publish gate treats them exactly like an adapter: it classifies a `src/`
file as a native surface by the plugin import it contains, not by its
directory. A path-prefix rule would have let them ship over OTA unexamined.

**Browser APIs** — one file, listed per-pattern in
`NATIVE_CAPABILITY_PATTERNS`:

```
src/components/ui/AsolMap/gps.ts   # createBrowserGpsProvider, an explicit opt-out
```

Do not extend either list for anything the Native Platform modules already cover.

### Compatibility shims

Two files adapt the new layer to older narrow interfaces so existing callers did
not have to change:

- `src/platform/media/capacitor-image-source-adapter.ts` → Camera
  (`StorageImageManager` expects `null` on cancel rather than a throw)
- `src/platform/speech/speech-recognition-adapter.ts` → Speech
  (voice-input scanner expects a single-shot `Promise<string>`)

They contain no plugin code. When their consumers migrate to the module APIs
directly, delete the shims.

### Web Push is inside the contract

Web Push is not a Capacitor transport, so `notifications.push.isSupported()`
returns `false` in the browser and `web-push-browser-service` keeps its own
service-worker subscription logic.

Its **permission**, however, goes through the Permission Manager like every
other permission in the application. Before this, `subscribe()` called
`Notification.requestPermission()` directly, which prompted implicitly in the
middle of a subscription flow and broke the layer's "never prompt until
required" guarantee on the web.

### Deliberate omissions

- **Background location** — not implemented; no background permission is
  requested. Adding it changes the app's privacy disclosure on both stores.
- **Audio recording** — the Speech module converts speech to text only. It must
  never gain a "save the audio" capability without a new privacy review.

### Related documentation

- [capacitor.md](./capacitor.md) — Capacitor shell, build, and OTA
- [voice-input-system.md](../../05-platform-features/voice-input-system.md)
- [storage-image-source-picker-system.md](../../02-data-and-storage/storage-image-source-picker-system.md)
