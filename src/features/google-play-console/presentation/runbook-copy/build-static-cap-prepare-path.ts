/** Arabic help overrides for build-static and cap-prepare-android runbook paths. */
export const BUILD_STATIC_CAP_PREPARE_PATH_HELP: Record<string, string> = {
  "static-preflight-ios-push":
    "مرجع: ios:push:validate يعمل داخل build:static.",
  "static-preflight-backup":
    "فحص سياسة Android backup على ملفات المشروع المُلتزمة.",
  "static-preflight-r8":
    "فحص سياسة R8 في Gradle قبل كتابة out/.",
  "static-gate-native-core":
    "مرجع: test:native-core — بوابة حزمة native-core داخل build:static.",
  "static-gate-ota-core":
    "test:ota-core — عقود OTA قبل export (قابل للتشغيل منفصلاً).",
  "static-gate-release-core":
    "مرجع: test:release-core — بوابة @asol/release-core داخل build:static.",
  "static-gate-release-commands":
    "مرجع: test:release-commands — عقود الكتالوج والشجرة داخل build:static.",
  "static-gate-architecture":
    "مرجع: architecture:check — حدود الوحدات داخل build:static.",
  "build-static-default":
    "ينشئ out/ وملف asol-web-manifest.json فقط. لا يلمس Capacitor ولا يبني APK/AAB.",
  "build-static-diagnostic":
    "نفس build:static مع metadata تشخيصية إضافية داخل الحزمة لتتبع مشاكل التصدير.",
  "build-static-local-api":
    "مرجع: build:static:local — export مع NEXT_PUBLIC_ASOL_API_BASE_URL محلي.",
  "static-artifact-manifest":
    "مرجع: out/asol-web-manifest.json — قائمة الملفات الموقّعة لفحوص OTA.",
  "static-artifact-tree":
    "مرجع: شجرة out/ التي تُنسخ لاحقاً إلى Capacitor.",
  "static-artifact-index":
    "مرجع: out/index.html — مطلوب لـ cap:verify-defaults.",
  "static-stage-build-out":
    "مرجع: build-out.ts — الخطوة الأخيرة في build:static.",
  "static-preview-serve":
    "مرجع: preview:static — يخدم out/ على المنفذ 5500.",
  "static-serve-out":
    "مرجع: serve:out — alias لخادم المعاينة الثابتة.",
  "static-post-cap-verify":
    "يراجع إعدادات Capacitor بعد وجود out/index.html.",
  "static-post-ota-core":
    "اختبارات وعقود @asol/ota-core بدون كتابة على R2.",
  "static-post-release-core":
    "مرجع: test:release-core بعد export — عقود release-core.",
  "static-post-release-commands":
    "مرجع: test:release-commands بعد export — عقود الكتالوج والشجرة.",
  "prepare-preflight-android-preflight":
    "يفحص JDK 21 وAndroid SDK قبل export أو cap sync — تشغيل مستقل لـ android:preflight.",
  "prepare-preflight-doctor":
    "Fastlane doctor — JDK وSDK ومفاتيح التوقيع عند توفر Ruby.",
  "prepare-preflight-backup":
    "فحص سياسة Android backup قبل أي cap sync.",
  "prepare-preflight-r8":
    "فحص سياسة R8 قبل أي cap sync.",
  "prepare-preflight-ios-push":
    "مرجع: ios:push:validate قبل cap:sync.",
  "prepare-preflight-version-validate":
    "مرجع: version:validate قبل مزامنة Capacitor.",
  "prepare-build-static":
    "خطوة build:static داخل cap:prepare:android — export كامل قبل المزامنة.",
  "prepare-build-static-diagnostic":
    "export تشخيصي؛ لا يُشحن إلى shell.",
  "prepare-build-static-local":
    "مرجع: build:static:local داخل مسار التحضير.",
  "prepare-gate-native-core":
    "مرجع: test:native-core — بوابة native-core داخل build:static قبل كتابة out/.",
  "prepare-gate-ota-core":
    "مرجع: test:ota-core — عقود OTA قبل export.",
  "prepare-gate-release-core":
    "مرجع: test:release-core — بوابة release-core داخل build:static.",
  "prepare-gate-release-commands":
    "مرجع: test:release-commands — عقود الكتالوج والشجرة داخل build:static.",
  "prepare-gate-architecture":
    "مرجع: architecture:check — حدود الوحدات داخل build:static.",
  "prepare-gate-ios-push":
    "مرجع: ios:push:validate — سياسة push قبل export.",
  "prepare-static-artifact-manifest":
    "مرجع: out/asol-web-manifest.json — قائمة الملفات الموقّعة لاحقاً في OTA.",
  "prepare-static-artifact-index":
    "مرجع: out/index.html — مطلوب لـ cap:verify-defaults.",
  "prepare-static-stage-build-out":
    "مرجع: build-out.ts — يكتب out/ وmanifest في نهاية build:static.",
  "prepare-stage-build-static":
    "مرجع: النصف الأول من cap:prepare:android — npm run build:static.",
  "prepare-stage-cap-sync":
    "مرجع: النصف الثاني من cap:prepare:android — npm run cap:sync.",
  "cap-prepare-android":
    "يبني web ثم يزامنه إلى android/app/src/main/assets/public عبر Capacitor.",
  "prepare-sync-assert-out":
    "مرجع: build-out.ts --assert-only — يتطلب out/ موجوداً قبل cap sync.",
  "prepare-sync-push-assets":
    "مرجع: android:push:sync-assets داخل cap:sync.",
  "prepare-sync-backup-pre":
    "مرجع: android:backup:validate قبل npx cap sync.",
  "prepare-sync-r8-pre":
    "مرجع: android:r8:validate قبل npx cap sync.",
  "prepare-sync-ios-push-pre":
    "مرجع: ios:push:validate قبل npx cap sync.",
  "prepare-sync-npx-cap-sync":
    "مرجع: npx cap sync — ينسخ out/ إلى android/app/src/main/assets/public.",
  "prepare-sync-ios-spm":
    "مرجع: ios:spm:normalize بعد cap sync.",
  "prepare-sync-backup-post":
    "مرجع: android:backup:validate بعد npx cap sync.",
  "prepare-sync-r8-post":
    "مرجع: android:r8:validate بعد npx cap sync.",
  "prepare-sync-ios-push-post":
    "مرجع: ios:push:validate بعد npx cap sync.",
  "prepare-sync-cap":
    "assert out/ + فحوص السياسات + npx cap sync + تطبيع iOS SPM.",
  "prepare-sync-copy":
    "cap copy فقط — يعيد استخدام out/ الموجود دون cap sync كامل.",
  "prepare-copy-assert-out":
    "مرجع: build-out.ts --assert-only قبل cap copy.",
  "prepare-copy-push-assets":
    "مرجع: android:push:sync-assets قبل cap copy.",
  "prepare-copy-backup-pre":
    "مرجع: android:backup:validate قبل npx cap copy.",
  "prepare-copy-r8-pre":
    "مرجع: android:r8:validate قبل npx cap copy.",
  "prepare-copy-ios-push-pre":
    "مرجع: ios:push:validate قبل npx cap copy.",
  "prepare-copy-npx-cap-copy":
    "مرجع: npx cap copy — نسخ assets دون sync كامل للم plugins.",
  "prepare-copy-backup-post":
    "مرجع: android:backup:validate بعد npx cap copy.",
  "prepare-copy-r8-post":
    "مرجع: android:r8:validate بعد npx cap copy.",
  "prepare-copy-ios-push-post":
    "مرجع: ios:push:validate بعد npx cap copy.",
  "prepare-cap-build-publish-new":
    "cap:build — ينشر OTA جديداً على R2 ثم يزامن المشاريع الأصلية.",
  "prepare-cap-build-resume":
    "cap:build:resume — يستكمل من manifest OTA منشور.",
  "prepare-cap-build-skip-ota":
    "cap:build --skip-ota — يعيد استخدام out/ ويتحقق من R2 دون نشر.",
  "prepare-cap-build-dry-run":
    "cap:build --dry-run — خطة فقط.",
  "prepare-cap-build-local":
    "مرجع: cap:build:local — بناء محلي بدون رفع R2 أو تغيير إصدارات.",
  "prepare-cap-run-clean-android":
    "مرجع: cap:run:clean:android — بناء محلي، مسح بيانات التطبيق، cap run.",
  "cap-open-android":
    "يفتح مشروع Android Studio على المسار المحلي بعد التحضير.",
  "prepare-post-cap-verify":
    "يراجع إعدادات Capacitor بعد مزامنة الأصول.",
  "prepare-open-outputs":
    "يفتح مجلد مخرجات Gradle إن وُجد.",
  "static-stage-branding":
    "مرجع: npm run branding:generate — أصول العلامة قبل export في build:static.",
  "static-stage-maplibre":
    "مرجع: npm run maplibre:sync — worker الخريطة قبل export في build:static.",
  "static-stage-catalog-validate":
    "مرجع: npm run catalog:validate — فحص الكتالوج قبل export في build:static.",
  "static-stage-services-sync":
    "مرجع: npm run services:sync — مرايا الخدمات قبل export في build:static.",
  "static-gate-pipeline-native-core":
    "مرجع: npm run test:native-core — بوابة native-core داخل build:static (خط أنابيب gates).",
  "static-gate-pipeline-ota-core":
    "مرجع: npm run test:ota-core — عقود OTA قبل export (خط أنابيب gates).",
  "static-gate-pipeline-release-core":
    "مرجع: npm run test:release-core — بوابة release-core داخل build:static (خط أنابيب gates).",
  "static-gate-pipeline-release-commands":
    "مرجع: npm run test:release-commands — عقود الكتالوج والشجرة داخل build:static (خط أنابيب gates).",
  "static-gate-pipeline-architecture":
    "مرجع: npm run architecture:check — حدود الوحدات داخل build:static (خط أنابيب gates).",
  "static-gate-pipeline-ios-push":
    "مرجع: npm run ios:push:validate — سياسة iOS push داخل build:static (خط أنابيب gates).",
};
