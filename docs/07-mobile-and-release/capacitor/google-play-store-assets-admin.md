# Google Play Store Assets Admin

لوحة `/super-admin/google-play-store-assets` أصبحت مركز إصدار كامل للسوبر أدمن في بيئة التطوير فقط. الصفحة مقسمة إلى خمس تبويبات: نظرة عامة، النصوص، الصور، البناء والنشر، والمهام والسجل.

## Overview

تعرض الحزمة `hgh.asol.app`، اللغة الافتراضية، حالة حارس التطوير، مصدر اعتماد Google Play، آخر قراءة، المسارات النشطة، وإصدار OTA الحالي إن كان معروفا.

## Text And Listings

النصوص تدعم تفاصيل المتجر واللغات المتعددة. قبل الاعتماد تظهر Diff بين الحالة الحالية والتعديلات، ويجب تأكيد المراجعة قبل الحفظ. كل عملية حفظ تنشئ نسخة JSON احتياطية في `.backups/google-play-store-assets`.

## Images

الرفع يدعم ملفات متعددة للقطات الشاشة، مع تحقق على العميل والخادم:

- Icon: PNG فقط، 512x512، وحجم لا يتجاوز 1024KB.
- Feature graphic: 1024x500.
- Phone / 7 inch / 10 inch screenshots: كل ضلع بين 320 و3840، والنسبة القصوى 2:1، والحد الأقصى 8 صور لكل نوع.
- PNG أو JPEG فقط.

رسائل الرفض تعرض القيمة الفعلية والمطلوبة بالعربية والإنجليزية.

## Tracks And Release Metadata

الخدمة تدعم قراءة وتحديث مسارات `internal`, `alpha`, `beta`, و`production`، وإرفاق changelogs حسب اللغة، وإدارة staged rollout عبر `userFraction` وحالات `halted` و`completed`، وترقية `versionCode` من مسار إلى آخر بدون إعادة بناء.

## Backups And Restore

يمكن استعراض نسخ `.backups/google-play-store-assets` واستعادة نسخة مختارة. الاستعادة تمر عبر نفس دورة `edit -> commit` في Google Play.
