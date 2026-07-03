# Category Module Architecture

## العقد المعماري

`src/features/categories` هو المالك الوحيد لبيانات التصنيفات. لا يجوز لأي مكوّن أو خدمة أو مستودع قراءة أو استيراد `categories.json` أو `subcategories.json` مباشرة. الاستيراد العام الوحيد المسموح به هو:

```ts
import { categoryService, type CategoryDisplay } from "@/features/categories";
```

ملفات المصدر الرسمية هي:

- `public/catagory/categories.json`
- `public/catagory/subcategories.json`

يبقى اسم `catagory` مؤقتًا للتوافق مع الحزم الثابتة وOTA القائمة. لا توجد نسخة بيانات ثانية تحت `src/data`.

## مسار البيانات

```text
canonical JSON
  -> infrastructure/raw-data.loader.ts
  -> RawCategory / RawSubcategory
  -> runtime validation
  -> mapRawCategory / mapRawSubcategory
  -> domain Category / Subcategory
  -> CategoryService projections
  -> application consumers
```

حقول snake_case محصورة في `infrastructure`. كل ما يخرج من الوحدة يستخدم camelCase وأنواعًا صريحة.

## الهوية

- تصنيف: `category:<id>`
- مجموعة: `collection:<id>`
- عضو مجموعة: `collection-member:<collectionId>:<id>`
- تصنيف فرعي: `subcategory:<categoryId>:<originalId>`
- مجموعة افتراضية: `virtual:doctor-appointment`

رقم `originalId` فريد داخل التصنيف الأب فقط، وليس عالميًا. هوية المجموعة مستقلة عن هوية التصنيف حتى إذا تساوى الرقمان.

## Doctor Appointment

هو عقدة عرض افتراضية غير قابلة للحفظ أو إنشاء منتج. فتحها يعرض العناصر الطبية الحقيقية التي قيمة `subCollection` لها تساوي صفرًا. الذي يُحفظ هو `originalId` الحقيقي لكل تخصص. لا تستخدم الوحدة معرفات سالبة.

## Delivery Services

السجل 46 موجود في المصدر الرسمي مرة واحدة. يستبعد من سوق الصفحة الرئيسية ومحدد المنتجات، ويضاف إلى خيارات تخصصات الملف الشخصي مباشرة دون قائمة فرعية. لا تنشئ الوحدة نسخة اصطناعية منه.

## API العام

يوفر `CategoryService` إسقاطات Typed للصفحة الرئيسية، الأشجار، المجموعات، الملف الشخصي، محدد المطور، أعمدة التخصصات، والاختيارات العشوائية. كما يوفر `resolveSelection` و`resolveLegacyProductSelection` للتحقق من علاقة الأب والابن قبل حفظ المنتجات أو إعدادات تصميمها.

لا يعيد API العام Raw DTOs ولا يحتوي على `getAllForSpecialties`.

## حدود العميل والخادم

المحمّل يستخدم JSON imports متوافقة مع البناء ولا يعتمد على `fs` في مسار تشغيل التطبيق. لذلك يمكن للواجهات استهلاك الإسقاطات العامة دون تسريب قارئ ملفات Node إلى حزمة العميل. عمليات فحص وجود الصور تبقى في سكربت التحقق فقط.

## التحقق والاختبارات

```bash
npm run category:validate
npm run test:categories
npm run architecture:check
npm run typecheck
```

يفحص محرك التحقق البنية، المعرفات المكررة، علاقة الأب، `originalId` المركبة، metadata المجموعات، الحقول المطلوبة، ومسارات الصور. يمنع فحص المعمارية الوصول المباشر للـJSON أو الحقول الخام أو استيراد تفاصيل الوحدة.
