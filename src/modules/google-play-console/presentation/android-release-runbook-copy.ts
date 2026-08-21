export const ANDROID_RELEASE_BRANCH_HELP: Record<string, string> = {
  "release-preflight-doctor":
    "يفحص JAVA_HOME وAndroid SDK ومفاتيح التوقيع وحساب Google Play قبل أي بناء native.",
  "release-preflight-open-outputs":
    "يفتح مجلد android/app/build/outputs في مستكشف الملفات — أو أقرب مجلد موجود إن لم يُبنَ بعد.",
  "release-preflight-backup":
    "يتحقق من سياسة android:allowBackup وقواعد استخراج البيانات في الملفات المُلتزمة.",
  "release-preflight-r8-policy":
    "يتحقق أن buildType release يبقي R8 وshrinkResources وتوقيع release مفعّلين.",
  "release-preflight-push-assets":
    "مرجع: android:push:sync-assets يزامن أصول الإشعارات إلى native-core قبل cap sync.",
  "release-preflight-ios-push":
    "مرجع: ios:push:validate يعمل داخل build:static وcap:sync وbuild:static.",
  "release-preflight-version-validate":
    "مرجع: version:validate يتحقق من بيانات الإصدارات قبل أي كتابة release.",
  "release-preflight-cap-defaults":
    "يراجع إعدادات Capacitor الافتراضية وسياسات push/R8 بعد وجود out/.",
  "release-android-current":
    "يعيد بناء shell Android عند versionName الحالي في Google Play Production مع محتوى web جديد. يرفض إذا وُجدت تغييرات native مُجمّعة.",
  "release-android-next-patch":
    "يرفع versionName وversionCode patch واحد فوق Production ثم يبني AAB/APK موقّعين. لا يرفع أي شيء إلى R2.",
  "release-orchestrator-dry-current":
    "مرجع: release:android --dry-run --native-version=current — خطة فقط بدون توقيع.",
  "release-orchestrator-dry-next-patch":
    "مرجع: release:android --dry-run --native-version=next-patch — خطة فقط بدون توقيع.",
  "release-stage-cap-build":
    "مرجع داخلي: cap-build --no-ota يبني out/ ويختم الإصدارات ويزامن Capacitor قبل التوقيع.",
  "release-stage-signed-gradle":
    "مرجع داخلي: build-android-signed يشغّل bundleRelease وassembleRelease ثم يتحقق من التوقيع.",
  "release-stage-web-bundle-flag":
    "مرجع: ASOL_WEB_BUNDLE_READY=1 يُمرَّر إلى build-android-signed بعد نجاح cap-build.",
  "release-cap-build-no-ota":
    "مسار store-release بدون توقيع: export ثابت + خط محتوى جديد + cap sync فقط.",
  "release-cap-build-no-ota-current":
    "مرجع: cap-build --no-ota --native-version=current — نفس المسار عند الإصدار الحالي.",
  "release-cap-build-no-ota-next":
    "مرجع: cap-build --no-ota --native-version=next-patch — نفس المسار مع patch جديد.",
  "release-cap-build-dry-run":
    "يعرض خطة الإصدارات ومهام Gradle دون تعديل ملفات أو الاتصال بـ R2.",
  "release-store-build-static":
    "مرجع: build:static داخل cap-build --no-ota قبل cap sync.",
  "release-store-cap-sync":
    "مرجع: cap:sync بعد build:static في مسار store-release.",
  "release-store-version-stamp":
    "مرجع: syncAndroidProjectVersions يختم versionName/versionCode وخط المحتوى.",
  "release-cap-prepare-android":
    "build:static ثم cap:sync — web + Capacitor فقط بدون Gradle signing.",
  "release-signed-build":
    "مرجع: android:build:signed — bundleRelease + assembleRelease + تحقق التوقيع.",
  "release-gradle-bundle-release":
    "مرجع: :app:bundleRelease — حزمة AAB لـ Google Play.",
  "release-gradle-assemble-release":
    "مرجع: :app:assembleRelease — APK release موقّع.",
  "release-sign-jarsigner":
    "مرجع: jarsigner -verify على app-release.aab داخل build-android-signed.",
  "release-sign-apksigner":
    "مرجع: apksigner verify على app-release.apk داخل build-android-signed.",
  "release-artifact-aab":
    "مرجع: android/app/build/outputs/bundle/release/app-release.aab",
  "release-artifact-apk":
    "مرجع: android/app/build/outputs/apk/release/app-release.apk",
  "release-artifact-mapping":
    "مرجع: android/app/build/outputs/mapping/release/*.txt — تقارير R8.",
  "release-fastlane-build":
    "Fastlane android build — AAB موقّع محسّن بـ R8 عند توفر Ruby.",
  "release-fastlane-aab-signed":
    "Fastlane aab_signed — مسار AAB موقّع.",
  "release-fastlane-aab-unsigned":
    "Fastlane aab_unsigned — AAB بدون keystore (تشخيصي).",
  "release-fastlane-apk-signed":
    "Fastlane apk_signed — APK release موقّع.",
  "release-fastlane-apk-unsigned":
    "Fastlane apk_unsigned — APK بدون keystore.",
  "release-fastlane-aab-signed-nor8":
    "Fastlane aab_signed_no_r8 — releaseNoR8؛ لا يُشحن إلى Play.",
  "release-fastlane-aab-unsigned-nor8":
    "Fastlane aab_unsigned_no_r8 — releaseNoR8 بدون keystore.",
  "release-fastlane-apk-signed-nor8":
    "Fastlane apk_signed_no_r8 — APK releaseNoR8 موقّع.",
  "release-fastlane-apk-unsigned-nor8":
    "Fastlane apk_unsigned_no_r8 — APK releaseNoR8 بدون keystore.",
  "release-fastlane-internal":
    "يرفع AAB إلى مسار internal على Google Play — نشر حي يتطلب تأكيد PUBLISH_INTERNAL.",
  "release-fastlane-production":
    "يرفع AAB إلى مسار production — نشر حي يتطلب تأكيد PUBLISH_PRODUCTION.",
  "release-r8-verify-release":
    "بعد وجود build release موقّع، يزامن أصول push ويعيد فحص السياسات ويتحقق من mapping R8.",
  "release-post-open-outputs":
    "يفتح مجلد مخرجات Gradle بعد بناء release ناجح.",
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
  "cap-prepare-android":
    "يبني web ثم يزامنه إلى android/app/src/main/assets/public عبر Capacitor.",
  "prepare-sync-assert-out":
    "مرجع: build-out.ts --assert-only — يتطلب out/ موجوداً قبل cap sync.",
  "prepare-sync-push-assets":
    "مرجع: android:push:sync-assets داخل cap:sync.",
  "prepare-sync-cap":
    "assert out/ + فحوص السياسات + npx cap sync + تطبيع iOS SPM.",
  "prepare-sync-copy":
    "cap copy فقط — يعيد استخدام out/ الموجود دون cap sync كامل.",
  "prepare-sync-ios-spm":
    "مرجع: ios:spm:normalize بعد cap sync.",
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
  "debug-stage-assemble-apk":
    "مرجع: :app:assembleDebugR8 — APK محسّن بـ R8 وموقّع debug وdebuggable.",
  "debug-stage-assemble-test":
    "مرجع: :app:assembleDebugR8AndroidTest — حزمة الاختبارات المُجهَّزة.",
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
  "device-stage-permissions":
    "مرجع: منح POST_NOTIFICATIONS قبل اختبارات الإشعارات.",
  "device-stage-connected-test":
    "مرجع: connectedDebugR8AndroidTest — يرفض صفر اختبارات كنجاح.",
  "device-stage-results":
    "مرجع: androidTest-results/connected — XML roster بعد الاختبار.",
  "ota-preflight-status":
    "يقرأ manifest واعتماد الإصدار الحالي من R2 بدون نشر.",
  "ota-preflight-check":
    "بوابة توافق dry-run — لا يرفع ملفات.",
  "ota-preflight-sync-cors":
    "مزامنة قواعد CORS المُعلنة إلى bucket OTA على R2.",
  "ota-preflight-static-build":
    "يجب وجود out/ قبل ota:publish — يشغّل build:static الكامل.",
  "ota-preflight-static-build-local":
    "مرجع: build:static:local قبل نشر OTA محلي.",
  "ota-preflight-static-diagnostic":
    "مرجع: build:static --diagnostic — يُمنع نشره إلى R2.",
  "ota-preflight-android-backup":
    "مرجع: android:backup:validate قبل cap-build publish.",
  "ota-preflight-android-r8":
    "مرجع: android:r8:validate قبل cap-build publish.",
  "ota-preflight-ios-push":
    "مرجع: ios:push:validate داخل build:static وcap:sync.",
  "ota-publish-default":
    "ينشر OTA جديداً إلى R2 من الحزمة الحالية. يتطلب عبارة تأكيد PUBLISH_OTA.",
  "ota-publish-mandatory":
    "ينشر OTA ويضبطه إلزامياً على الأجهزة المتوافقة.",
  "ota-publish-min-native":
    "ينشر OTA مع حد أدنى لإصدار shell native عند تغيّر التوافق.",
  "ota-publish-notes":
    "ينشر OTA مع ملاحظات مشغّل مرفقة في سجل النشر.",
  "ota-stage-build-out":
    "مرجع: build-out.ts — export أو assert على out/ قبل الرفع.",
  "ota-stage-upload":
    "مرجع: رفع manifest والملفات إلى R2 مع التوقيع.",
  "ota-revoke":
    "مرجع: ota:revoke — إلغاء اعتماد OTA على R2 (مسار منفصل عن النشر).",
  "ota-post-cap-build-resume":
    "cap:build:resume — يزامن المشاريع الأصلية من manifest OTA منشور.",
  "ota-post-cap-sync":
    "مرجع: cap:sync بعد التحقق من manifest على R2.",
  "ota-post-self-test":
    "اختبار end-to-end على R2 — يكتب ويحذف كائن probe.",
  "ota-post-status-recheck":
    "إعادة قراءة manifest واعتماد الإصدار بعد النشر.",
  "ota-post-ota-core":
    "اختبارات OTA core بدون كتابة على R2.",
  "ota-post-release-commands":
    "test:release-commands — عقود الكتالوج والشجرة بعد النشر.",
};
