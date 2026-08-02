# Release Command Center

مركز أوامر الإصدار يعيش في `src/modules/release-commands`.

## Catalog

`domain/build-command-catalog.ts` هو SSOT لكل أمر. كل entry يحدد:

- command id
- npm script
- argv
- category: `web-static`, `ota`, `native-android`, `verification`, `fastlane`
- danger: `safe`, `destructive`, `publishes-live`
- confirmation phrase لل live publishing
- required env vars
- expected artifact paths
- estimated duration

## Job Runner

`services/build-job-runner.server.ts` يشغل الأوامر عبر async `spawn`، لا يستخدم `spawnSync`. stdout وstderr يكتبان إلى:

`.backups/build-jobs/<jobId>.log`

Metadata تكتب إلى:

`.backups/build-jobs/<jobId>.json`

## Single Flight

يوجد lock واحد للأوامر من categories: `native-android`, `ota`, و`fastlane`. لا يمكن تشغيل أكثر من job من هذه الفئات في نفس الوقت.

## Cancellation

الإلغاء يقتل شجرة العملية على Windows عبر `taskkill /T /F`، ويحدث metadata إلى `cancelled`.

## Artifacts

بعد انتهاء job يتم فحص:

- `android/app/build/outputs/bundle/{release,releaseNoR8}/*.aab`
- `android/app/build/outputs/apk/{release,releaseNoR8}/*.apk`
- `android/app/build/outputs/mapping/release/*.txt`
- `out/asol-web-manifest.json`

كل artifact يعرض الاسم والحجم وmtime وSHA-256 ويمكن تنزيله من route محمي ومتاح في التطوير فقط.

## Confirmation Model

أي command خطره `publishes-live` يتطلب عبارة تأكيد من catalog. الخادم يتحقق منها قبل spawn ولا يثق في العميل.
