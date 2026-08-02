fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android doctor

```sh
[bundle exec] fastlane android doctor
```

Validate Android publishing prerequisites

### android build

```sh
[bundle exec] fastlane android build
```

Build Android release bundle without uploading

### android aab_signed

```sh
[bundle exec] fastlane android aab_signed
```

Build signed Android release bundle without uploading

### android aab_unsigned

```sh
[bundle exec] fastlane android aab_unsigned
```

Build unsigned Android release bundle without uploading

### android apk_signed

```sh
[bundle exec] fastlane android apk_signed
```

Build signed Android release APK without uploading

### android apk_unsigned

```sh
[bundle exec] fastlane android apk_unsigned
```

Build unsigned Android release APK without uploading

### android aab_signed_no_r8

```sh
[bundle exec] fastlane android aab_signed_no_r8
```

Build signed Android releaseNoR8 bundle without uploading

### android aab_unsigned_no_r8

```sh
[bundle exec] fastlane android aab_unsigned_no_r8
```

Build unsigned Android releaseNoR8 bundle without uploading

### android apk_signed_no_r8

```sh
[bundle exec] fastlane android apk_signed_no_r8
```

Build signed Android releaseNoR8 APK without uploading

### android apk_unsigned_no_r8

```sh
[bundle exec] fastlane android apk_unsigned_no_r8
```

Build unsigned Android releaseNoR8 APK without uploading

### android internal

```sh
[bundle exec] fastlane android internal
```

Upload Android bundle to Google Play internal track

### android production

```sh
[bundle exec] fastlane android production
```

Upload Android bundle to Google Play production track

----


## iOS

### ios doctor

```sh
[bundle exec] fastlane ios doctor
```

Validate iOS publishing prerequisites

### ios build

```sh
[bundle exec] fastlane ios build
```

Build iOS app archive without uploading. Requires macOS/Xcode.

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Upload iOS build to TestFlight. Requires macOS/Xcode and App Store Connect auth.

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
