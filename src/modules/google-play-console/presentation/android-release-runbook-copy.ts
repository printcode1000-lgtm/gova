export const ANDROID_RELEASE_BRANCH_HELP: Record<string, string> = {
  "release-android-current":
    "يعيد بناء shell Android عند versionName الحالي في Google Play Production مع محتوى web جديد. يرفض إذا وُجدت تغييرات native مُجمّعة.",
  "release-android-next-patch":
    "يرفع versionName وversionCode patch واحد فوق Production ثم يبني AAB/APK موقّعين. لا يرفع أي شيء إلى R2.",
  "build-static-default":
    "ينشئ out/ وملف asol-web-manifest.json فقط. لا يلمس Capacitor ولا يبني APK/AAB.",
  "build-static-diagnostic":
    "نفس build:static مع metadata تشخيصية إضافية داخل الحزمة لتتبع مشاكل التصدير.",
  "cap-prepare-android":
    "يبني web ثم يزامنه إلى android/app/src/main/assets/public عبر Capacitor.",
  "cap-open-android":
    "يفتح مشروع Android Studio على المسار المحلي بعد التحضير.",
  "android-build-debug":
    "مسار اختبار: web جديد → sync → assembleDebugR8. لا keystore ولا R2.",
  "run-test-suite":
    "فحوصات المستودع على الجهاز المضيف: types، lint، architecture، tests.",
  "run-device-tests":
    "اختبارات instrumentation على جهاز متصل؛ يختار الجهاز تلقائياً إذا كان واحداً فقط.",
  "run-device-tests-serial":
    "نفس android:device:tests لكن على serial محدد عند وجود أكثر من جهاز.",
  "ota-publish-default":
    "ينشر OTA جديداً إلى R2 من الحزمة الحالية. يتطلب عبارة تأكيد PUBLISH_OTA.",
  "ota-publish-mandatory":
    "ينشر OTA ويضبطه إلزامياً على الأجهزة المتوافقة.",
  "ota-publish-min-native":
    "ينشر OTA مع حد أدنى لإصدار shell native عند تغيّر التوافق.",
  "ota-publish-notes":
    "ينشر OTA مع ملاحظات مشغّل مرفقة في سجل النشر.",
};
