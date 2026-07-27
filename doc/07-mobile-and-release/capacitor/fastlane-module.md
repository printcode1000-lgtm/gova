# Fastlane Publishing Module

## الهدف

مديول fastlane يجهز بناء ونشر تطبيق Android على Google Play، ويترك iOS جاهزًا للتوسع لاحقًا عند توفر إعدادات Apple. كل بيانات Google Play والتوقيع محفوظة في ملفات البيئة المحلية، ولا يعتمد النظام على ملف JSON دائم داخل المشروع.

## هوية التطبيق

- Android package: `hgh.asol.app`
- iOS bundle id: `hgh.asol.app`
- Google Play service account: `fastlane@asole-73f1f.iam.gserviceaccount.com`
- Google Play service account unique id: `111043929087553456734`
- Android keystore path الدائم: `assets/google-play/k.jks`
- Android key alias: محفوظ في البيئة كـ `ASOL_ANDROID_KEY_ALIAS`

## ملفات البيئة

القيم الحساسة محفوظة محليًا في:

- `.env`
- `fastlane/.env`

هذه الملفات ممنوعة من Git عبر `.gitignore`.

## بيانات Google Play

تم نقل بيانات ملف حساب الخدمة القديم:

`assets/google-play/asole-73f1f-dc494a4b5159.json`

إلى متغيرات البيئة، ثم حذف الملف بعد التحقق من التطابق.

المتغير الأساسي:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64`

ومتغيرات الفهرسة/الفحص:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_UNIQUE_ID`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_PROJECT_ID`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_ID`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_ID`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_URI`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_TOKEN_URI`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_UNIVERSE_DOMAIN`

fastlane ينشئ ملف JSON مؤقتًا من `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64` وقت التشغيل فقط، ثم يحذفه تلقائيًا عند انتهاء الأمر.

## بيانات توقيع Android

المتغيرات المطلوبة موجودة في `.env` و`fastlane/.env`:

- `ASOL_ANDROID_PACKAGE_NAME=hgh.asol.app`
- `ASOL_ANDROID_KEYSTORE_FILE=assets/google-play/k.jks`
- `ASOL_ANDROID_KEYSTORE_PASSWORD`
- `ASOL_ANDROID_KEY_ALIAS`
- `ASOL_ANDROID_KEY_PASSWORD`
- `GOOGLE_PLAY_TRACK=internal`

مسار الكي `assets/google-play/k.jks` ثابت وسيبقى كذلك دائمًا.

## أوامر Android

- `npm run fastlane:android:doctor`
- `npm run fastlane:android:build`
- `npm run fastlane:android:aab:signed`
- `npm run fastlane:android:aab:unsigned`
- `npm run fastlane:android:apk:signed`
- `npm run fastlane:android:apk:unsigned`
- `npm run fastlane:android:internal`
- `npm run fastlane:android:production`

## صفحة التحكم

صفحة السوبر أدمن في التطوير:

`/super-admin/google-play-store-assets`

تدعم:

- تعديل بيانات المتجر النصية.
- رفع وحذف أيقونة التطبيق والصور ولقطات الشاشة.
- إنشاء AAB/APK موقع وغير موقع.
- النشر إلى internal أو production.
- أخذ نسخة احتياطية JSON قبل تعديل النصوص داخل `.backups/google-play-store-assets`.

## الأمان

- لا يتم عرض كلمات المرور أو المفتاح الخاص في الواجهة.
- لا يتم حفظ ملف JSON الدائم داخل `assets/google-play`.
- `assets/google-play/k.jks` موجود محليًا وممنوع من Git.
- النشر إلى production يتطلب تأكيدًا صريحًا من الصفحة.

## iOS

أوامر iOS موجودة كبنية مستقبلية:

- `npm run fastlane:ios:build`
- `npm run fastlane:ios:testflight`

وتحتاج لاحقًا إلى macOS/Xcode وإعدادات App Store Connect.
