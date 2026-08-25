# Capacitor WebView Duplicate Registration Blank Screen

## Symptom

Opening `/` in the local development server or the deployed web app returns HTML with status `200`, but the UI stays blank after client JavaScript starts.

The client log contains:

```text
Capacitor plugin "WebView" already registered. Cannot register plugins twice.
```

## Scope / Preconditions

This affects the shared web bundle when OTA runtime code reaches the native WebView bridge from a browser or hot-reloaded client session where Capacitor already has a `WebView` proxy registered.

## Root Cause

`packages/native-core/src/adapters/ota.adapter.ts` cached the WebView proxy only in an ASOL-owned global. If Capacitor already registered `WebView` in `Capacitor.Plugins`, a later ASOL call to `registerPlugin("WebView")` threw before the splash flow could complete.

## Diagnosis

Use non-browser checks only:

```bash
Invoke-WebRequest -UseBasicParsing http://localhost:3001/
Get-Content -Tail 200 .dev-server.err.log
```

The page response can be `200`; the distinguishing evidence is the duplicate WebView registration error in the client-collected development log.

## Fix

The native OTA adapter must reuse `Capacitor.Plugins.WebView` when present, and only call `registerPlugin("WebView")` when Capacitor has not registered it yet.

## Prevention

Keep Capacitor plugin registration inside `@asol/native-core`, and keep registration idempotent across Development, Web, Static `out/`, Android, and iOS.

## Related Surfaces

- `packages/native-core/src/adapters/ota.adapter.ts`
- `packages/ota-core/src/runtime/use-ota-update.tsx`
- `src/features/splash/presentation/SplashInitializer.tsx`
