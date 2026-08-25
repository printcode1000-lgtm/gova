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

function patternSubsteps(
  prefix: string,
  commandId: string,
  steps: readonly (readonly [string, string, string])[],
): AndroidReleaseRunbookBranch[] {
  return steps.map(([suffix, label, command]) =>
    branch(`${prefix}-${suffix}`, label, command, commandId, { patternOnly: true }),
  );
}

const VERIFY_ALL_SUBSTEPS = [
  ["typecheck", "فحص أنواع TypeScript", "npm run typecheck"],
  ["lint", "فحص ESLint", "npm run lint"],
  ["architecture", "فحص حدود الوحدات", "npm run architecture:check"],
  ["storage-profiles", "التحقق من storage profiles", "npm run validate-storage-profiles"],
  ["error-logging", "عقد تسجيل الأخطاء", "npm run validate:error-logging"],
  ["version-validate", "التحقق من app-versions", "npm run version:validate"],
  ["ci-coverage", "عقد GitHub: لا CI عام، وثائق docs/** فقط", "npm run github:ci-policy"],
  ["android-backup", "سياسة Android backup", "npm run android:backup:validate"],
  ["android-r8", "سياسة R8", "npm run android:r8:validate"],
  ["ios-push", "سياسة iOS push", "npm run ios:push:validate"],
  ["test-categories", "اختبارات الفئات", "npm run test:categories"],
  ["test-installation", "سياسة bootstrap التثبيت", "npm run test:installation-bootstrap"],
  ["test-runtime", "سياق التشغيل", "npm run test:runtime-context"],
  ["test-r2", "طوبولوجيا R2", "npm run test:r2-storage"],
  ["test-release-commands", "عقد release-commands", "npm run test:release-commands"],
  ["test-deployment-tools", "أدوات النشر", "npm run test:deployment-tools"],
  ["test-shipping", "تسعير الشحن", "npm run test:shipping-pricing"],
  ["test-delivery", "مخطط التسليم", "npm run test:delivery-planner"],
  ["test-discounts", "خصومات البائع", "npm run test:seller-discounts"],
  ["test-marketplace-orders", "طلبات السوق", "npm run test:marketplace-orders"],
  ["test-notifications", "الإشعارات", "npm run test:notifications"],
  ["test-follow", "المتابعة", "npm run test:follow"],
  ["test-favorites", "المفضلة", "npm run test:favorites"],
  ["test-password-recovery", "استرداد كلمة المرور", "npm run test:password-recovery"],
  ["test-image-upload", "طابور رفع الصور", "npm run test:image-upload-queue"],
  ["test-feature-flags", "أعلام الميزات", "npm run test:feature-flags"],
  ["test-composition-ports", "منافذ التركيب", "npm run test:composition-ports"],
  ["test-i18n-routes", "مسارات عربية فقط", "npm run test:i18n-arabic-only-routes"],
  ["test-native-core", "بوابة native-core", "npm run test:native-core"],
  ["test-ota-compat", "توافق OTA", "npm run test:ota-compatibility"],
  ["test-ota-delivery", "تسليم OTA", "npm run test:ota-delivery"],
  ["test-ota-background", "OTA في الخلفية", "npm run test:ota-background"],
  ["test-ota-hardening", "تصلّب OTA", "npm run test:ota-hardening"],
  ["test-data-health", "صحة البيانات", "npm run test:data-health"],
  ["test-dev-cloud-backup", "نسخ dev-cloud", "npm run test:dev-cloud-backup"],
  ["test-data-core", "بوابة data-core", "npm run test:data-core"],
  ["test-orders-core", "بوابة orders-core", "npm run test:orders-core"],
  ["test-compositions", "تركيبات الخدمات", "npm run test:compositions"],
  ["test-system-logs-core", "بوابة system-logs-core", "npm run test:system-logs-core"],
  ["test-release-core", "بوابة release-core", "npm run test:release-core"],
  ["services-verify", "تحقق مرايا الخدمات", "npm run services:verify"],
  ["cap-verify-defaults", "تدقيق Capacitor", "npm run cap:verify-defaults"],
] as const satisfies readonly (readonly [string, string, string])[];

