"use client";

// ⚠️ SECURITY WARNING: This is a client-side component
// Do NOT include any secret references or environment variable names directly
// All secrets must only be referenced in server-side config files
// Use descriptive text instead of exact variable names to avoid security violations

import * as React from "react";
import { Cloud } from "lucide-react";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 text-lg font-semibold text-on-surface sm:text-xl">{children}</h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 text-base font-semibold text-on-surface">
      {children}
    </h3>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-7 text-on-surface-variant">
      {children}
    </p>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    // `min-w` sets the width the table is allowed to scroll to; it does not stop cells
    // from pushing past it. Account ids, S3 endpoints and r2.dev URLs are single
    // unbroken tokens of 30–50 characters, so without `break-words` every table here
    // laid itself out around two thousand pixels wide and the horizontal scroll became
    // the only way to read any of it. Wrapping them brings each table back to its
    // declared width, and the scroll back to the short nudge it was meant to be.
    <div className="mt-3 overflow-x-auto rounded-lg border bg-surface">
      <table className="w-full min-w-[520px] text-xs [&_td]:break-words [&_th]:break-words sm:min-w-[640px] sm:text-sm">
        {children}
      </table>
    </div>
  );
}

export function SuperAdminCloudAccountsContent() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-2 p-4 pb-24" dir="rtl">
      <header className="flex flex-wrap items-center gap-3">
        <Cloud className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold text-on-surface sm:text-2xl">
            الحسابات السحابية
          </h1>
          <p className="text-sm text-on-surface-variant">
            سبعة حسابات Vercel وخمسة Turso وأربعة R2.{" "}
            <span dir="ltr">submain</span> للبحث والسلة وإنشاء الطلبات؛{" "}
            <span dir="ltr">sub2main</span> لكتابات البائع (بروفايل، منتجات،
            تخزين). الأسرار في <span dir="ltr">.env.local</span> والنسخ
            الاحتياطي المشفّر فقط — لا في Git.
          </p>
        </div>
      </header>

      <Note>
        تم التحقق من هذه القائمة مباشرة مقابل واجهة برمجة كل مزوّد. لا يظهر
        هنا أي رمز دخول أو مفتاح أو سر — راجع صفحة متغيرات البيئة في التوثيق
        لمعرفة أي متغير يحمل أي قيمة.
      </Note>

      <SectionTitle>نظرة عامة</SectionTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3">المزوّد</th>
            <th className="p-2 text-start sm:p-3">عدد الحسابات</th>
            <th className="p-2 text-start sm:p-3">يحتوي على</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="p-2 sm:p-3">Vercel</td>
            <td className="p-2 sm:p-3">7</td>
            <td className="p-2 sm:p-3">نشرة واحدة لكل حساب</td>
          </tr>
          <tr className="border-t">
            <td className="p-2 sm:p-3">Turso</td>
            <td className="p-2 sm:p-3">5</td>
            <td className="p-2 sm:p-3">21 قاعدة بيانات، 70 جدول تطبيق</td>
          </tr>
          <tr className="border-t">
            <td className="p-2 sm:p-3">Cloudflare R2</td>
            <td className="p-2 sm:p-3">4</td>
            <td className="p-2 sm:p-3">4 حاويات منفصلة تماماً</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        الرقم سبعة لحسابات Vercel: <strong>حساب واحد لكل نشرة.</strong>{" "}
        <span dir="ltr">gova</span> هو التطبيق الكامل عبر GitHub؛ الستة
        الباقية خدمات معزولة تُنشر من{" "}
        <span dir="ltr">services/&lt;name&gt;/</span> عبر أوامر طرفية — بما فيها{" "}
        <span dir="ltr">submain</span> (بحث وسلة وطلبات) و{" "}
        <span dir="ltr">sub2main</span> (كتابات البائع). الجسر (bridge) في
        المتصفح يوجّه الطلبات؛ لا يوجد اتصال خادم-إلى-خادم بين الحسابات.
      </Note>

      <SectionTitle>Vercel — سبعة حسابات</SectionTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3">الحساب</th>
            <th className="p-2 text-start sm:p-3">المشروع</th>
            <th className="p-2 text-start sm:p-3">البريد الإلكتروني</th>
            <th className="p-2 text-start sm:p-3">يخدم</th>
            <th className="p-2 text-start sm:p-3">GitHub</th>
            <th className="p-2 text-start sm:p-3">يُحدَّث بواسطة</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">hesham-101</td>
            <td className="p-2 sm:p-3" dir="ltr">gova</td>
            <td className="p-2 sm:p-3" dir="ltr">print.code.1000@gmail.com</td>
            <td className="p-2 sm:p-3">
              التطبيق الكامل: كل ما لم يُوجَّه للجسر — تفاصيل الطلب{" "}
              <span dir="ltr">GET /api/orders/:id</span>، تقييمات البروفايل،
              ولوحة السوبر أدمن
            </td>
            <td className="p-2 sm:p-3">
              <strong>متصل</strong> — كل push يعيد النشر
            </td>
            <td className="p-2 sm:p-3">push إلى GitHub</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">submain</td>
            <td className="p-2 sm:p-3" dir="ltr">asol-submain</td>
            <td className="p-2 sm:p-3" dir="ltr">groupstenderximages@gmail.com</td>
            <td className="p-2 sm:p-3">
              البحث في المنتجات والبائعين، إنشاء الطلب من السلة أو من
              البروفايل —{" "}
              <span dir="ltr">/api/search/*</span>،{" "}
              <span dir="ltr">POST /api/orders/from-cart</span>،{" "}
              <span dir="ltr">POST /api/orders/custom-request-from-profile</span>
            </td>
            <td className="p-2 sm:p-3">غير متصل</td>
            <td className="p-2 sm:p-3" dir="ltr">npm run submain:deploy</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">sub2main</td>
            <td className="p-2 sm:p-3" dir="ltr">asol-sub2main</td>
            <td className="p-2 sm:p-3" dir="ltr">tenderx.engineer100@gmail.com</td>
            <td className="p-2 sm:p-3">
              كتابات البائع: إنشاء/تعديل/حذف المنتجات، تحديث البروفايل
              والخصومات، رفع الصور، كتالوج الصيدلية — عبر جسر المتصفح فقط
            </td>
            <td className="p-2 sm:p-3">غير متصل</td>
            <td className="p-2 sm:p-3" dir="ltr">npm run sub2main:deploy</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">101-0902</td>
            <td className="p-2 sm:p-3" dir="ltr">asol-notifications</td>
            <td className="p-2 sm:p-3" dir="ltr">bs.bid.story@gmail.com</td>
            <td className="p-2 sm:p-3">توزيع الإشعارات فقط</td>
            <td className="p-2 sm:p-3">غير متصل</td>
            <td className="p-2 sm:p-3" dir="ltr">npm run notifications:deploy</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">حساب المنتجات</td>
            <td className="p-2 sm:p-3" dir="ltr">asol-products</td>
            <td className="p-2 sm:p-3" dir="ltr">gnagnahesham@gmail.com</td>
            <td className="p-2 sm:p-3">قراءة المنتجات</td>
            <td className="p-2 sm:p-3">غير متصل</td>
            <td className="p-2 sm:p-3" dir="ltr">npm run products:deploy</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">حساب الطلبات</td>
            <td className="p-2 sm:p-3" dir="ltr">asol-orders</td>
            <td className="p-2 sm:p-3" dir="ltr">tenderx10@gmail.com</td>
            <td className="p-2 sm:p-3">
              <span dir="ltr">GET /api/orders</span> (القائمة فقط)
            </td>
            <td className="p-2 sm:p-3">غير متصل</td>
            <td className="p-2 sm:p-3" dir="ltr">npm run orders:deploy</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">حساب البروفايلات</td>
            <td className="p-2 sm:p-3" dir="ltr">asol-profiles</td>
            <td className="p-2 sm:p-3" dir="ltr">hesham10125@gmail.com</td>
            <td className="p-2 sm:p-3">خمس قراءات بروفايل</td>
            <td className="p-2 sm:p-3">غير متصل</td>
            <td className="p-2 sm:p-3" dir="ltr">npm run profiles:deploy</td>
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle>القاعدة التي تجعل هذا يعمل</SubTitle>
      <Note>
        <strong>لا يجوز لأي نشرة استدعاء نشرة أخرى.</strong> لا تملك أي نشرة
        رابط نشرة أخرى، ولا يوجد لديها مسار برمجي يصل إليها. كل عبور يمر عبر
        وحدة جسر (bridge) لا تُنشر على أي حساب إطلاقًا — بل تعمل داخل متصفح
        المستخدم:
      </Note>
      <pre className="mt-3 overflow-x-auto rounded-lg border bg-surface p-3 text-[10px] leading-5 sm:p-4 sm:text-xs sm:leading-6" dir="ltr">
{`                          browser
        ╱───────────────────┼───────────────────╲
       ╱                    │                    ╲
  gova ◄── service-bridge ──┼──► asol-products
       ╲                    │    asol-orders
        ╲                   │    asol-profiles
         ╲── notification-bridge ──► asol-notifications
         ╲── account-bridge ──► asol-submain   (search, cart, orders)
          ╲── account-bridge ──► asol-sub2main (seller writes, uploads)`}
      </pre>
      <Note>
        <span dir="ltr">gova</span> هو الوحيد المتصل بـ GitHub. الحسابات الستة
        الأخرى تُحدَّث حصريًا بأوامر نشر طرفية — كل واحد يرفع مجلدًا واحدًا
        فقط: <span dir="ltr">services/&lt;name&gt;/</span> (بما فيها{" "}
        <span dir="ltr">submain</span> و<span dir="ltr">sub2main</span>).
      </Note>

      <SectionTitle>Turso — خمسة حسابات، 21 قاعدة بيانات</SectionTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3">الحساب</th>
            <th className="p-2 text-start sm:p-3">قواعد البيانات</th>
            <th className="p-2 text-start sm:p-3">البريد الإلكتروني</th>
            <th className="p-2 text-start sm:p-3">النطاق</th>
            <th className="p-2 text-start sm:p-3">يُقرأ بواسطة</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">hesham101</td>
            <td className="p-2 sm:p-3">3</td>
            <td className="p-2 sm:p-3" dir="ltr">print.code.1000@gmail.com</td>
            <td className="p-2 sm:p-3">
              المستخدمون والمصادقة، الإعلانات، عمليات النظام
            </td>
            <td className="p-2 sm:p-3" dir="ltr">gova + submain + sub2main</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">hesham102</td>
            <td className="p-2 sm:p-3">1</td>
            <td className="p-2 sm:p-3" dir="ltr">bs.bid.story@gmail.com</td>
            <td className="p-2 sm:p-3">الإشعارات</td>
            <td className="p-2 sm:p-3" dir="ltr">gova + asol-notifications</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">hesham103</td>
            <td className="p-2 sm:p-3">1</td>
            <td className="p-2 sm:p-3" dir="ltr">gnagnahesham@gmail.com</td>
            <td className="p-2 sm:p-3">المنتجات</td>
            <td className="p-2 sm:p-3" dir="ltr">gova + asol-products + sub2main</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">hesham104</td>
            <td className="p-2 sm:p-3">9</td>
            <td className="p-2 sm:p-3" dir="ltr">tenderx10@gmail.com</td>
            <td className="p-2 sm:p-3">شظايا طلبات السوق (marketplace order shards)</td>
            <td className="p-2 sm:p-3" dir="ltr">gova + asol-orders + submain</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">hesham105</td>
            <td className="p-2 sm:p-3">7</td>
            <td className="p-2 sm:p-3" dir="ltr">hesham10125@gmail.com</td>
            <td className="p-2 sm:p-3">شظايا البروفايل (profile shards)</td>
            <td className="p-2 sm:p-3" dir="ltr">gova + asol-profiles + sub2main</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        <span dir="ltr">gova</span> و<span dir="ltr">submain</span> يحملان
        اعتمادات التشغيل الكاملة. <span dir="ltr">sub2main</span> يحمل
        اعتمادات المنتجات وشظايا البروفايل والمستخدمين لكتابات البائع. كل
        نشرة للقراءة فقط تحمل <strong>فقط</strong> الشظايا التي تخدمها.
      </Note>

      <SubTitle>hesham101 — 3 قواعد بيانات</SubTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3">قاعدة البيانات</th>
            <th className="p-2 text-start sm:p-3">الجداول</th>
            <th className="p-2 text-start sm:p-3">المحتوى</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">allusers</td>
            <td className="p-2 sm:p-3">6</td>
            <td className="p-2 sm:p-3">
              <span dir="ltr">users</span>، استرجاع كلمة المرور، أعلام
              الميزات (feature flags)، إصدارات OTA وسجل التدقيق
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">advertisements</td>
            <td className="p-2 sm:p-3">4</td>
            <td className="p-2 sm:p-3">
              شريط البطل (hero slider)، الشريط المميز، شريط الأكثر رواجًا
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">system-ops</td>
            <td className="p-2 sm:p-3">9</td>
            <td className="p-2 sm:p-3">
              <span dir="ltr">system_logs</span>،{" "}
              <span dir="ltr">data_health_*</span>
            </td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        <span dir="ltr">system-ops</span> انفصلت عن نفس مصدر{" "}
        <span dir="ltr">profile.db</span> الذي جاءت منه شظايا البروفايل، لكنها{" "}
        <strong>لم تنتقل إلى hesham105</strong>: فهي تحمل سجلات تشغيلية، لا
        بيانات بروفايل.
      </Note>

      <SubTitle>hesham102 — الإشعارات</SubTitle>
      <Note>
        <span dir="ltr">asol-notifications</span> · 3 جداول —{" "}
        <span dir="ltr">user_notification_tokens</span>،{" "}
        <span dir="ltr">user_notification_preferences</span>، بالإضافة إلى
        سجلات drizzle الداخلية.
      </Note>
      <Note>
        حركة الإشعارات هي طلب واحد لكل جهاز عبر مزوّد الدفع — أكثر الأحمال
        انفجارًا (burstiest) في النظام، ومعزولة حتى لا تستهلك أبدًا الحصة
        التي تخدم تسجيل الدخول.
      </Note>
      <Note>
        <span dir="ltr">user_notification_tokens.uid</span> يرتبط منطقيًا
        بـ <span dir="ltr">users.uid</span>، لكنهما على حسابين مختلفين، لذا{" "}
        <strong>لا يجوز عمل JOIN بينهما</strong>. المستودع{" "}
        <span dir="ltr">BroadcastRecipientRepository</span> يقرأ الرموز أولًا،
        ثم يبحث فقط عن تلك المعرّفات ويدمجها في الذاكرة.
      </Note>

      <SubTitle>hesham103 — المنتجات</SubTitle>
      <Note>
        <span dir="ltr">asol-products</span> · 8 جداول —{" "}
        <span dir="ltr">products</span>، تقييمات المنتجات وردودها، تجاوزات
        بروفايل الصيدليات.
      </Note>
      <Note>عرض الفهرس والبحث هما أعلى الاستعلامات حجمًا في النظام.</Note>

      <SubTitle>hesham104 — 9 شظايا طلبات</SubTitle>
      <Note>
        <span dir="ltr">orders-core</span> (2) ·{" "}
        <span dir="ltr">orders-items</span> (3) ·{" "}
        <span dir="ltr">orders-fulfillment</span> (2) ·{" "}
        <span dir="ltr">orders-delivery-plans</span> (7) ·{" "}
        <span dir="ltr">orders-shipping-quotes</span> (1) ·{" "}
        <span dir="ltr">orders-payments</span> (1) ·{" "}
        <span dir="ltr">orders-refunds</span> (1) ·{" "}
        <span dir="ltr">orders-after-sales</span> (6) ·{" "}
        <span dir="ltr">orders-disputes-audit</span> (3).
      </Note>
      <Note>
        فقط <span dir="ltr">GET /api/orders</span> انتقل إلى الخدمة. صفحة
        تفاصيل الطلب تُثري الطلب ببيانات اتصال البروفايل وتفاصيل المتجر، وأي
        عملية كتابة تمتد عبر عدة شظايا بالإضافة إلى قواعد بيانات البروفايل
        والمنتج — تقسيم ذلك عبر حسابات مختلفة كان سيحوّل عملية واحدة إلى عدة
        عمليات قد تفشل في منتصف الطريق.
      </Note>

      <SubTitle>hesham105 — 7 شظايا بروفايل</SubTitle>
      <Note>
        <span dir="ltr">profile-core</span> (2) ·{" "}
        <span dir="ltr">profile-contact</span> (3) ·{" "}
        <span dir="ltr">profile-media</span> (1) ·{" "}
        <span dir="ltr">profile-social</span> (4) ·{" "}
        <span dir="ltr">profile-catalog</span> (4) ·{" "}
        <span dir="ltr">profile-promotions</span> (2) ·{" "}
        <span dir="ltr">profile-fulfillment</span> (1).
      </Note>

      <SubTitle>جدول واحد، قاعدة بيانات واحدة</SubTitle>
      <Note>
        <strong>لا يوجد جدول تطبيق واحد في أكثر من قاعدة بيانات.</strong> تم
        التحقق عبر جميع الـ21 قاعدة: 70 جدول تطبيق مميز، بلا أي تداخل.
      </Note>
      <Note>
        <span dir="ltr">__drizzle_migrations</span> هو الاسم الوحيد الذي
        يظهر في أربع قواعد بيانات. إنه سجل drizzle الخاص بالترحيلات (migrations)
        المطبّقة، لا يحمل أي بيانات تطبيق، ومستثنى من هذه القاعدة بالتصميم.
      </Note>

      <SectionTitle>Cloudflare R2 — 4 حسابات</SectionTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3"> </th>
            <th className="p-2 text-start sm:p-3">عام</th>
            <th className="p-2 text-start sm:p-3">المنتجات</th>
            <th className="p-2 text-start sm:p-3">ملابس وحيوانات</th>
            <th className="p-2 text-start sm:p-3">تحديثات OTA</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">المتغيرات</td>
            <td className="p-2 sm:p-3" dir="ltr">R2_*</td>
            <td className="p-2 sm:p-3" dir="ltr">PRODUCT_R2_*</td>
            <td className="p-2 sm:p-3" dir="ltr">APPAREL_PETS_R2_*</td>
            <td className="p-2 sm:p-3" dir="ltr">ASOL_OTA_R2_*</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">الحساب</td>
            <td className="p-2 sm:p-3" dir="ltr">8486fdbb…3e043</td>
            <td className="p-2 sm:p-3" dir="ltr">166409f3…d3e08</td>
            <td className="p-2 sm:p-3" dir="ltr">f08cd5b7…f2642</td>
            <td className="p-2 sm:p-3" dir="ltr">21fce63d…1810</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">البريد الإلكتروني</td>
            <td className="p-2 sm:p-3" dir="ltr">print.code.1000@gmail.com</td>
            <td className="p-2 sm:p-3" dir="ltr">bids.stories@gmail.com</td>
            <td className="p-2 sm:p-3" dir="ltr">hesham.gaber@gmail.com</td>
            <td className="p-2 sm:p-3" dir="ltr">tenderx.engineer100@gmail.com</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">الحاوية (Bucket)</td>
            <td className="p-2 sm:p-3" dir="ltr">pic1</td>
            <td className="p-2 sm:p-3" dir="ltr">gova-storage</td>
            <td className="p-2 sm:p-3" dir="ltr">productcat1</td>
            <td className="p-2 sm:p-3" dir="ltr">ota</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">معرّف المزوّد / الهدف</td>
            <td className="p-2 sm:p-3" dir="ltr">CloudflareR2</td>
            <td className="p-2 sm:p-3" dir="ltr">CloudflareR2Products</td>
            <td className="p-2 sm:p-3" dir="ltr">CloudflareR2_products-apparel-pets</td>
            <td className="p-2 sm:p-3" dir="ltr">ota (R2_STORAGE_TARGETS)</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">العنوان العام</td>
            <td className="p-2 sm:p-3" dir="ltr">pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev</td>
            <td className="p-2 sm:p-3" dir="ltr">pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev</td>
            <td className="p-2 sm:p-3" dir="ltr">pub-de6cc53c347e4e6fa0dea7b79bd0ce3e.r2.dev</td>
            <td className="p-2 sm:p-3" dir="ltr">pub-ee70bc6c84c54d9b8a8ba44c6f7820a9.r2.dev</td>
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle>ما الذي يحدد وجهة كل ملف</SubTitle>
      <Note>
        <span dir="ltr">src/config/storage-profiles.json</span> لملفات الوسائط، ووحدة{" "}
        <span dir="ltr">@asol/ota-core</span> لإصدارات OTA:
      </Note>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3">الملف الشخصي (Profile) / الوحدة</th>
            <th className="p-2 text-start sm:p-3">الحساب</th>
            <th className="p-2 text-start sm:p-3">مجلد السحابة</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">avatar</td>
            <td className="p-2 sm:p-3">عام</td>
            <td className="p-2 sm:p-3" dir="ltr">images/profile/avatars</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">cover</td>
            <td className="p-2 sm:p-3">عام</td>
            <td className="p-2 sm:p-3" dir="ltr">images/profile/covers</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">home-hero-slider</td>
            <td className="p-2 sm:p-3">عام</td>
            <td className="p-2 sm:p-3" dir="ltr">images/content/advertisements/…</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">spicialOrder</td>
            <td className="p-2 sm:p-3">عام</td>
            <td className="p-2 sm:p-3" dir="ltr">images/content/spicialOrder</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">product-default</td>
            <td className="p-2 sm:p-3">
              <strong>المنتجات</strong>
            </td>
            <td className="p-2 sm:p-3" dir="ltr">images/products</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">product-apparel-pets</td>
            <td className="p-2 sm:p-3">
              <strong>ملابس وحيوانات</strong>
            </td>
            <td className="p-2 sm:p-3" dir="ltr">images/products-apparel-pets</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3" dir="ltr">@asol/ota-core</td>
            <td className="p-2 sm:p-3">
              <strong>تحديثات OTA</strong>
            </td>
            <td className="p-2 sm:p-3" dir="ltr">app-updates/</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        بروفايل واحد لكل حساب منتجات:{" "}
        <span dir="ltr">product-default</span> على الحاوية القديمة، و{" "}
        <span dir="ltr">product-apparel-pets</span> لتصنيفي الملابس (1) والحيوانات
        (12) وشرائح أزياء onboarding. الصور القديمة بلا{" "}
        <span dir="ltr">storageProfileId</span> تبقى على الحاوية القديمة بلا ترحيل.
        حساب OTA معزول بالكامل دون أي تداخل أو وراثة ضمنية.
      </Note>
      <Note>
        في بيئة التطوير لا يُستخدم أي من حسابات الوسائط: دالة{" "}
        <span dir="ltr">resolveStorageProvider</span> تُرجع{" "}
        <span dir="ltr">LocalStorage</span> بغض النظر عن الملف الشخصي.
      </Note>

      <SubTitle>المحتوى الحالي للحاويات</SubTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3">الحاوية</th>
            <th className="p-2 text-start sm:p-3">الاستخدام</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">
              <span dir="ltr">pic1</span> (عام)
            </td>
            <td className="p-2 sm:p-3">صور المستخدمين (أفاتار، غلاف) والإعلانات والطلبات الخاصة</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">
              <span dir="ltr">gova-storage</span> (منتجات)
            </td>
            <td className="p-2 sm:p-3">صور المنتجات القديمة وكل التصنيفات عدا الرفع الجديد للملابس/الحيوانات</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">
              <span dir="ltr">productcat1</span> (ملابس وحيوانات)
            </td>
            <td className="p-2 sm:p-3">صور المنتجات الجديدة لتصنيفي الملابس (1) والحيوانات (12) وشرائح أزياء onboarding</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">
              <span dir="ltr">ota</span> (تحديثات التطبيق)
            </td>
            <td className="p-2 sm:p-3">بيان الإصدار (manifest.json) وشجرة الملفات وحزم التحديثات وحالات الإلغاء</td>
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle>قراءة صورة ليست عملية على مستوى الحساب</SubTitle>
      <Note>
        رموز وصول R2 تُستخدمان لإنشاء الحاويات
        وكتابة سياسة CORS. تحويل مفتاح إلى رابط هو معالجة نصوص بحتة، والتحقق
        من الوجود يحتاج فقط زوج S3 — لذا مسارات القراءة تستخدم أدوات وصول
        ضيقة، ولا يملك أي من <span dir="ltr">asol-products</span> أو{" "}
        <span dir="ltr">asol-profiles</span> رمز دخول API. خدمة{" "}
        <span dir="ltr">asol-products</span> تستلم مفاتيح{" "}
        <span dir="ltr">APPAREL_PETS_R2_*</span> العامة/S3 حتى تُحلّ روابط
        صور الملابس والحيوانات.
      </Note>

      <SectionTitle>أين تعيش الاعتمادات (credentials)</SectionTitle>
      <Note>لا شيء هنا هو مخزن أسرار. كل قيمة هي متغير بيئة:</Note>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3">النطاق</th>
            <th className="p-2 text-start sm:p-3">المتغيرات</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">تشغيل Turso</td>
            <td className="p-2 sm:p-3" dir="ltr">
              متغيرات قاعدة بيانات Turso للاتصال بقواعد البيانات المختلفة
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">منصة Turso</td>
            <td className="p-2 sm:p-3" dir="ltr">
              رموز وصول منصة Turso للسكربتات فقط
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">Vercel</td>
            <td className="p-2 sm:p-3" dir="ltr">
              رموز وصول Vercel للنشر والتكامل مع الخدمات المختلفة
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">R2</td>
            <td className="p-2 sm:p-3" dir="ltr">
              متغيرات التخزين على Cloudflare R2
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">نطاقات آمنة للعميل</td>
            <td className="p-2 sm:p-3" dir="ltr">
              عناوين URL العامة للخدمات المختلفة
            </td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        <span dir="ltr">npm run db:push:vercel-env</span> يدفع مجموعة متغيرات
        طرف الخادم إلى مشروع <span dir="ltr">gova</span>. أوامر نشر الخدمات
        (<span dir="ltr">submain:deploy</span>،{" "}
        <span dir="ltr">sub2main:deploy</span>، وغيرها) تزامن فقط ما يحتاجه
        كل حساب — بدون رموز نشر الحسابات الأخرى.
      </Note>
      <Note>
        <strong>القيمة الاحتياطية (fallback) التي تعبر حدود حساب ليست
        قيمة افتراضية — إنها إعادة توجيه صامتة.</strong> إصدارات OTA سقطت
        مرة من <span dir="ltr">ASOL_OTA_R2_*</span> إلى{" "}
        <span dir="ltr">PRODUCT_R2_*</span>، فتراكم 3,463 كائن إصدار على
        الحساب المخصص لصور المنتجات. كل سلسلة كهذه أُزيلت؛ القيمة المفقودة
        الآن تفشل بصوت واضح.
      </Note>
    </main>
  );
}
