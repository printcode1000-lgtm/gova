/** Arabic help overrides for the ota-publish runbook path. */
export const OTA_PUBLISH_PATH_HELP: Record<string, string> = {
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