const BUILD_STATIC_SUBSTEPS = [
  ["branding", "توليد أصول العلامة التجارية", "npm run branding:generate"],
  ["maplibre", "مزامنة MapLibre worker", "npm run maplibre:sync"],
  ["catalog-validate", "التحقق من الكتالوج (يشمل test:catalog-display)", "npm run catalog:validate"],
  ["catalog-studio", "اختبار catalog-studio", "npm run test:catalog-studio"],
  ["architecture", "فحص حدود الوحدات", "npm run architecture:check"],
  ["services-sync", "مزامنة مصادر الخدمات", "npm run services:sync"],
  ["test-notifications", "اختبارات الإشعارات", "npm run test:notifications"],
  ["test-native-core", "بوابة @asol/native-core", "npm run test:native-core"],
  ["test-ota-core", "بوابة @asol/ota-core", "npm run test:ota-core"],
  ["test-orders-core", "بوابة @asol/orders-core", "npm run test:orders-core"],
  ["test-data-core", "بوابة @asol/data-core", "npm run test:data-core"],
  ["test-backup-core", "بوابة @asol/backup-core", "npm run test:backup-core"],
  ["test-data-health-core", "بوابة @asol/data-health-core", "npm run test:data-health-core"],
  ["test-storage-core", "بوابة @asol/storage-core", "npm run test:storage-core"],
  ["test-storage-image-manager", "بوابة storage-image-manager-core", "npm run test:storage-image-manager-core"],
  ["test-auth-core", "بوابة @asol/auth-core", "npm run test:auth-core"],
  ["test-account-deletion", "سجل حذف الحساب", "npm run test:account-deletion-registry"],
  ["test-catalog-core", "بوابة @asol/catalog-core", "npm run test:catalog-core"],
  ["test-format-core", "بوابة @asol/format-core", "npm run test:format-core"],
  ["test-gp-assets-core", "بوابة google-play-store-assets-core", "npm run test:google-play-store-assets-core"],
  ["test-signed-token-core", "بوابة @asol/signed-token-core", "npm run test:signed-token-core"],
  ["test-service-runtime-core", "بوابة @asol/service-runtime-core", "npm run test:service-runtime-core"],
  ["test-architecture-core", "بوابة @asol/architecture-core", "npm run test:architecture-core"],
  ["test-observability-core", "بوابة @asol/observability-core", "npm run test:observability-core"],
  ["test-env-core", "بوابة @asol/env-core", "npm run test:env-core"],
  ["test-release-core", "بوابة @asol/release-core", "npm run test:release-core"],
  ["test-secrets-core", "بوابة @asol/secrets-core", "npm run test:secrets-core"],
  ["test-map-core", "بوابة @asol/map-core", "npm run test:map-core"],
  ["test-product-style-core", "بوابة @asol/product-style-core", "npm run test:product-style-core"],
  ["test-product-core", "بوابة @asol/product-core", "npm run test:product-core"],
  ["test-dev-core", "بوابة @asol/dev-core", "npm run test:dev-core"],
  ["test-system-logs-core", "بوابة @asol/system-logs-core", "npm run test:system-logs-core"],
  ["test-hero-slider-core", "بوابة @asol/hero-slider-core", "npm run test:hero-slider-core"],
  ["test-featured-marquee-core", "بوابة @asol/featured-marquee-core", "npm run test:featured-marquee-core"],
  ["test-trending-ribbon-core", "بوابة @asol/trending-ribbon-core", "npm run test:trending-ribbon-core"],
  ["test-page-snapshot-core", "بوابة @asol/page-snapshot-core", "npm run test:page-snapshot-core"],
  ["ios-push-validate", "التحقق من سياسة iOS push", "npm run ios:push:validate"],
  ["test-notifications-core", "بوابة @asol/notifications-core", "npm run test:notifications-core"],
  ["test-account-declarations", "بوابة @asol/account-declarations", "npm run test:account-declarations"],
  ["test-vercel-deploy-core", "بوابة @asol/vercel-deploy-core", "npm run test:vercel-deploy-core"],
  ["test-service-mirror-core", "بوابة @asol/service-mirror-core", "npm run test:service-mirror-core"],
  ["test-account-bridge", "بوابة @asol/account-bridge", "npm run test:account-bridge"],
  ["test-compositions", "تركيبات الخدمات الست", "npm run test:compositions"],
  ["build-out", "تصدير out/ عبر build-out.ts", "npx tsx packages/ota-core/scripts/build-out.ts"],
] as const satisfies readonly (readonly [string, string, string])[];

