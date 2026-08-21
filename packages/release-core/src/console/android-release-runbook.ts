export interface AndroidReleaseRunbookBranch {
  id: string;
  label: string;
  command: string;
  commandId: string;
  parameters?: Record<string, unknown>;
  dangerous?: boolean;
  /** Display-only variant; operator supplies values through the confirmation dialog. */
  patternOnly?: boolean;
}

export interface AndroidReleaseRunbookSection {
  id: string;
  label: string;
  branches: readonly AndroidReleaseRunbookBranch[];
}

export interface AndroidReleaseRunbookPhase {
  id: string;
  label: string;
  sections: readonly AndroidReleaseRunbookSection[];
}

function branch(
  id: string,
  label: string,
  command: string,
  commandId: string,
  options: {
    parameters?: Record<string, unknown>;
    dangerous?: boolean;
    patternOnly?: boolean;
  } = {},
): AndroidReleaseRunbookBranch {
  return {
    id,
    label,
    command,
    commandId,
    parameters: options.parameters,
    dangerous: options.dangerous,
    patternOnly: options.patternOnly,
  };
}

export const ANDROID_RELEASE_RUNBOOKS = {
  "release-android": [
    {
      id: "preflight",
      label: "preflight before any native write",
      sections: [
        {
          id: "signing-environment",
          label: "JAVA_HOME, Android SDK, keystore, Play credentials",
          branches: [
            branch(
              "release-preflight-doctor",
              "Fastlane doctor — JDK, SDK, signing, Play service account",
              "npm run fastlane:android:doctor",
              "fastlane-android-doctor",
            ),
            branch(
              "release-preflight-open-outputs",
              "open android/app/build/outputs in the file manager",
              "npm run android:open:outputs",
              "android-open-outputs",
            ),
          ],
        },
        {
          id: "native-policies",
          label: "committed Android backup and R8 policy gates",
          branches: [
            branch(
              "release-preflight-backup",
              "validate android:allowBackup and data-extraction rules",
              "npm run android:backup:validate",
              "android-backup-validate",
            ),
            branch(
              "release-preflight-r8-policy",
              "validate release buildType keeps R8, shrinkResources, signing",
              "npm run android:r8:validate",
              "android-r8-validate",
            ),
            branch(
              "release-preflight-push-assets",
              "sync Android push notification assets into native-core",
              "npm run android:push:sync-assets",
              "cap-sync",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "cross-platform-gates",
          label: "iOS push policy gates that also guard Android export paths",
          branches: [
            branch(
              "release-preflight-ios-push",
              "iOS push-policy source paths (also gates build:static and cap:sync)",
              "npm run ios:push:validate",
              "cap-verify-defaults",
              { patternOnly: true },
            ),
            branch(
              "release-preflight-version-validate",
              "validate app version metadata before any release write",
              "npm run version:validate",
              "run-test-suite",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "capacitor-audit",
          label: "Capacitor defaults and native-core policy after a static build",
          branches: [
            branch(
              "release-preflight-cap-defaults",
              "audit Capacitor defaults and native push/R8 policies",
              "npm run cap:verify-defaults",
              "cap-verify-defaults",
            ),
          ],
        },
      ],
    },
    {
      id: "version-planning",
      label: "shell version selection and full orchestration",
      sections: [
        {
          id: "shell-version",
          label: "release:android versionName / versionCode choice",
          branches: [
            branch(
              "release-android-current",
              "rebuild at current Production versionName",
              "npm run release:android -- --native-version=current",
              "release-android",
              { parameters: { nativeVersionAction: "keep-current" } },
            ),
            branch(
              "release-android-next-patch",
              "increment versionName/versionCode to next patch",
              "npm run release:android -- --native-version=next-patch",
              "release-android",
              { parameters: { nativeVersionAction: "increment-patch" } },
            ),
          ],
        },
        {
          id: "orchestrator-dry-run",
          label: "release:android dry-run — plan only, no signed artifacts",
          branches: [
            branch(
              "release-orchestrator-dry-current",
              "dry-run at current Production versionName",
              "npm run release:android -- --dry-run --native-version=current",
              "release-android",
              { parameters: { nativeVersionAction: "keep-current" }, patternOnly: true },
            ),
            branch(
              "release-orchestrator-dry-next-patch",
              "dry-run with next patch versionName/versionCode",
              "npm run release:android -- --dry-run --native-version=next-patch",
              "release-android",
              { parameters: { nativeVersionAction: "increment-patch" }, patternOnly: true },
            ),
          ],
        },
        {
          id: "orchestrator-stages",
          label: "what release:android runs internally (reference only)",
          branches: [
            branch(
              "release-stage-cap-build",
              "cap-build --no-ota — web export, version stamp, cap sync",
              "npx tsx scripts/cap-build.ts --no-ota --native-version=<current|next-patch>",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-stage-signed-gradle",
              "build-android-signed — bundleRelease + assembleRelease + signature verify",
              "npm run android:build:signed",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-stage-web-bundle-flag",
              "ASOL_WEB_BUNDLE_READY=1 proof passed to build-android-signed",
              "ASOL_WEB_BUNDLE_READY=1",
              "release-android",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "store-web-sync",
      label: "store-release web bundle and Capacitor sync without signing",
      sections: [
        {
          id: "cap-build-no-ota",
          label: "cap:build on the no-OTA store path",
          branches: [
            branch(
              "release-cap-build-no-ota",
              "fresh static export, open content line, cap sync — no Gradle signing",
              "npm run cap:build -- --no-ota",
              "cap-build",
              { parameters: { otaSource: "no-ota" }, dangerous: true },
            ),
            branch(
              "release-cap-build-no-ota-current",
              "cap-build --no-ota at current Production versionName",
              "npm run cap:build -- --no-ota --native-version=current",
              "cap-build",
              { parameters: { otaSource: "no-ota" }, patternOnly: true, dangerous: true },
            ),
            branch(
              "release-cap-build-no-ota-next",
              "cap-build --no-ota with next patch versionName/versionCode",
              "npm run cap:build -- --no-ota --native-version=next-patch",
              "cap-build",
              { parameters: { otaSource: "no-ota" }, patternOnly: true, dangerous: true },
            ),
            branch(
              "release-cap-build-dry-run",
              "print the planned native version, OTA action, and Gradle tasks only",
              "npm run cap:build -- --dry-run",
              "cap-build",
              { parameters: { dryRun: true } },
            ),
          ],
        },
        {
          id: "cap-build-no-ota-stages",
          label: "store-release substeps inside cap-build --no-ota (reference only)",
          branches: [
            branch(
              "release-store-build-static",
              "build:static — full static export into out/",
              "npm run build:static",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "release-store-cap-sync",
              "cap:sync — assert out/, policies, npx cap sync",
              "npm run cap:sync",
              "cap-sync",
              { patternOnly: true },
            ),
            branch(
              "release-store-version-stamp",
              "syncAndroidProjectVersions — versionName/versionCode + content line",
              "syncAndroidProjectVersions(contentVersion, androidVersion)",
              "cap-build",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "partial-cap-prepare",
          label: "cap:prepare:android without the release orchestrator",
          branches: [
            branch(
              "release-cap-prepare-android",
              "build:static then cap:sync — web sync only, no Gradle signing",
              "npm run cap:prepare:android",
              "cap-prepare-android",
              { dangerous: true },
            ),
          ],
        },
      ],
    },
    {
      id: "signed-artifacts",
      label: "Gradle release build, signing verification, and Fastlane alternatives",
      sections: [
        {
          id: "signed-gradle-build",
          label: "android:build:signed — R8 release AAB + APK",
          branches: [
            branch(
              "release-signed-build",
              "bundleRelease + assembleRelease with release keystore",
              "npm run android:build:signed",
              "release-android",
              { patternOnly: true, dangerous: true },
            ),
            branch(
              "release-gradle-bundle-release",
              "assemble the Play upload bundle",
              "./gradlew :app:bundleRelease",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-gradle-assemble-release",
              "assemble the sideloadable release APK",
              "./gradlew :app:assembleRelease",
              "release-android",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "signature-verification",
          label: "post-Gradle signature checks inside build-android-signed (reference only)",
          branches: [
            branch(
              "release-sign-jarsigner",
              "jarsigner -verify on app-release.aab",
              "jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-sign-apksigner",
              "apksigner verify --verbose --print-certs on app-release.apk",
              "apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk",
              "release-android",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "release-artifacts",
          label: "expected signed outputs (reference only)",
          branches: [
            branch(
              "release-artifact-aab",
              "android/app/build/outputs/bundle/release/app-release.aab",
              "android/app/build/outputs/bundle/release/app-release.aab",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-artifact-apk",
              "android/app/build/outputs/apk/release/app-release.apk",
              "android/app/build/outputs/apk/release/app-release.apk",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-artifact-mapping",
              "android/app/build/outputs/mapping/release/*.txt",
              "android/app/build/outputs/mapping/release/",
              "android-r8-verify-release",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "fastlane-build-lanes",
          label: "Fastlane Gradle wrappers when Ruby is available",
          branches: [
            branch(
              "release-fastlane-build",
              "fastlane android build — signed R8 AAB via Fastlane",
              "npm run fastlane:android:build",
              "fastlane-android-build",
              { dangerous: true },
            ),
            branch(
              "release-fastlane-aab-signed",
              "fastlane android aab_signed",
              "npm run fastlane:android:aab:signed",
              "fastlane-android-aab-signed",
              { dangerous: true },
            ),
            branch(
              "release-fastlane-aab-unsigned",
              "fastlane android aab_unsigned — no keystore required",
              "npm run fastlane:android:aab:unsigned",
              "fastlane-android-aab-unsigned",
              { dangerous: true },
            ),
            branch(
              "release-fastlane-apk-signed",
              "fastlane android apk_signed",
              "npm run fastlane:android:apk:signed",
              "fastlane-android-apk-signed",
              { dangerous: true },
            ),
            branch(
              "release-fastlane-apk-unsigned",
              "fastlane android apk_unsigned",
              "npm run fastlane:android:apk:unsigned",
              "fastlane-android-apk-unsigned",
              { dangerous: true },
            ),
          ],
        },
        {
          id: "fastlane-nor8-lanes",
          label: "Fastlane releaseNoR8 diagnostic lanes (never ship to Play)",
          branches: [
            branch(
              "release-fastlane-aab-signed-nor8",
              "fastlane android aab_signed_no_r8",
              "npm run fastlane:android:aab:signed:no-r8",
              "fastlane-android-aab-signed-no-r8",
              { dangerous: true },
            ),
            branch(
              "release-fastlane-aab-unsigned-nor8",
              "fastlane android aab_unsigned_no_r8",
              "npm run fastlane:android:aab:unsigned:no-r8",
              "fastlane-android-aab-unsigned-no-r8",
              { dangerous: true },
            ),
            branch(
              "release-fastlane-apk-signed-nor8",
              "fastlane android apk_signed_no_r8",
              "npm run fastlane:android:apk:signed:no-r8",
              "fastlane-android-apk-signed-no-r8",
              { dangerous: true },
            ),
            branch(
              "release-fastlane-apk-unsigned-nor8",
              "fastlane android apk_unsigned_no_r8",
              "npm run fastlane:android:apk:unsigned:no-r8",
              "fastlane-android-apk-unsigned-no-r8",
              { dangerous: true },
            ),
          ],
        },
      ],
    },
    {
      id: "play-publish",
      label: "Google Play upload lanes (live)",
      sections: [
        {
          id: "fastlane-tracks",
          label: "Fastlane Play upload after a signed AAB exists",
          branches: [
            branch(
              "release-fastlane-internal",
              "upload to internal track with optional rollout and release notes",
              "npm run fastlane:android:internal",
              "fastlane-android-internal",
              { dangerous: true },
            ),
            branch(
              "release-fastlane-production",
              "upload to production track with rollout and release notes",
              "npm run fastlane:android:production",
              "fastlane-android-production",
              { dangerous: true },
            ),
          ],
        },
      ],
    },
    {
      id: "post-build-verification",
      label: "R8 mapping and release artifact checks",
      sections: [
        {
          id: "r8-release-verify",
          label: "mapping report after a signed release build exists",
          branches: [
            branch(
              "release-r8-verify-release",
              "sync push assets, re-validate policies, verify release mapping output",
              "npm run android:r8:verify-release",
              "android-r8-verify-release",
            ),
          ],
        },
        {
          id: "artifact-inspection",
          label: "inspect outputs after a successful release build",
          branches: [
            branch(
              "release-post-open-outputs",
              "open android/app/build/outputs in the file manager",
              "npm run android:open:outputs",
              "android-open-outputs",
            ),
          ],
        },
      ],
    },
  ],
  "build-static": [
    {
      id: "preflight",
      label: "gates that run before out/ is written",
      sections: [
        {
          id: "policy-audit",
          label: "native container policies exercised during export",
          branches: [
            branch(
              "static-preflight-ios-push",
              "iOS push-policy source paths (also gates build:static)",
              "npm run ios:push:validate",
              "cap-verify-defaults",
              { patternOnly: true },
            ),
            branch(
              "static-preflight-backup",
              "Android backup policy on committed project files",
              "npm run android:backup:validate",
              "android-backup-validate",
            ),
            branch(
              "static-preflight-r8",
              "Android R8 release policy on committed Gradle sources",
              "npm run android:r8:validate",
              "android-r8-validate",
            ),
          ],
        },
        {
          id: "package-gates",
          label: "core package gates inside build:static (reference only)",
          branches: [
            branch(
              "static-gate-native-core",
              "test:native-core — native-core package gate",
              "npm run test:native-core",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "static-gate-ota-core",
              "test:ota-core — OTA contracts before export",
              "npm run test:ota-core",
              "test-ota-core",
            ),
            branch(
              "static-gate-release-core",
              "test:release-core — release-core package gate",
              "npm run test:release-core",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "static-gate-release-commands",
              "test:release-commands — catalog and runbook contracts",
              "npm run test:release-commands",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "static-gate-architecture",
              "architecture:check — module boundary gate",
              "npm run architecture:check",
              "run-test-suite",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "static-export",
      label: "Next.js static export into out/",
      sections: [
        {
          id: "build-static-variants",
          label: "build:static npm script",
          branches: [
            branch(
              "build-static-default",
              "standard static export with full repository gate list",
              "npm run build:static",
              "build-static",
            ),
            branch(
              "build-static-diagnostic",
              "static export with diagnostic bundle metadata",
              "npm run build:static -- --diagnostic",
              "build-static",
              { parameters: { diagnostic: true } },
            ),
            branch(
              "build-static-local-api",
              "static export pinned to the local preview API base URL",
              "npm run build:static:local",
              "build-static",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "export-artifacts",
          label: "expected outputs (reference only)",
          branches: [
            branch(
              "static-artifact-manifest",
              "out/asol-web-manifest.json — signed file list for OTA compatibility",
              "out/asol-web-manifest.json",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "static-artifact-tree",
              "out/** static HTML/JS/CSS copied into Capacitor later",
              "out/",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "static-artifact-index",
              "out/index.html — required for cap:verify-defaults",
              "out/index.html",
              "build-static",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "build-out-script",
          label: "build-out.ts terminal step (reference only)",
          branches: [
            branch(
              "static-stage-build-out",
              "packages/ota-core/scripts/build-out.ts — writes out/ and manifest",
              "npx tsx packages/ota-core/scripts/build-out.ts",
              "build-static",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "static-preview",
      label: "local static preview without Capacitor",
      sections: [
        {
          id: "preview-servers",
          label: "serve out/ on localhost for manual inspection",
          branches: [
            branch(
              "static-preview-serve",
              "preview:static — serve out/ on port 5500",
              "npm run preview:static",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "static-serve-out",
              "serve:out alias for the static preview server",
              "npm run serve:out",
              "build-static",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "post-export",
      label: "checks after out/ exists",
      sections: [
        {
          id: "capacitor-readiness",
          label: "Capacitor audit against the fresh bundle",
          branches: [
            branch(
              "static-post-cap-verify",
              "audit Capacitor defaults with out/index.html present",
              "npm run cap:verify-defaults",
              "cap-verify-defaults",
            ),
          ],
        },
        {
          id: "ota-contracts",
          label: "OTA publishing contracts without touching R2",
          branches: [
            branch(
              "static-post-ota-core",
              "OTA core unit and contract suite",
              "npm run test:ota-core",
              "test-ota-core",
            ),
          ],
        },
        {
          id: "release-contracts",
          label: "release console contracts without touching R2",
          branches: [
            branch(
              "static-post-release-core",
              "release-core browser-safe contract suite",
              "npm run test:release-core",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "static-post-release-commands",
              "release-commands catalog and runbook contract tests",
              "npm run test:release-commands",
              "run-test-suite",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
  ],
  "cap-prepare-android": [
    {
      id: "preflight",
      label: "policy gates before Capacitor mutates native projects",
      sections: [
        {
          id: "native-policies",
          label: "Android backup/R8 and iOS push policies",
          branches: [
            branch(
              "prepare-preflight-backup",
              "validate Android backup rules",
              "npm run android:backup:validate",
              "android-backup-validate",
            ),
            branch(
              "prepare-preflight-r8",
              "validate Android R8 release policy",
              "npm run android:r8:validate",
              "android-r8-validate",
            ),
            branch(
              "prepare-preflight-ios-push",
              "validate iOS push policy sources (also gates cap:sync)",
              "npm run ios:push:validate",
              "cap-verify-defaults",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "version-metadata",
          label: "version metadata checks before sync",
          branches: [
            branch(
              "prepare-preflight-version-validate",
              "validate app version metadata",
              "npm run version:validate",
              "run-test-suite",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "web-export",
      label: "static web bundle creation",
      sections: [
        {
          id: "static-build",
          label: "build:static step inside cap:prepare:android",
          branches: [
            branch(
              "prepare-build-static",
              "full static export before any Capacitor sync",
              "npm run build:static",
              "build-static",
            ),
            branch(
              "prepare-build-static-diagnostic",
              "diagnostic static export (must not ship to a shell)",
              "npm run build:static -- --diagnostic",
              "build-static",
              { parameters: { diagnostic: true } },
            ),
            branch(
              "prepare-build-static-local",
              "static export with local API base URL",
              "npm run build:static:local",
              "build-static",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "capacitor-sync",
      label: "Capacitor copy/sync into android/app/src/main/assets/public",
      sections: [
        {
          id: "full-prepare",
          label: "compound prepare path",
          branches: [
            branch(
              "cap-prepare-android",
              "build:static then cap:sync — full Android preparation",
              "npm run cap:prepare:android",
              "cap-prepare-android",
            ),
          ],
        },
        {
          id: "sync-stages",
          label: "cap:sync substeps (reference) and granular sync commands",
          branches: [
            branch(
              "prepare-sync-assert-out",
              "build-out.ts --assert-only — out/ must already exist",
              "npx tsx packages/ota-core/scripts/build-out.ts --assert-only",
              "cap-sync",
              { patternOnly: true },
            ),
            branch(
              "prepare-sync-push-assets",
              "sync Android push notification assets into native-core",
              "npm run android:push:sync-assets",
              "cap-sync",
              { patternOnly: true },
            ),
            branch(
              "prepare-sync-cap",
              "assert out/, validate policies, npx cap sync, normalize iOS SPM",
              "npm run cap:sync",
              "cap-sync",
            ),
            branch(
              "prepare-sync-copy",
              "cap copy only — reuse existing out/ without cap sync",
              "npm run cap:copy",
              "cap-copy",
            ),
            branch(
              "prepare-sync-ios-spm",
              "ios:spm:normalize after cap sync",
              "npm run ios:spm:normalize",
              "cap-sync",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "cap-build-orchestration",
      label: "cap:build paths that include Android sync (reference and runnable variants)",
      sections: [
        {
          id: "cap-build-ota-variants",
          label: "cap:build OTA source combinations",
          branches: [
            branch(
              "prepare-cap-build-publish-new",
              "cap:build — publish new OTA then sync native projects",
              "npm run cap:build",
              "cap-build",
              { parameters: { otaSource: "publish-new" }, dangerous: true },
            ),
            branch(
              "prepare-cap-build-resume",
              "cap:build --resume — resume from published OTA manifest",
              "npm run cap:build:resume",
              "cap-build",
              { parameters: { otaSource: "resume-published" }, dangerous: true },
            ),
            branch(
              "prepare-cap-build-skip-ota",
              "cap:build --skip-ota — reuse local out/ and prove against R2",
              "npm run cap:build -- --skip-ota",
              "cap-build",
              { parameters: { otaSource: "skip-ota" }, dangerous: true },
            ),
            branch(
              "prepare-cap-build-dry-run",
              "cap:build --dry-run — print plan only",
              "npm run cap:build -- --dry-run",
              "cap-build",
              { parameters: { dryRun: true } },
            ),
          ],
        },
        {
          id: "cap-build-local",
          label: "local Capacitor asset build without version bumps",
          branches: [
            branch(
              "prepare-cap-build-local",
              "cap:build:local — existing version, no R2 publish",
              "npm run cap:build:local",
              "cap-build",
              { patternOnly: true },
            ),
            branch(
              "prepare-cap-run-clean-android",
              "cap:run:clean:android — local build, wipe app data, cap run",
              "npm run cap:run:clean:android",
              "cap-build",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "ide-and-audit",
      label: "Android Studio and post-sync verification",
      sections: [
        {
          id: "android-studio",
          label: "open the native project locally",
          branches: [
            branch(
              "cap-open-android",
              "open android/ in Android Studio",
              "npm run cap:open:android",
              "cap-open-android",
            ),
          ],
        },
        {
          id: "post-sync-audit",
          label: "Capacitor defaults after assets are synced",
          branches: [
            branch(
              "prepare-post-cap-verify",
              "audit Capacitor defaults against synced web assets",
              "npm run cap:verify-defaults",
              "cap-verify-defaults",
            ),
          ],
        },
        {
          id: "outputs-folder",
          label: "inspect Gradle outputs when present",
          branches: [
            branch(
              "prepare-open-outputs",
              "open android/app/build/outputs in the file manager",
              "npm run android:open:outputs",
              "android-open-outputs",
            ),
          ],
        },
      ],
    },
  ],
  "android-build-debug": [
    {
      id: "preflight",
      label: "environment and native policy before debugR8 assembly",
      sections: [
        {
          id: "toolchain",
          label: "JDK and Android SDK discovery",
          branches: [
            branch(
              "debug-preflight-doctor",
              "Fastlane doctor — JAVA_HOME and Android SDK paths",
              "npm run fastlane:android:doctor",
              "fastlane-android-doctor",
            ),
          ],
        },
        {
          id: "native-policies",
          label: "backup/R8 policy gates shared with release paths",
          branches: [
            branch(
              "debug-preflight-backup",
              "validate Android backup policy",
              "npm run android:backup:validate",
              "android-backup-validate",
            ),
            branch(
              "debug-preflight-r8",
              "validate debugR8 and release R8 Gradle policy",
              "npm run android:r8:validate",
              "android-r8-validate",
            ),
            branch(
              "debug-preflight-ios-push",
              "validate iOS push policy sources (gates cap:prepare:android)",
              "npm run ios:push:validate",
              "cap-verify-defaults",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "package-build",
      label: "web sync and debugR8 Gradle assembly",
      sections: [
        {
          id: "full-debug-build",
          label: "compound testing package path",
          branches: [
            branch(
              "android-build-debug",
              "cap:prepare:android then assembleDebugR8 + androidTest APK",
              "npm run android:build:debug",
              "android-build-debug",
            ),
          ],
        },
        {
          id: "prepare-only",
          label: "web export and Capacitor sync without Gradle",
          branches: [
            branch(
              "debug-prepare-android",
              "fresh web build and cap sync only",
              "npm run cap:prepare:android",
              "cap-prepare-android",
            ),
          ],
        },
        {
          id: "gradle-debugR8",
          label: "Gradle tasks inside android:build:debug (reference only)",
          branches: [
            branch(
              "debug-stage-assemble-apk",
              "assembleDebugR8 — R8-minified, debug-signed, debuggable APK",
              "./gradlew :app:assembleDebugR8",
              "android-build-debug",
              { patternOnly: true },
            ),
            branch(
              "debug-stage-assemble-test",
              "assembleDebugR8AndroidTest — instrumented test package",
              "./gradlew :app:assembleDebugR8AndroidTest",
              "android-build-debug",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "debug-artifacts",
          label: "expected debugR8 outputs (reference only)",
          branches: [
            branch(
              "debug-artifact-apk",
              "android/app/build/outputs/apk/debugR8/app-debugR8.apk",
              "android/app/build/outputs/apk/debugR8/app-debugR8.apk",
              "android-build-debug",
              { patternOnly: true },
            ),
            branch(
              "debug-open-outputs",
              "open android/app/build/outputs in the file manager",
              "npm run android:open:outputs",
              "android-open-outputs",
            ),
          ],
        },
      ],
    },
    {
      id: "host-verification",
      label: "repository checks on this machine",
      sections: [
        {
          id: "full-host-suite",
          label: "verify:all orchestrated stages",
          branches: [
            branch(
              "run-test-suite",
              "typecheck, lint, architecture, native/OTA suites, release-commands",
              "npm run verify:all",
              "run-test-suite",
            ),
          ],
        },
        {
          id: "host-native-policy",
          label: "native container policy steps inside verify:all (reference only)",
          branches: [
            branch(
              "host-verify-android-backup",
              "android:backup:validate",
              "npm run android:backup:validate",
              "android-backup-validate",
            ),
            branch(
              "host-verify-android-r8",
              "android:r8:validate",
              "npm run android:r8:validate",
              "android-r8-validate",
            ),
            branch(
              "host-verify-ios-push",
              "ios:push:validate",
              "npm run ios:push:validate",
              "cap-verify-defaults",
              { patternOnly: true },
            ),
            branch(
              "host-verify-version-validate",
              "version:validate",
              "npm run version:validate",
              "run-test-suite",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "host-release-gates",
          label: "release console and native-core gates (reference and runnable)",
          branches: [
            branch(
              "host-verify-release-commands",
              "release console catalog and runbook contract tests",
              "npm run test:release-commands",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "host-verify-release-core",
              "release-core package gate suite",
              "npm run test:release-core",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "host-verify-native-core",
              "native-core package gate suite",
              "npm run test:native-core",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "host-check-release-commands",
              "test:release-commands — standalone runnable check",
              "npm run test:release-commands",
              "run-test-suite",
            ),
            branch(
              "host-check-release-core",
              "test:release-core — standalone runnable check",
              "npm run test:release-core",
              "run-test-suite",
            ),
            branch(
              "host-check-native-core",
              "test:native-core — standalone runnable check",
              "npm run test:native-core",
              "run-test-suite",
            ),
          ],
        },
        {
          id: "host-static-analysis",
          label: "verify:all static analysis substeps (reference only)",
          branches: [
            branch(
              "host-verify-typecheck",
              "TypeScript type check",
              "npm run typecheck",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "host-verify-lint",
              "ESLint",
              "npm run lint",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "host-verify-architecture",
              "architecture:check",
              "npm run architecture:check",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "host-verify-ci-coverage",
              "ci:coverage — native-core workflow gate parity",
              "npm run ci:coverage",
              "run-test-suite",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "targeted-host-checks",
          label: "individual catalog verification commands",
          branches: [
            branch(
              "host-check-ota-core",
              "OTA core contracts",
              "npm run test:ota-core",
              "test-ota-core",
            ),
            branch(
              "host-check-ota-self-test",
              "OTA self-test against R2 (needs credentials)",
              "npm run ota:self-test",
              "ota-self-test",
            ),
            branch(
              "host-check-cap-defaults",
              "Capacitor defaults audit (needs out/ or synced assets)",
              "npm run cap:verify-defaults",
              "cap-verify-defaults",
            ),
            branch(
              "host-check-r8-verify-release",
              "verify release R8 mapping after a signed build",
              "npm run android:r8:verify-release",
              "android-r8-verify-release",
            ),
            branch(
              "host-check-google-play-assets",
              "google-play-store-assets-core image validation gate",
              "npm run test:google-play-store-assets-core",
              "run-test-suite",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "device-verification",
      label: "connected-device instrumentation",
      sections: [
        {
          id: "connected-tests",
          label: "android:device:tests Gradle connectedDebugR8AndroidTest",
          branches: [
            branch(
              "run-device-tests",
              "instrumentation on one auto-selected device",
              "npm run android:device:tests",
              "run-device-tests",
            ),
            branch(
              "run-device-tests-serial",
              "instrumentation on a specific device serial",
              "npm run android:device:tests -- --device=<serial>",
              "run-device-tests",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "device-test-stages",
          label: "what android:device:tests runs internally (reference only)",
          branches: [
            branch(
              "device-stage-permissions",
              "grant POST_NOTIFICATIONS before notification channel tests",
              "adb shell pm grant … POST_NOTIFICATIONS",
              "run-device-tests",
              { patternOnly: true },
            ),
            branch(
              "device-stage-connected-test",
              "connectedDebugR8AndroidTest — refuses zero tests as success",
              "./gradlew :app:connectedDebugR8AndroidTest",
              "run-device-tests",
              { patternOnly: true },
            ),
            branch(
              "device-stage-results",
              "androidTest-results/connected XML roster",
              "android/app/build/outputs/androidTest-results/connected/",
              "run-device-tests",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
  ],
  "ota-publish": [
    {
      id: "preflight",
      label: "R2 readiness before any live publish",
      sections: [
        {
          id: "r2-config",
          label: "bucket, signing key, and manifest visibility",
          branches: [
            branch(
              "ota-preflight-status",
              "read current manifest and adoption from R2",
              "npm run ota:status",
              "ota-status",
            ),
            branch(
              "ota-preflight-check",
              "dry-run compatibility gate — no upload",
              "npm run ota:check",
              "ota-check",
            ),
          ],
        },
        {
          id: "r2-cors",
          label: "CORS policy on the OTA bucket",
          branches: [
            branch(
              "ota-preflight-sync-cors",
              "sync declared CORS rules to the OTA R2 bucket",
              "npm run ota:sync:cors",
              "ota-sync-cors",
            ),
          ],
        },
        {
          id: "static-input",
          label: "local bundle the publisher reads",
          branches: [
            branch(
              "ota-preflight-static-build",
              "build:static must exist before ota:publish runs",
              "npm run build:static",
              "build-static",
            ),
            branch(
              "ota-preflight-static-build-local",
              "build:static:local — static export with local API URL",
              "npm run build:static:local",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "ota-preflight-static-diagnostic",
              "build:static --diagnostic — must never be published",
              "npm run build:static -- --diagnostic",
              "build-static",
              { parameters: { diagnostic: true }, patternOnly: true },
            ),
          ],
        },
        {
          id: "native-policy-gates",
          label: "Android/iOS policy gates before OTA publish (reference only)",
          branches: [
            branch(
              "ota-preflight-android-backup",
              "android:backup:validate inside cap-build publish path",
              "npm run android:backup:validate",
              "android-backup-validate",
              { patternOnly: true },
            ),
            branch(
              "ota-preflight-android-r8",
              "android:r8:validate inside cap-build publish path",
              "npm run android:r8:validate",
              "android-r8-validate",
              { patternOnly: true },
            ),
            branch(
              "ota-preflight-ios-push",
              "ios:push:validate inside build:static and cap:sync",
              "npm run ios:push:validate",
              "cap-verify-defaults",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "publish",
      label: "live OTA publish to R2",
      sections: [
        {
          id: "publish-variants",
          label: "ota:publish flag combinations",
          branches: [
            branch(
              "ota-publish-default",
              "publish a new OTA from the current out/ bundle",
              "npm run ota:publish",
              "ota-publish",
              { dangerous: true },
            ),
            branch(
              "ota-publish-mandatory",
              "publish and mark the update mandatory",
              "npm run ota:publish -- --mandatory",
              "ota-publish",
              { parameters: { mandatory: true }, dangerous: true },
            ),
            branch(
              "ota-publish-min-native",
              "publish with a minimum native shell version gate",
              "npm run ota:publish -- --minimum-native-version=<version>",
              "ota-publish",
              { patternOnly: true, dangerous: true },
            ),
            branch(
              "ota-publish-notes",
              "publish with operator notes attached",
              "npm run ota:publish -- --notes=<text>",
              "ota-publish",
              { patternOnly: true, dangerous: true },
            ),
          ],
        },
        {
          id: "publish-stages",
          label: "what ota:publish runs internally (reference only)",
          branches: [
            branch(
              "ota-stage-build-out",
              "build-out.ts — static export or assert existing out/",
              "npx tsx packages/ota-core/scripts/build-out.ts",
              "ota-publish",
              { patternOnly: true },
            ),
            branch(
              "ota-stage-upload",
              "upload manifest + files to R2 with signing",
              "packages/ota-core/scripts/ota-publish.ts",
              "ota-publish",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "revoke",
          label: "OTA revocation (manual operator path)",
          branches: [
            branch(
              "ota-revoke",
              "revoke OTA adoption on R2 — separate from publish",
              "npm run ota:revoke",
              "ota-publish",
              { patternOnly: true, dangerous: true },
            ),
          ],
        },
      ],
    },
    {
      id: "post-publish-native",
      label: "native Android sync after a successful OTA publish",
      sections: [
        {
          id: "cap-build-resume",
          label: "resume cap-build from the published manifest",
          branches: [
            branch(
              "ota-post-cap-build-resume",
              "cap:build:resume — sync native projects from published OTA",
              "npm run cap:build:resume",
              "cap-build",
              { parameters: { otaSource: "resume-published" }, dangerous: true },
            ),
            branch(
              "ota-post-cap-sync",
              "cap:sync after manifest verification (reference only)",
              "npm run cap:sync",
              "cap-sync",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "post-publish",
      label: "verification after a live publish",
      sections: [
        {
          id: "self-test",
          label: "end-to-end OTA delivery check on R2",
          branches: [
            branch(
              "ota-post-self-test",
              "OTA self-test — writes and deletes a probe object on R2",
              "npm run ota:self-test",
              "ota-self-test",
            ),
            branch(
              "ota-post-status-recheck",
              "re-read manifest and adoption after publish",
              "npm run ota:status",
              "ota-status",
            ),
          ],
        },
        {
          id: "contracts",
          label: "offline OTA contracts without R2 writes",
          branches: [
            branch(
              "ota-post-ota-core",
              "OTA core unit and contract suite",
              "npm run test:ota-core",
              "test-ota-core",
            ),
            branch(
              "ota-post-release-commands",
              "release-commands catalog and runbook contract tests",
              "npm run test:release-commands",
              "run-test-suite",
            ),
          ],
        },
      ],
    },
  ],
} as const satisfies Record<string, readonly AndroidReleaseRunbookPhase[]>;

export type AndroidReleasePathId = keyof typeof ANDROID_RELEASE_RUNBOOKS;

export function androidReleaseRunbookFor(pathId: string): readonly AndroidReleaseRunbookPhase[] {
  return ANDROID_RELEASE_RUNBOOKS[pathId as AndroidReleasePathId] ?? [];
}

export function branchIdsFromAndroidRunbook(
  runbook: readonly AndroidReleaseRunbookPhase[],
): string[] {
  return runbook.flatMap((phase) =>
    phase.sections.flatMap((section) => section.branches.map((item) => item.id)),
  );
}

export function dangerousAndroidBranchIds(
  runbook: readonly AndroidReleaseRunbookPhase[],
): string[] {
  return runbook.flatMap((phase) =>
    phase.sections.flatMap((section) =>
      section.branches.filter((item) => item.dangerous).map((item) => item.id),
    ),
  );
}

export function allAndroidReleaseBranchIds(): string[] {
  return Object.values(ANDROID_RELEASE_RUNBOOKS).flatMap((runbook) =>
    branchIdsFromAndroidRunbook(runbook),
  );
}

export function findAndroidReleaseBranch(
  branchId: string,
): AndroidReleaseRunbookBranch | undefined {
  for (const runbook of Object.values(ANDROID_RELEASE_RUNBOOKS)) {
    for (const phase of runbook) {
      for (const section of phase.sections) {
        const match = section.branches.find((item) => item.id === branchId);
        if (match) return match;
      }
    }
  }
  return undefined;
}
