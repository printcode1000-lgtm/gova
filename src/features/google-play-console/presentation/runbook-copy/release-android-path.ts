/** Arabic help overrides for the release-android runbook path. */
export const RELEASE_ANDROID_PATH_HELP: Record<string, string> = {
  "release-preflight-android-preflight":
    "يفحص JDK 21 وAndroid SDK 36 وgradlew قبل release:android — تشغيل مستقل لـ android:preflight.",
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
  "release-stage-preflight":
    "مرجع: android-build-preflight يعمل في بداية release:android قبل cap-build — JDK وSDK وgradlew.",
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
  "release-signed-stage-require-keystore":
    "مرجع: build-android-signed يرفض عند غياب ASOL_ANDROID_KEYSTORE_* — لا مخرجات غير موقّعة.",
  "release-signed-stage-require-web-bundle":
    "مرجع: ASOL_WEB_BUNDLE_READY=1 وmanifest في out/ وassets/public مطلوبان قبل Gradle.",
  "release-signed-stage-preflight":
    "مرجع: android-build-preflight قبل bundleRelease/assembleRelease.",
  "release-signed-stage-bundle-release":
    "مرجع: :app:bundleRelease — حزمة AAB لرفع Google Play.",
  "release-signed-stage-assemble-release":
    "مرجع: :app:assembleRelease — APK release للت sideload.",
  "release-signed-stage-jarsigner":
    "مرجع: jarsigner -verify على app-release.aab بعد التجميع.",
  "release-signed-stage-apksigner":
    "مرجع: apksigner verify --verbose --print-certs على app-release.apk.",
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
};
