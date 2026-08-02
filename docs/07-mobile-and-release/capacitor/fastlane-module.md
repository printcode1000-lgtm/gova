# Fastlane Module

Fastlane يمر عبر `scripts/fastlane-runner.js` حتى يعمل Ruby/Bundler بثبات على Windows.

## Android Lanes

Release lanes الحالية:

- `doctor`
- `build`
- `aab_signed`
- `aab_unsigned`
- `apk_signed`
- `apk_unsigned`
- `internal`
- `production`

Diagnostic no-R8 lanes الجديدة لا ترفع إلى Google Play أبدا:

- `aab_signed_no_r8`
- `aab_unsigned_no_r8`
- `apk_signed_no_r8`
- `apk_unsigned_no_r8`

## Track And Rollout Capabilities

لوحة الإصدار تستطيع قراءة وتحديث tracks: `internal`, `alpha`, `beta`, و`production`. يمكن ضبط staged rollout عبر `userFraction`، إيقاف rollout بالحالة `halted`، استئنافه، أو إكماله بالحالة `completed`. كما يمكن إرفاق release notes لكل لغة وترقية `versionCode` موجود من مسار لآخر بدون build جديد.

## Safety

أي lane يستخدم `upload_to_play_store` يجب أن يبقى على `Release` فقط. validator `npm run android:r8:validate` يفشل إذا ظهر `ReleaseNoR8` أو `no_r8` داخل lane ينشر إلى Play.
