# Android R8 Optimization

The permanent `release` build type remains optimized:

- `minifyEnabled true`
- `shrinkResources true`
- `proguard-android-optimize.txt`
- `proguard-rules.pro`

## debugR8

`debugR8` is the installable device-diagnostics variant. It inherits the debug
signing key and remains debuggable, while running R8 code shrinking, resource
shrinking, and the same ProGuard inputs used by release. Android intentionally
disables R8 optimization and obfuscation for debuggable variants, so this build
is useful for diagnosing shrinking/resource failures without losing debugger
support. Build it with `:app:assembleDebugR8`; its APK is written under
`android/app/build/outputs/apk/debugR8/`.

## releaseNoR8

`android/app/build.gradle` also defines `releaseNoR8` using `initWith release`, then disables minification and resource shrinking:

- `minifyEnabled false`
- `shrinkResources false`
- `versionNameSuffix "-nor8"`

This build type is diagnostic only. The `-nor8` suffix makes the version clear, and the validator prevents any publishing lane from pointing to `ReleaseNoR8` or `no_r8`.

## Validator Assertions

`npm run android:r8:validate` verifies that release still uses R8 and resource shrinking, that `releaseNoR8` does not re-enable minify, and that lanes publishing to Google Play do not build no-R8 artifacts.
