# Mobile Back Button System

## Purpose

GOVA handles the Android system Back action consistently across the application. The action may come from the navigation bar, a hardware button, or the Android back gesture.

The system navigates through the application's web history when possible, provides a safe fallback when no history exists, and prevents accidental exits from the home page.

This behavior is enabled only inside the native Android Capacitor application. It does not replace the browser's Back behavior and does not run on iOS.

## User-visible behavior

| Current state | Back action |
|---|---|
| A previous web-history entry exists | Navigate to the previous page with `window.history.back()` |
| No previous entry exists and the current route is not `/home` | Replace the current route with `/home` |
| No previous entry exists and the current route is `/home` | Show “Press Back again to exit” for two seconds |
| Back is pressed again within those two seconds | Exit the Android application |
| The two-second confirmation period expires | A later Back press starts a new confirmation period |

Using `router.replace('/home')` for the fallback avoids adding a dead-end page to history.

## Architecture

```text
RootLayout
  -> MobileBackButtonController
    -> useMobileBackButton
      -> capacitorBackButtonAdapter
        -> @capacitor/app
          -> Android native Back event / App.exitApp()
```

The responsibilities are separated as follows:

- **Controller:** mounts the feature once and renders the translated exit-confirmation message.
- **Hook:** owns navigation decisions, the two-second confirmation state, and cleanup.
- **Platform adapter:** isolates Capacitor imports and exposes a small Android-only contract.
- **Capacitor App plugin:** receives the native Back event and performs an explicit application exit.

## Files

| File | Responsibility |
|---|---|
| `src/app/layout.tsx` | Mounts the global controller once for the whole application |
| `src/components/navigation/MobileBackButtonController.tsx` | Displays the accessible, translated confirmation message |
| `src/features/navigation/hooks/use-mobile-back-button.ts` | Implements history, home fallback, and double-press logic |
| `src/platform/navigation/capacitor-back-button-adapter.ts` | Wraps `@capacitor/app` and restricts the feature to native Android |
| `src/locales/ar.json` | Arabic exit-confirmation translation |
| `src/locales/en.json` | English exit-confirmation translation |
| `package.json` | Declares the `@capacitor/app` dependency |

## Platform detection

The adapter activates only when both conditions are true:

```typescript
Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
```

This prevents the handler from intercepting Back actions in normal browsers, static previews, or iOS.

## Native event handling

The adapter subscribes to the Capacitor `backButton` event. Capacitor supplies `canGoBack`, which indicates whether the WebView has a previous history entry.

The hook uses that value as the primary navigation decision:

1. `canGoBack === true`: call `window.history.back()`.
2. `canGoBack === false`: inspect the current application pathname.
3. Redirect a non-home route to `/home`, or run the home-page exit confirmation.

The pathname is normalized before comparison, so `/home` and `/home/` are treated as the same route.

## Exit confirmation

The first Back action at the history root of `/home` does not exit immediately. It sets a temporary confirmation state for 2,000 milliseconds and displays a global message.

The message uses:

- `role="status"`
- `aria-live="polite"`
- Arabic or English text from the existing localization system

If another Back action occurs before the timer expires, the hook calls `App.exitApp()`. Otherwise, the state and message are cleared automatically.

## Lifecycle and cleanup

The controller is mounted once by the root layout. When it unmounts, the hook:

- removes the native Back listener;
- clears the confirmation timeout;
- prevents an asynchronous subscription from being retained after cleanup.

This avoids duplicate handlers during React remounts and prevents stale timers.

## Build and synchronization

After changing this system or any native plugin dependency, rebuild and synchronize Capacitor:

```bash
npm run ota:publish -- --version <x.y.z>
npm run cap:build -- --version <x.y.z>
```

For an Android debug APK:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
Set-Location android
.\gradlew.bat assembleDebug
```

The generated APK is located at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Verification checklist

Run the automated project checks:

```bash
npm run typecheck
npm run architecture:check
npm run ota:publish -- --version <x.y.z>
npm run cap:build -- --version <x.y.z>
```

Then verify on an Android emulator or physical device:

1. Open `/home`, navigate to another page, and press Android Back. The previous page should appear.
2. Open the application directly on a route with no previous WebView history, then press Back. The application should navigate to `/home`.
3. At `/home` with no previous history, press Back once. The translated confirmation message should appear and the app should remain open.
4. Press Back again within two seconds. The application should exit.
5. Press Back once and wait longer than two seconds. The next press should show the message again instead of exiting.
6. Open the web application in a browser. Browser navigation must remain unchanged.

## Troubleshooting

### The Android Back action closes the app immediately

Confirm that `@capacitor/app` is installed and synchronized:

```bash
npm install
npx cap sync android
```

Then rebuild the native application. Updating only `out/` is insufficient when a native plugin was added.

### The handler runs more than once

Ensure `MobileBackButtonController` is mounted only in the root layout. Do not mount it again in individual pages or shell layouts.

### A modal or drawer should close before navigation

The current contract is route-history based. It does not automatically discover open dialogs, drawers, or menus. Such UI elements need an explicit, centralized interception layer before the history decision if that behavior is required later.

### Inspecting Android logs

Filter Logcat by package `com.gova.app`. JavaScript messages are normally reported with a source URL under `https://localhost/`, while native plugin errors are reported by Capacitor or the App plugin.

## Design constraints

- Keep Capacitor calls inside the platform adapter.
- Keep navigation decisions inside the feature hook.
- Mount only one global native Back listener.
- Do not apply Android exit behavior to browsers or iOS.
- Do not call `App.exitApp()` without the home-page confirmation.
