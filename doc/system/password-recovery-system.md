# نظام استعادة كلمة المرور

## الهدف

يوفر الموديول `src/features/password-recovery` تدفقًا مستقلاً لاستعادة كلمة المرور عبر البريد الإلكتروني. يبدأ المستخدم برقم الهاتف المسجل، ويستلم رمزًا من 6 أرقام، ثم يعيّن كلمة مرور جديدة بعد التحقق.

## تدفق المستخدم

1. يفتح المستخدم `/forgot-password` ويدخل رقم الهاتف المصري المسجل.
2. ينشئ الخادم تحديًا صالحًا لمدة 10 دقائق.
3. إذا كان الحساب مرتبطًا ببريد، يرسل Gmail الرمز ويعيد عنوانًا مخفيًا مثل `h********@gmail.com`.
4. إذا لم يوجد بريد، يظهر زر ينقل إلى `/contact-us`.
5. إذا لم يوجد الحساب، يعرض التطبيق رسالة عامة ولا يصرّح بأن الرقم غير مسجل.
6. بعد التحقق من الرمز، يصدر الخادم رمز تفويض عشوائيًا منفصلاً.
7. يرسل المستخدم كلمة المرور الجديدة مع رمز التفويض، ثم يُستهلك التحدي ولا يمكن استخدامه مجددًا.

## الحماية

- صلاحية رمز البريد: 10 دقائق.
- حد الإرسال للهاتف: 3 طلبات خلال 15 دقيقة.
- حد الإرسال لعنوان الشبكة: 12 طلبًا خلال 15 دقيقة.
- حد إدخال الرمز: 5 محاولات.
- لا تُخزن رموز البريد أو أرقام الهاتف أو عناوين الشبكة بصورتها الصريحة في جدول الاستعادة.
- تستخدم القيم المخزنة HMAC-SHA-256 مع سر خادمي.
- رمز تعيين كلمة المرور عشوائي بطول 256 بت، ويُخزن ملخصه فقط.
- رسائل الخطأ للأكواد غير الصحيحة أو المنتهية موحدة.

> البريد المخفي وحالة «لا يوجد بريد» متطلبات تجربة مستخدم، ولذلك قد تكشفان أن الرقم مرتبط بحساب. أما الرقم غير الموجود فلا يعيد رسالة `userNotFound`.

## الإعدادات السرية

تُضبط القيم التالية في `.env.local` للتطوير وفي متغيرات بيئة الاستضافة للإنتاج:

```env
PASSWORD_RECOVERY_GMAIL_USER=suezbazaar@gmail.com
PASSWORD_RECOVERY_GMAIL_APP_PASSWORD=
PASSWORD_RECOVERY_SIGNING_SECRET=
```

- `PASSWORD_RECOVERY_GMAIL_APP_PASSWORD`: Google App Password بعد تفعيل التحقق بخطوتين. لا يوضع في المستودع.
- `PASSWORD_RECOVERY_SIGNING_SECRET`: قيمة عشوائية قوية لا تقل عن 32 بايت، ويجب أن تكون متطابقة على جميع نسخ الخادم.
- يجب إضافة القيم إلى Vercel أو بيئة الخادم؛ وجودها محليًا لا ينقلها تلقائيًا إلى الاستضافة.

## واجهات API

### `POST /api/auth/password-recovery/request`

المدخل: `{ "phone": "01012345678" }`.

النتيجة إحدى الحالات: `sent` مع البريد المخفي، أو `contactAdmin`، أو `accepted` للرد العام.

### `POST /api/auth/password-recovery/verify`

المدخل: `{ "phone": "01012345678", "code": "123456" }`.

يعيد `resetToken` مؤقتًا عند نجاح التحقق.

### `POST /api/auth/password-recovery/reset`

المدخل: الهاتف، و`resetToken`، وكلمة المرور الجديدة وتأكيدها. يستهلك التحدي بعد نجاح التغيير.

## قاعدة البيانات

أضيف جدول `password_recovery_challenges` ضمن قاعدة المستخدمين، وتديره هجرة Drizzle رقم `0004`. يحتوي الجدول على معرف التحدي، ملخص الهاتف، معرف المستخدم الاختياري، ملخص الرمز، ملخص رمز التفويض، الحدود الزمنية، وعدد المحاولات.

تشغّل بيئة التطوير الهجرات تلقائيًا، وتزامن بيئة Turso من خلال:

```bash
npm run db:schema:sync
```

## الملفات الرئيسية

- `src/features/password-recovery/services/password-recovery-service.server.ts`: قواعد التدفق والحماية.
- `src/features/password-recovery/services/password-recovery-email-service.server.ts`: إرسال Gmail.
- `src/features/password-recovery/repositories/password-recovery-repository.ts`: تخزين التحديات.
- `src/features/password-recovery/components/PasswordRecoveryPageContent.tsx`: واجهة الخطوات.
- `src/app/api/auth/password-recovery/*`: نقاط API.
- `src/core/database/migrations/0004_breezy_cammi.sql`: هجرة قاعدة البيانات.

## الاختبار

```bash
npm run test:password-recovery
npm run typecheck
npm run lint
npm run architecture:check
```