const CAP_SYNC_PIPELINE_SUBSTEPS = [
  ["assert-out", "build-out.ts --assert-only — out/ موجود", "npx tsx packages/ota-core/scripts/build-out.ts --assert-only"],
  ["push-assets", "مزامنة أصول push إلى native-core", "npm run android:push:sync-assets"],
  ["backup-pre", "android:backup:validate قبل cap sync", "npm run android:backup:validate"],
  ["r8-pre", "android:r8:validate قبل cap sync", "npm run android:r8:validate"],
  ["ios-push-pre", "ios:push:validate قبل cap sync", "npm run ios:push:validate"],
  ["npx-cap-sync", "npx cap sync — نسخ out/ إلى المشاريع الأصلية", "npx cap sync"],
  ["ios-spm", "تطبيع مسارات iOS SPM", "npm run ios:spm:normalize"],
  ["backup-post", "android:backup:validate بعد cap sync", "npm run android:backup:validate"],
  ["r8-post", "android:r8:validate بعد cap sync", "npm run android:r8:validate"],
  ["ios-push-post", "ios:push:validate بعد cap sync", "npm run ios:push:validate"],
] as const satisfies readonly (readonly [string, string, string])[];

const CAP_COPY_PIPELINE_SUBSTEPS = [
  ["assert-out", "build-out.ts --assert-only — out/ موجود", "npx tsx packages/ota-core/scripts/build-out.ts --assert-only"],
  ["push-assets", "مزامنة أصول push إلى native-core", "npm run android:push:sync-assets"],
  ["backup-pre", "android:backup:validate قبل cap copy", "npm run android:backup:validate"],
  ["r8-pre", "android:r8:validate قبل cap copy", "npm run android:r8:validate"],
  ["ios-push-pre", "ios:push:validate قبل cap copy", "npm run ios:push:validate"],
  ["npx-cap-copy", "npx cap copy — نسخ assets دون sync كامل", "npx cap copy"],
  ["backup-post", "android:backup:validate بعد cap copy", "npm run android:backup:validate"],
  ["r8-post", "android:r8:validate بعد cap copy", "npm run android:r8:validate"],
  ["ios-push-post", "ios:push:validate بعد cap copy", "npm run ios:push:validate"],
] as const satisfies readonly (readonly [string, string, string])[];

const DEBUG_BUILD_SCRIPT_STAGES = [
  ["preflight", "android-build-preflight — JDK 21 وAndroid SDK 36", "npm run android:preflight"],
  ["cap-prepare", "build:static ثم cap:sync", "npm run cap:prepare:android"],
  ["assemble-apk", "assembleDebugR8 — APK محسّن بـ R8", "./gradlew :app:assembleDebugR8"],
  ["assemble-test", "assembleDebugR8AndroidTest", "./gradlew :app:assembleDebugR8AndroidTest"],
  ["verify-apk", "التحقق من app-debugR8.apk", "android/app/build/outputs/apk/debugR8/app-debugR8.apk"],
] as const satisfies readonly (readonly [string, string, string])[];

const DEVICE_TEST_SCRIPT_STAGES = [
  ["detect-device", "اكتشاف جهاز adb — serial أو اختيار تلقائي", "adb devices"],
  ["grant-permissions", "منح POST_NOTIFICATIONS قبل اختبارات الإشعارات", "adb shell pm grant … POST_NOTIFICATIONS"],
  ["set-serial", "ANDROID_SERIAL لـ Gradle عند جهاز واحد", "ANDROID_SERIAL=<serial>"],
  ["connected-test", "connectedDebugR8AndroidTest", "./gradlew :app:connectedDebugR8AndroidTest"],
  ["zero-tests-refusal", "رفض صفر اختبارات كنجاح", "throw if total === 0"],
  ["collect-xml", "جمع androidTest-results/connected/*.xml", "android/app/build/outputs/androidTest-results/connected/"],
] as const satisfies readonly (readonly [string, string, string])[];

