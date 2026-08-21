# Invalid `JAVA_HOME` on Windows

## Symptom

Gradle fails before any Android task runs:

```text
ERROR: JAVA_HOME is set to an invalid directory: C:\Program Files\Java\jdk-21
```

This often appears from `npm run android:build:debug`, `npm run android:r8:verify-release`, or a direct `android\gradlew.bat` invocation.

## Root cause

`JAVA_HOME` points at a directory that does not exist. Oracle JDK installers on Windows frequently create versioned folders such as `jdk-21.0.12`, while older setup notes or copied examples still reference the generic `jdk-21` path.

`java` on `PATH` may still work because the Oracle installer also registers `C:\Program Files\Common Files\Oracle\Java\javapath\java.exe`. Gradle does not use that shortcut when `JAVA_HOME` is set to an invalid path.

## Required version

The project baseline is **JDK 21 LTS**. See `docs/00-overview/technologies.md` and `npm run doctor:environment -- --scenario=android`.

## Fix

1. Find the installed JDK root. Common locations on Windows:
   - `C:\Program Files\Java\jdk-21.0.12`
   - `C:\Program Files\Android\Android Studio\jbr`
2. Set the user environment variable to the directory that contains `bin\java.exe`, not the `bin` folder itself:

```powershell
[Environment]::SetEnvironmentVariable(
  "JAVA_HOME",
  "C:\Program Files\Java\jdk-21.0.12",
  "User"
)
```

3. Open a new terminal and verify:

```powershell
Test-Path "$env:JAVA_HOME\bin\java.exe"
java -version
npm run doctor:environment -- --scenario=android
```

Optional override for one session or CI without changing the user profile:

```powershell
$env:ASOL_ANDROID_JAVA_HOME = "C:\Program Files\Java\jdk-21.0.12"
```

## Project behavior

Repository scripts that invoke Gradle through `scripts/android/gradle.ts` run an Android build preflight **before any Gradle task starts**. The preflight lives in `packages/native-core/scripts/android-build-preflight.ts` and:

1. Validates `JAVA_HOME`, `ASOL_ANDROID_JAVA_HOME`, Android Studio JBR, and common Windows/macOS/Linux JDK install locations.
2. Validates the Android SDK root (`ANDROID_SDK_ROOT`, `ANDROID_HOME`, `android/local.properties`, or the default `%LOCALAPPDATA%\Android\Sdk`).
3. Requires Android SDK Platform 36 and at least one Build-Tools package.
4. Requires the checked-in Gradle wrapper under `android/`.
5. Auto-sets `JAVA_HOME` for the child Gradle process when a valid JDK is discovered.
6. Stops immediately with a bilingual Arabic/English error listing missing items and every searched JDK path when anything is missing.

Discovery order for JDK resolution:

- `ASOL_ANDROID_JAVA_HOME`
- Android Studio bundled JBR
- `JAVA_HOME`
- Filesystem scans under `C:\Program Files\Java`, `C:\Program Files\Eclipse Adoptium`, `C:\Program Files\Microsoft`, `C:\Program Files\Amazon Corretto`, and macOS/Linux JVM directories matching JDK 21 or 17 (only JDK 21 satisfies the project baseline).

Direct `android\gradlew.bat` calls still require a correct user `JAVA_HOME`. Fix the user variable for Android Studio and manual Gradle use.

## Verification

After correcting `JAVA_HOME`:

```powershell
cd android
.\gradlew.bat :app:assembleDebugR8
```

Or through the project script:

```powershell
npm run android:build:debug
```
