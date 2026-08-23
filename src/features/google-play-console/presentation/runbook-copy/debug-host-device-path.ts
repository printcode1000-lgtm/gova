/** Arabic help overrides for android-build-debug host/device verification paths. */
export const DEBUG_HOST_DEVICE_PATH_HELP: Record<string, string> = {
  "debug-preflight-android-preflight":
    "android:preflight — JDK 21 وAndroid SDK قبل assembleDebugR8.",
  "debug-preflight-doctor":
    "يفحص JAVA_HOME وAndroid SDK قبل assembleDebugR8.",
  "debug-preflight-backup":
    "فحص سياسة Android backup قبل بناء حزمة الاختبار.",
  "debug-preflight-r8":
    "فحص سياسات debugR8 وrelease R8 في Gradle.",
  "debug-preflight-ios-push":
    "مرجع: ios:push:validate قبل cap:prepare:android.",
  "android-build-debug":
    "مسار اختبار: web جديد → sync → assembleDebugR8 + حزمة androidTest. لا keystore ولا R2.",
  "debug-prepare-android":
    "web + cap sync فقط بدون Gradle — مفيد قبل تشغيل اختبارات الجهاز.",
  "debug-stage-preflight":
    "مرجع: android-build-preflight في بداية android:build:debug.",
  "debug-stage-cap-prepare":
    "مرجع: npm run cap:prepare:android — export + sync قبل Gradle.",
  "debug-stage-assemble-apk":
    "مرجع: :app:assembleDebugR8 — APK محسّن بـ R8 وموقّع debug وdebuggable.",
  "debug-stage-assemble-test":
    "مرجع: :app:assembleDebugR8AndroidTest — حزمة الاختبارات المُجهَّزة.",
  "debug-stage-verify-apk":
    "مرجع: التحقق من وجود app-debugR8.apk بعد assembleDebugR8.",
  "debug-artifact-apk":
    "مرجع: android/app/build/outputs/apk/debugR8/app-debugR8.apk",
  "debug-open-outputs":
    "يفتح مجلد مخرجات Gradle بعد بناء debugR8.",
  "run-test-suite":
    "فحوصات المستودع على الجهاز المضيف: types، lint، architecture، tests.",
  "host-verify-android-backup":
    "android:backup:validate — خطوة verify:all (قابل للتشغيل منفصلاً).",
  "host-verify-android-r8":
    "android:r8:validate — خطوة verify:all (قابل للتشغيل منفصلاً).",
  "host-verify-ios-push":
    "مرجع: ios:push:validate داخل verify:all.",
  "host-verify-version-validate":
    "مرجع: version:validate داخل verify:all.",
  "host-verify-typecheck":
    "مرجع: npm run typecheck — أول خطوة في verify:all.",
  "host-verify-lint":
    "مرجع: npm run lint داخل verify:all.",
  "host-verify-architecture":
    "مرجع: npm run architecture:check داخل verify:all.",
  "host-verify-ci-coverage":
    "مرجع: npm run ci:coverage — parity مع native-core.yml.",
  "host-verify-release-commands":
    "مرجع: test:release-commands — عقود كتالوج أوامر الإصدار والشجرة.",
  "host-verify-release-core":
    "مرجع: test:release-core — بوابة @asol/release-core في verify:all.",
  "host-verify-native-core":
    "مرجع: test:native-core — بوابة حزمة native-core.",
  "host-check-release-commands":
    "test:release-commands — تشغيل مستقل لعقود الكتالوج والشجرة.",
  "host-check-release-core":
    "test:release-core — تشغيل مستقل لعقود release-core.",
  "host-check-native-core":
    "test:native-core — تشغيل مستقل لبوابة native-core.",
  "host-check-ota-core":
    "اختبارات OTA core منفصلة عن verify:all الكامل.",
  "host-check-ota-self-test":
    "اختبار end-to-end على R2 — يحتاج ASOL_OTA_R2_* ومفتاح التوقيع.",
  "host-check-cap-defaults":
    "مراجعة Capacitor — يحتاج out/ أو أصولاً متزامنة.",
  "host-check-r8-verify-release":
    "التحقق من mapping release بعد build موقّع.",
  "host-check-google-play-assets":
    "مرجع: test:google-play-store-assets-core — بوابة صور المتجر.",
  "run-device-tests":
    "اختبارات instrumentation على جهاز متصل؛ يختار الجهاز تلقائياً إذا كان واحداً فقط.",
  "run-device-tests-serial":
    "نفس android:device:tests لكن على serial محدد عند وجود أكثر من جهاز.",
  "device-stage-detect-device":
    "مرجع: detectDevice — يختار جهاز adb واحد أو يرفض عند غياب/تعدد الأجهزة.",
  "device-stage-grant-permissions":
    "مرجع: grantRuntimePermissions — منح POST_NOTIFICATIONS قبل اختبارات الإشعارات.",
  "device-stage-set-serial":
    "مرجع: ANDROID_SERIAL يُمرَّر إلى Gradle لاختبار جهاز محدد.",
  "device-stage-connected-test":
    "مرجع: connectedDebugR8AndroidTest — يرفض صفر اختبارات كنجاح.",
  "device-stage-zero-tests-refusal":
    "مرجع: يرفض التشغيل إذا لم يُنفَّذ أي testcase — suite فارغ ليس نجاحاً.",
  "device-stage-collect-xml":
    "مرجع: androidTest-results/connected — roster XML بعد الاختبار.",
};