const SIGNED_BUILD_SCRIPT_STAGES = [
  ["require-keystore", "رفض عند غياب ASOL_ANDROID_KEYSTORE_*", "requireSigningEnvironment()"],
  ["require-web-bundle", "ASOL_WEB_BUNDLE_READY=1 وملف manifest متزامن", "requireSyncedWebBundle()"],
  ["preflight", "android-build-preflight قبل Gradle", "npm run android:preflight"],
  ["bundle-release", "bundleRelease — AAB لـ Play", "./gradlew :app:bundleRelease"],
  ["assemble-release", "assembleRelease — APK sideload", "./gradlew :app:assembleRelease"],
  ["jarsigner", "jarsigner -verify على AAB", "jarsigner -verify app-release.aab"],
  ["apksigner", "apksigner verify على APK", "apksigner verify --verbose --print-certs app-release.apk"],
] as const satisfies readonly (readonly [string, string, string])[];

export const ANDROID_RELEASE_RUNBOOKS = {
  "release-android": [
    {
      id: "preflight",
      label: "preflight before any native write",
      sections: [
        {
          id: "signing-environment",
          label: "JAVA_HOME وAndroid SDK ومفاتيح التوقيع وحساب Play",
          branches: [
            branch(
              "release-preflight-android-preflight",
              "android:preflight — JDK 21 وAndroid SDK 36 وgradlew",
              "npm run android:preflight",
              "fastlane-android-doctor",
            ),
            branch(
              "release-preflight-doctor",
              "fastlane android doctor — JDK وSDK والتوقيع وحساب Play",
              "npm run fastlane:android:doctor",
              "fastlane-android-doctor",
            ),
            branch(
              "release-preflight-open-outputs",
              "فتح android/app/build/outputs في مستكشف الملفات",
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
          label: "ما يشغّله release:android داخلياً (مرجع)",
          branches: [
            branch(
              "release-stage-preflight",
              "android-build-preflight قبل cap-build",
              "npm run android:preflight",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-stage-cap-build",
              "cap-build --no-ota — export وختم إصدارات وcap sync",
              "npx tsx scripts/cap-build.ts --no-ota --native-version=<current|next-patch>",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-stage-signed-gradle",
              "build-android-signed — bundleRelease + assembleRelease + تحقق التوقيع",
              "npm run android:build:signed",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-stage-web-bundle-flag",
              "ASOL_WEB_BUNDLE_READY=1 يُمرَّر إلى build-android-signed",
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
          label: "android:build:signed — AAB وAPK release محسّنان بـ R8",
          branches: [
            branch(
              "release-signed-build",
              "bundleRelease + assembleRelease بمفتاح release",
              "npm run android:build:signed",
              "release-android",
              { patternOnly: true, dangerous: true },
            ),
            branch(
              "release-gradle-bundle-release",
              "حزمة AAB للرفع إلى Play",
              "./gradlew :app:bundleRelease",
              "release-android",
              { patternOnly: true },
            ),
            branch(
              "release-gradle-assemble-release",
              "APK release للت sideload",
              "./gradlew :app:assembleRelease",
              "release-android",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "signed-build-pipeline",
          label: "خطوات build-android-signed.ts بالتفصيل (مرجع)",
          branches: patternSubsteps(
            "release-signed-stage",
            "release-android",
            SIGNED_BUILD_SCRIPT_STAGES,
          ),
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
          id: "build-static-substeps",
          label: "كل بوابة npm داخل build:static (مرجع فقط)",
          branches: patternSubsteps("static-gate", "build-static", BUILD_STATIC_SUBSTEPS),
        },
        {
          id: "build-static-gate-pipeline",
          label: "catalogued build:static gate npm scripts (reference only)",
          branches: patternSubsteps(
            "static-gate-pipeline",
            "run-test-suite",
            BUILD_STATIC_SUBSTEPS,
          ),
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
        {
          id: "build-static-preamble",
          label: "خطوات build:static قبل build-out.ts (مرجع)",
          branches: [
            branch(
              "static-stage-branding",
              "branding:generate — أصول العلامة قبل export",
              "npm run branding:generate",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "static-stage-maplibre",
              "maplibre:sync — worker الخريطة قبل export",
              "npm run maplibre:sync",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "static-stage-catalog-validate",
              "catalog:validate — فحص الكتالوج قبل export",
              "npm run catalog:validate",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "static-stage-services-sync",
              "services:sync — مرايا الخدمات قبل export",
              "npm run services:sync",
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
      label: "بوابات قبل أن يعدّل Capacitor المشاريع الأصلية",
      sections: [
        {
          id: "toolchain",
          label: "JDK وAndroid SDK قبل أي export أو sync",
          branches: [
            branch(
              "prepare-preflight-android-preflight",
              "android:preflight — JDK 21 وAndroid SDK 36 وgradlew",
              "npm run android:preflight",
              "fastlane-android-doctor",
            ),
            branch(
              "prepare-preflight-doctor",
              "fastlane android doctor — JDK وSDK والتوقيع",
              "npm run fastlane:android:doctor",
              "fastlane-android-doctor",
            ),
          ],
        },
        {
          id: "native-policies",
          label: "سياسات Android backup/R8 وiOS push",
          branches: [
            branch(
              "prepare-preflight-backup",
              "التحقق من قواعد Android backup",
              "npm run android:backup:validate",
              "android-backup-validate",
            ),
            branch(
              "prepare-preflight-r8",
              "التحقق من سياسة R8 في release",
              "npm run android:r8:validate",
              "android-r8-validate",
            ),
            branch(
              "prepare-preflight-ios-push",
              "ios:push:validate — يعمل أيضاً داخل cap:sync",
              "npm run ios:push:validate",
              "cap-verify-defaults",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "version-metadata",
          label: "بيانات الإصدارات قبل المزامنة",
          branches: [
            branch(
              "prepare-preflight-version-validate",
              "version:validate — versionName/versionCode وخط المحتوى",
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
      label: "إنشاء حزمة الويب الثابتة في out/",
      sections: [
        {
          id: "static-build",
          label: "خطوة build:static داخل cap:prepare:android",
          branches: [
            branch(
              "prepare-build-static",
              "export ثابت كامل قبل أي cap sync",
              "npm run build:static",
              "build-static",
            ),
            branch(
              "prepare-build-static-diagnostic",
              "export تشخيصي — لا يُشحن إلى shell",
              "npm run build:static -- --diagnostic",
              "build-static",
              { parameters: { diagnostic: true } },
            ),
            branch(
              "prepare-build-static-local",
              "export مع NEXT_PUBLIC_ASOL_API_BASE_URL محلي",
              "npm run build:static:local",
              "build-static",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "static-gates",
          label: "بوابات build:static قبل كتابة out/ (مرجع)",
          branches: patternSubsteps("prepare-gate", "build-static", BUILD_STATIC_SUBSTEPS),
        },
        {
          id: "static-artifacts",
          label: "مخرجات out/ المتوقعة (مرجع)",
          branches: [
            branch(
              "prepare-static-artifact-manifest",
              "out/asol-web-manifest.json — قائمة الملفات الموقّعة",
              "out/asol-web-manifest.json",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "prepare-static-artifact-index",
              "out/index.html — مطلوب لـ cap:verify-defaults",
              "out/index.html",
              "build-static",
              { patternOnly: true },
            ),
            branch(
              "prepare-static-stage-build-out",
              "build-out.ts — الخطوة الأخيرة في build:static",
              "npx tsx packages/ota-core/scripts/build-out.ts",
              "build-static",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
    {
      id: "capacitor-sync",
      label: "نسخ/مزامنة Capacitor إلى android/app/src/main/assets/public",
      sections: [
        {
          id: "full-prepare",
          label: "مسار cap:prepare:android المركّب",
          branches: [
            branch(
              "cap-prepare-android",
              "build:static ثم cap:sync — تحضير Android كامل",
              "npm run cap:prepare:android",
              "cap-prepare-android",
            ),
            branch(
              "prepare-stage-build-static",
              "النصف الأول: npm run build:static",
              "npm run build:static",
              "cap-prepare-android",
              { patternOnly: true },
            ),
            branch(
              "prepare-stage-cap-sync",
              "النصف الثاني: npm run cap:sync",
              "npm run cap:sync",
              "cap-prepare-android",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "sync-pipeline",
          label: "خط أنابيب cap:sync خطوة بخطوة (مرجع)",
          branches: [
            ...patternSubsteps("prepare-sync", "cap-sync", CAP_SYNC_PIPELINE_SUBSTEPS),
            branch(
              "prepare-sync-cap",
              "cap:sync كامل — assert + policies + npx cap sync + SPM",
              "npm run cap:sync",
              "cap-sync",
            ),
          ],
        },
        {
          id: "copy-pipeline",
          label: "cap:copy — إعادة استخدام out/ دون sync كامل",
          branches: [
            branch(
              "prepare-sync-copy",
              "cap copy فقط — out/ موجود مسبقاً",
              "npm run cap:copy",
              "cap-copy",
            ),
            ...patternSubsteps("prepare-copy", "cap-copy", CAP_COPY_PIPELINE_SUBSTEPS),
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
      label: "Android Studio والتدقيق بعد المزامنة",
      sections: [
        {
          id: "android-studio",
          label: "فتح المشروع الأصلي محلياً",
          branches: [
            branch(
              "cap-open-android",
              "فتح android/ في Android Studio",
              "npm run cap:open:android",
              "cap-open-android",
            ),
          ],
        },
        {
          id: "post-sync-audit",
          label: "Capacitor defaults بعد مزامنة الأصول",
          branches: [
            branch(
              "prepare-post-cap-verify",
              "cap:verify-defaults — تدقيق الإعدادات وسياسات push/R8",
              "npm run cap:verify-defaults",
              "cap-verify-defaults",
            ),
          ],
        },
        {
          id: "outputs-folder",
          label: "فحص مخرجات Gradle إن وُجدت",
          branches: [
            branch(
              "prepare-open-outputs",
              "فتح android/app/build/outputs في مستكشف الملفات",
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
      label: "البيئة وسياسات native قبل assembleDebugR8",
      sections: [
        {
          id: "toolchain",
          label: "اكتشاف JDK وAndroid SDK",
          branches: [
            branch(
              "debug-preflight-android-preflight",
              "android:preflight — JDK 21 وAndroid SDK 36",
              "npm run android:preflight",
              "fastlane-android-doctor",
            ),
            branch(
              "debug-preflight-doctor",
              "fastlane android doctor — JAVA_HOME وAndroid SDK",
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
          label: "مهام Gradle داخل android:build:debug (مرجع)",
          branches: patternSubsteps(
            "debug-stage",
            "android-build-debug",
            DEBUG_BUILD_SCRIPT_STAGES,
          ),
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
          label: "خطوات التحليل الثابت داخل verify:all (مرجع)",
          branches: [
            branch(
              "host-verify-typecheck",
              "فحص أنواع TypeScript",
              "npm run typecheck",
              "run-test-suite",
              { patternOnly: true },
            ),
            branch(
              "host-verify-lint",
              "فحص ESLint",
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
              "github:ci-policy — عقد GitHub: CI الوثائق فقط",
              "npm run github:ci-policy",
              "run-test-suite",
              { patternOnly: true },
            ),
          ],
        },
        {
          id: "host-verify-all-substeps",
          label: "كل خطوات verify:all بالتفصيل (مرجع)",
          branches: patternSubsteps("host-verify-all", "run-test-suite", VERIFY_ALL_SUBSTEPS),
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
          label: "ما يشغّله android:device:tests داخلياً (مرجع)",
          branches: patternSubsteps(
            "device-stage",
            "run-device-tests",
            DEVICE_TEST_SCRIPT_STAGES,
          ),
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

export interface AndroidRunbookTreeStats {
  phases: number;
  sections: number;
  branches: number;
  dangerousBranches: number;
  patternOnlyBranches: number;
}

export function androidRunbookTreeStats(
  runbook: readonly AndroidReleaseRunbookPhase[],
): AndroidRunbookTreeStats {
  let sections = 0;
  let branches = 0;
  let dangerousBranches = 0;
  let patternOnlyBranches = 0;
  for (const phase of runbook) {
    sections += phase.sections.length;
    for (const section of phase.sections) {
      branches += section.branches.length;
      for (const item of section.branches) {
        if (item.dangerous) dangerousBranches += 1;
        if (item.patternOnly) patternOnlyBranches += 1;
      }
    }
  }
  return {
    phases: runbook.length,
    sections,
    branches,
    dangerousBranches,
    patternOnlyBranches,
  };
}

export function androidRunbookStatsByTab(): Record<AndroidReleasePathId, AndroidRunbookTreeStats> {
  return Object.fromEntries(
    Object.entries(ANDROID_RELEASE_RUNBOOKS).map(([pathId, runbook]) => [
      pathId,
      androidRunbookTreeStats(runbook),
    ]),
  ) as Record<AndroidReleasePathId, AndroidRunbookTreeStats>;
}
