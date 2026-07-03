# Category Display System

## مصدر العرض

كل أسطح العرض تعتمد على `@/features/categories`. لا تقرأ المكونات JSON ولا تكوّن المجموعات أو Doctor Appointment بنفسها.

## الأسطح

- Splash وHome يستقبلان `CategoryDisplay[]` من الصفحة الخادمة ويستخدمان `imageUrl` الجاهز.
- `/categories/[categoryId]` يحل `CategoryTree` قبل الرسم ويستخدم `notFound()` عند غياب التصنيف.
- `/collections/[collectionId]` يحل `CollectionDisplay` قبل الرسم.
- البحث داخل القوائم فقط هو Client-side.
- الملف الشخصي يستخدم `getProfileMainOptions` و`getProfileSubOptions`.
- محدد المطور يستخدم catalog وoptions Typed من الوحدة ولا يقرأ المصدر.

## الصور

الإسقاط العام يعيد `imageUrl`. لا يجوز للمستهلك تخمين ما إذا كانت الصورة تحت `mainCategories` أو `subCategories`.

## Medical Services

تعرض القائمة الأولى عقدة `virtual:doctor-appointment`. الضغط عليها يضيف `?view=doctor-appointment` ويعرض التخصصات الحقيقية. زر الرجوع يزيل المعامل. العقدة الافتراضية ليست اختيارًا محفوظًا.

## Collections

تُبنى المجموعة داخل الوحدة من أعضائها بعد تحقق اتساق الاسم والصورة. رابط المجموعة مستقل عن رابط التصنيف، وعضو المجموعة يفتح صفحة تصنيفه الحقيقي.

## Static export

`generateStaticParams` يأخذ التصنيفات والمجموعات من الوحدة. يقوم `scripts/build-static.ts` بنسخ ملفات `public/catagory` كأصول فقط؛ ولا يفسر محتواها أو يستخدمها كمصدر أعمال ثانٍ.
