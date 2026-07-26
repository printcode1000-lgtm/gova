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

### android internal

```sh
[bundle exec] fastlane android internal
```

Upload Android bundle to Google Play internal track

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
