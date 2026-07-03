# Product Page and Category Database Contract

## التخزين الحالي

يحافظ جدول المنتجات على عمودي النص القديمين:

- `main_category_id`
- `subcategory_id`

القيم متوافقة خلفيًا مع أسماء ملفات Product Style. قبل إنشاء المنتج، يحول `ProductService` القيم إلى أرقام ويمررها إلى `categoryService.resolveLegacyProductSelection`.

## قواعد الصلاحية

- التصنيف الفرعي يجب أن ينتمي إلى التصنيف الرئيسي.
- عضو المجموعة يجب أن ينتمي إلى المجموعة.
- المعرف المجهول أو العلاقة الخاطئة ترفض بـ`invalidCategorySelection`.
- Doctor Appointment الافتراضي وDelivery Services لا يمثلان اختيار منتج صالحًا.
- Regex يحمي شكل المدخل فقط؛ Resolver هو مصدر صحة العلاقة.

## Product Style

مسار API الخاص بالمطور يطبق التحقق نفسه عند GET وPUT. لا تُقرأ أو تكتب ملفات Style لعلاقة تصنيف غير صالحة. يستمر شكل اسم الملف `<mainId>__<subcategoryId>.json` حفاظًا على الملفات الحالية.

## مصدر أسماء التصنيفات

قاعدة المنتجات لا تكرر عناوين التصنيفات أو صورها. جميع بيانات العرض تأتي من وحدة التصنيفات، وهي وحدها التي تقرأ JSON الرسمي.
