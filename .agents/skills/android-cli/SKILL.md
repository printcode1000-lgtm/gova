---
name: android-cli
description: Android command-line tools, build workflows, Gradle tasks, emulator management, Capacitor Android sync, and logcat inspection. Use when building, testing, syncing, or debugging Android native components or Capacitor Android payloads.
---

# Android CLI & Native Workflow Guide

Guide for managing Android builds, Gradle tasks, Capacitor native synchronization, emulator execution, and logcat diagnostics.

## 1. Capacitor Native Sync & Workflow

When syncing web/static builds to the Android container:

```bash
# Export static bundle (if authorized/needed)
npm run build:static

# Sync web assets and plugins to android project
npx cap sync android

# Open project in Android Studio (if needed)
npx cap open android
```

## 2. Gradle Build Commands

Execute Gradle commands directly from the `android/` root:

```bash
# Debug build
cd android && ./gradlew assembleDebug

# Release bundle (AAB)
cd android && ./gradlew bundleRelease

# Clean build artifacts
cd android && ./gradlew clean
```

## 3. Emulator & Device Management (ADB)

```bash
# List connected devices / running emulators
adb devices

# Install APK to device/emulator
adb install android/app/build/outputs/apk/debug/app-debug.apk

# View real-time logs filtered by tag or app package
adb logcat -s "Capacitor" "AsolApp"
```

## 4. Architectural Rules for Native Code

- All native logic, Capacitor plugin wrappers, and platform identity belong to `@asol/native-core`.
- Do not import `@capacitor/*` directly outside of `@asol/native-core` (enforced by ESLint and `architecture:check`).
- Respect the Touch-Only UI policy (`docs/04-ui-components/touch-interaction-policy.md`).
