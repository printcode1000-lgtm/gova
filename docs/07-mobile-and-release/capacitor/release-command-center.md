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

زر `release-android-with-ota` يعرض خيارات الإصدار داخل نافذة التأكيد نفسها ولا يبدأ قبل اختيارها:

- رقم Android الحالي ورقم OTA الفعّال المقروء مباشرة من manifest العام على R2، مع رقم Patch التالي المقترح.
- عند اختيار إصدار Android جديد أو نشر OTA جديد، تعرض النافذة رقم الإصدار الناتج فوراً قبل التأكيد.
- إعادة بناء القشرة برقم Android الحالي، أو رفع `versionName` و`versionCode` إلى Patch جديد.
- نشر OTA جديد، أو استكمال بناء Android من manifest نُشر ونجح مسبقاً.
- ملاحظات OTA الاختيارية، وهل التحديث إلزامي.

خيار الاستكمال لا يعيد نشر OTA، ولا يجوز استخدامه بعد فشل الرفع قبل اعتماد `manifest.json`. أما الملاحظات والتحديث الإلزامي فلا يقبلان إلا مع نشر OTA جديد.

عمليات R2 تعيد تلقائياً أخطاء الشبكة وDNS العابرة، بما فيها `ENOTFOUND` و`EAI_AGAIN`، قبل اعتبار المهمة فاشلة.

`scripts/release-android-with-ota.ts` هو منسق الإصدار الكامل. يمرر خيارات النافذة إلى `cap-build.ts` أولاً، ولا يبدأ `build-android-signed.ts` إلا بعد نجاح نشر/استكمال OTA والتحقق من R2 ومزامنة Capacitor. لا تستخدم سلسلة npm مركبة لهذا المسار لأن معاملات المشغل ستلتصق بالأمر الأخير بدلاً من مخطط الإصدار.

بعد نجاح `cap-build.ts` يمرر المنسق `ASOL_WEB_BUNDLE_READY=1` إلى بناء Android الموقّع. لا تُضبط هذه العلامة قبل ذلك، لأنها إثبات أن الحزمة المتزامنة طابقت manifest المنشور وتحقق محتواها على R2.
