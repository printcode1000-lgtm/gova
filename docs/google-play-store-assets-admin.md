# Google Play Store Assets Admin

## الصفحة

`/super-admin/google-play-store-assets`

صفحة تطوير فقط للسوبر أدمن لإدارة بيانات Google Play القابلة للتعديل عبر Android Publisher API وfastlane.

## ما تدعمه

- قراءة وتعديل تفاصيل التطبيق المتاحة عبر `edits.details`.
- قراءة وتعديل قوائم المتجر لكل لغة عبر `edits.listings`.
- قراءة ورفع وحذف الصور لكل نوع متاح عبر `edits.images`.
- إنشاء AAB/APK موقع وغير موقع عبر fastlane.
- نشر AAB إلى internal أو production.
- حفظ نسخة احتياطية JSON قبل تعديل النصوص داخل `.backups/google-play-store-assets`.

## الأصول المدعومة

- أيقونة التطبيق.
- الصورة الترويجية.
- لقطات الهاتف.
- لقطات 7 بوصة.
- لقطات 10 بوصة.
- بانر TV.
- لقطات TV.
- لقطات Wear.

## الاعتماد الآمن

تم نقل ملف حساب الخدمة من:

`assets/google-play/asole-73f1f-dc494a4b5159.json`

إلى متغيرات البيئة المحلية:

- `.env`
- `fastlane/.env`

المتغير الأساسي هو:

`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64`

ولا يتم عرض أي مفتاح خاص في الواجهة أو في الكود. fastlane ينشئ ملف JSON مؤقتًا وقت التشغيل فقط ويحذفه تلقائيًا عند انتهاء الأمر.

## حدود Google الرسمية

الصفحة تعرض وتعدل كل ما توفره Android Publisher API لهذه النقاط. بعض عناصر Play Console الحديثة، مثل بعض بيانات السياسة أو نموذج أمان البيانات، قد لا تكون مكشوفة عبر نفس API؛ في هذه الحالة ستبقى غير متاحة برمجيًا وتحتاج واجهة Play Console نفسها.
