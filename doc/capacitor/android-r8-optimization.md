# Android R8 Release Optimization

## Scope

ASOL enables R8 code optimization and Android resource shrinking only for the
`release` build type:

```gradle
release {
    minifyEnabled true
    shrinkResources true
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
        'proguard-rules.pro'
}
```

Debug remains unminified for reliable local debugging. The project uses Android
Gradle Plugin 9.2.1, so optimized resource shrinking and strict keep-rule
semantics use the AGP defaults. Legacy properties that explicitly disabled
those behaviors were removed from `android/gradle.properties`.

R8 reduces native DEX code and Android resources. It does not shrink the
HTML/JavaScript/CSS/images copied from `out/`; web-bundle optimization is a
separate concern.

Official references:

- [Enable app optimization with R8](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization)
- [Keep-rule guidance](https://developer.android.com/topic/performance/app-optimization/keep-rules-overview)
- [Customize resources to keep](https://developer.android.com/topic/performance/app-optimization/customize-which-resources-to-keep)

## Capacitor and reflection safety

Capacitor's Android library contributes consumer ProGuard rules that preserve
`Plugin` subclasses and methods annotated with `@PluginMethod`. These rules are
automatically merged from the `capacitor-android` dependency.

ASOL's application rules add only:

- runtime annotation and generic/inner-class metadata needed by reflection;
- methods annotated with `@JavascriptInterface`, which WebView calls from
  JavaScript.

The application deliberately avoids package-wide `-keep` rules and global
`-dontshrink`, `-dontoptimize`, or `-dontobfuscate` switches because they would
cancel most R8 benefits. Firebase and Android libraries continue to supply
their own consumer rules.

## Permanent policy validation

```bash
npm run android:r8:validate
```

The validator fails when:

- Release no longer enables `minifyEnabled` or `shrinkResources`;
- the optimized Android default rules are replaced;
- full mode, strict keep semantics, or optimized resource shrinking are
  disabled;
- Capacitor reflection safeguards are absent;
- broad optimization-blocking rules enter the application rules.

The policy validator is part of the full test suite, `cap:verify-defaults`,
`cap:sync`, and `cap:copy`. `cap:build` runs it before any OTA publication, so
an invalid native Release policy cannot publish first and fail later.

## Real Release verification without packaging

```bash
npm run android:r8:verify-release
```

This command synchronizes required Android push configuration, validates backup
and R8 policies, and runs only Gradle's `:app:minifyReleaseWithR8` task. It does
not invoke APK or AAB packaging.

The command requires non-empty:

- `mapping.txt`: obfuscation mapping for crash retracing;
- `usage.txt`: removed native code;
- `resources.txt`: resource-optimizer report;
- `configuration.txt`: the complete merged R8 configuration.

It also parses `mapping.txt` and requires the reflected entry-point names for
the ASOL activity and Capacitor App, Camera, Filesystem, Push Notifications, and
Speech Recognition plugins to remain unchanged.

Keep the mapping file corresponding to every distributed native version if
native crash traces need retracing. Build output below `android/app/build` is
local/CI output and is not source-controlled.

## Runtime release checklist

Before distributing a signed native release, test the optimized Release build
on a device:

- app launch, splash, login, logout, and settings;
- back-button handling;
- camera and gallery selection;
- filesystem-backed OTA download and activation;
- push notification registration, foreground/background/terminated delivery,
  sound, vibration, and deep links;
- speech recognition;
- account reset, clean reinstall, and disabled Android backup restoration.

This device test complements the R8 compilation and mapping assertions; it
cannot be replaced by Debug testing because Debug is intentionally not
minified.
