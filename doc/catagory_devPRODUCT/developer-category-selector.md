# Developer Category Selector

محدد المطور مستهلك للـAPI العام في `@/features/categories`.

## التدفق

1. يحصل على main options من الوحدة.
2. يحصل على child options وفق نوع الأب: category أو collection.
3. يعرض التفاصيل من نموذج camelCase Typed.
4. قبل قراءة أو حفظ Product Style يتحقق الخادم من العلاقة بواسطة `resolveLegacyProductSelection`.
5. اسم الملف القديم `<mainId>__<childId>.json` باقٍ للتوافق، لكن المعرفين يجب أن يمثلا علاقة صالحة.

`doctor-appointment` خيار عرض افتراضي وليس Product Style نهائيًا؛ يجب اختيار تخصص طبي حقيقي لإنشاء منتج. Delivery Services لا يظهر في خيارات المنتجات.

ممنوع داخل الأداة استخدام `category_id` أو `original_id` أو `sub_collection` أو قراءة ملفات JSON.
