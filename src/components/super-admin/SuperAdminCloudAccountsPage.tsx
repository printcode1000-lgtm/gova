"use client";

import * as React from "react";
import { Cloud } from "lucide-react";

import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 text-xl font-semibold text-on-surface">{children}</h2>
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
    <div className="mt-3 overflow-x-auto rounded-lg border bg-surface">
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  );
}

export function SuperAdminCloudAccountsPage() {
  const { session, isLoading } = useSession();
  const allowed = !isLoading && isSuperAdmin(session);

  if (isLoading) {
    return <div className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>;
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          هذه الصفحة متاحة للسوبر أدمن فقط.
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-2 p-4 pb-24" dir="rtl">
      <header className="flex flex-wrap items-center gap-3">
        <Cloud className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">
            الحسابات السحابية
          </h1>
          <p className="text-sm text-on-surface-variant">
            كل حساب خارجي يُنشر عليه المشروع أو يخزّن فيه بياناته: ما هو
            الغرض منه، وما الذي يحتويه فعليًا.
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
            <th className="p-3 text-start">المزوّد</th>
            <th className="p-3 text-start">عدد الحسابات</th>
            <th className="p-3 text-start">يحتوي على</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t">
            <td className="p-3">Vercel</td>
            <td className="p-3">5</td>
            <td className="p-3">نشرة واحدة لكل حساب</td>
          </tr>
          <tr className="border-t">
            <td className="p-3">Turso</td>
            <td className="p-3">5</td>
            <td className="p-3">21 قاعدة بيانات، 70 جدول تطبيق</td>
          </tr>
          <tr className="border-t">
            <td className="p-3">Cloudflare R2</td>
            <td className="p-3">2</td>
            <td className="p-3">2 buckets (حاويات تخزين)</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        الرقم خمسة ليس صدفة: <strong>حساب Vercel واحد لكل نشرة، وبياناته على
        حساب Turso الخاص به.</strong> فهرس منتجات مزدحم لا يمكن أن يستهلك
        الحصة التي تخدم تسجيل الدخول، وموجة إشعارات كبيرة لا يمكن أن تستهلك
        أيًا منهما.
      </Note>

      <SectionTitle>Vercel — خمسة حسابات</SectionTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-3 text-start">الحساب</th>
            <th className="p-3 text-start">المشروع</th>
            <th className="p-3 text-start">البريد الإلكتروني</th>
            <th className="p-3 text-start">يخدم</th>
            <th className="p-3 text-start">GitHub</th>
            <th className="p-3 text-start">يُحدَّث بواسطة</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">hesham-101</td>
            <td className="p-3" dir="ltr">gova</td>
            <td className="p-3" dir="ltr">print.code.1000@gmail.com</td>
            <td className="p-3">
              كل ما لم يُذكر أدناه: جميع عمليات الكتابة،{" "}
              <span dir="ltr">GET /api/orders/:id</span>، تقييمات وخصومات
              البروفايل، ولوحة السوبر أدمن
            </td>
            <td className="p-3">
              <strong>متصل</strong> — كل push يعيد النشر
            </td>
            <td className="p-3">push إلى GitHub</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">101-0902</td>
            <td className="p-3" dir="ltr">asol-notifications</td>
            <td className="p-3" dir="ltr">bs.bid.story@gmail.com</td>
            <td className="p-3">توزيع الإشعارات فقط</td>
            <td className="p-3">غير متصل</td>
            <td className="p-3" dir="ltr">npm run notifications:deploy</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">حساب المنتجات</td>
            <td className="p-3" dir="ltr">asol-products</td>
            <td className="p-3" dir="ltr">gnagnahesham@gmail.com</td>
            <td className="p-3">قراءة المنتجات</td>
            <td className="p-3">غير متصل</td>
            <td className="p-3" dir="ltr">npm run products:deploy</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">حساب الطلبات</td>
            <td className="p-3" dir="ltr">asol-orders</td>
            <td className="p-3" dir="ltr">tenderx10@gmail.com</td>
            <td className="p-3">
              <span dir="ltr">GET /api/orders</span> (القائمة فقط)
            </td>
            <td className="p-3">غير متصل</td>
            <td className="p-3" dir="ltr">npm run orders:deploy</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">حساب البروفايلات</td>
            <td className="p-3" dir="ltr">asol-profiles</td>
            <td className="p-3" dir="ltr">hesham10125@gmail.com</td>
            <td className="p-3">خمس قراءات بروفايل</td>
            <td className="p-3">غير متصل</td>
            <td className="p-3" dir="ltr">npm run profiles:deploy</td>
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
      <pre className="mt-3 overflow-x-auto rounded-lg border bg-surface p-4 text-xs leading-6" dir="ltr">
{`                          browser
        ╱───────────────────┼───────────────────╲
       ╱                    │                    ╲
  gova ◄── service-bridge ──┼──► asol-products
       ╲                    │    asol-orders
        ╲                   │    asol-profiles
         ╲── notification-bridge ──► asol-notifications`}
      </pre>
      <Note>
        <span dir="ltr">gova</span> هو الوحيد المتصل بـ GitHub. الحسابات
        الأربعة الأخرى تُحدَّث حصريًا بأمر طرفي (terminal) يرفع مجلدًا واحدًا
        — <span dir="ltr">services/&lt;name&gt;/</span> — ولا شيء آخر في
        المستودع يغادر الجهاز.
      </Note>

      <SectionTitle>Turso — خمسة حسابات، 21 قاعدة بيانات</SectionTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-3 text-start">الحساب</th>
            <th className="p-3 text-start">قواعد البيانات</th>
            <th className="p-3 text-start">البريد الإلكتروني</th>
            <th className="p-3 text-start">النطاق</th>
            <th className="p-3 text-start">يُقرأ بواسطة</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">hesham101</td>
            <td className="p-3">3</td>
            <td className="p-3" dir="ltr">print.code.1000@gmail.com</td>
            <td className="p-3">
              المستخدمون والمصادقة، الإعلانات، عمليات النظام
            </td>
            <td className="p-3" dir="ltr">gova</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">hesham102</td>
            <td className="p-3">1</td>
            <td className="p-3" dir="ltr">bs.bid.story@gmail.com</td>
            <td className="p-3">الإشعارات</td>
            <td className="p-3" dir="ltr">gova + asol-notifications</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">hesham103</td>
            <td className="p-3">1</td>
            <td className="p-3" dir="ltr">gnagnahesham@gmail.com</td>
            <td className="p-3">المنتجات</td>
            <td className="p-3" dir="ltr">gova + asol-products</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">hesham104</td>
            <td className="p-3">9</td>
            <td className="p-3" dir="ltr">tenderx10@gmail.com</td>
            <td className="p-3">شظايا طلبات السوق (marketplace order shards)</td>
            <td className="p-3" dir="ltr">gova + asol-orders</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">hesham105</td>
            <td className="p-3">7</td>
            <td className="p-3" dir="ltr">hesham10125@gmail.com</td>
            <td className="p-3">شظايا البروفايل (profile shards)</td>
            <td className="p-3" dir="ltr">gova + asol-profiles</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        <span dir="ltr">gova</span> يحمل كل اعتماد (credential)، لأن الكتابة
        والقراءات من طرف الخادم تعبر النطاقات. كل نشرة للقراءة فقط تحمل{" "}
        <strong>فقط</strong> الشظايا التي تخدمها.
      </Note>

      <SubTitle>hesham101 — 3 قواعد بيانات</SubTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-3 text-start">قاعدة البيانات</th>
            <th className="p-3 text-start">الجداول</th>
            <th className="p-3 text-start">المحتوى</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">allusers</td>
            <td className="p-3">6</td>
            <td className="p-3">
              <span dir="ltr">users</span>، استرجاع كلمة المرور، أعلام
              الميزات (feature flags)، إصدارات OTA وسجل التدقيق
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">advertisements</td>
            <td className="p-3">4</td>
            <td className="p-3">
              شريط البطل (hero slider)، الشريط المميز، شريط الأكثر رواجًا
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">system-ops</td>
            <td className="p-3">9</td>
            <td className="p-3">
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

      <SectionTitle>Cloudflare R2 — حسابان</SectionTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-3 text-start"> </th>
            <th className="p-3 text-start">عام</th>
            <th className="p-3 text-start">المنتجات</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-3">المتغيرات</td>
            <td className="p-3" dir="ltr">R2_*</td>
            <td className="p-3" dir="ltr">PRODUCT_R2_*</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">البريد الإلكتروني</td>
            <td className="p-3" dir="ltr">print.code.1000@gmail.com</td>
            <td className="p-3" dir="ltr">bids.stories@gmail.com</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">الحساب</td>
            <td className="p-3" dir="ltr">8486fdbb…3e043</td>
            <td className="p-3" dir="ltr">166409f3…d3e08</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">الحاوية (Bucket)</td>
            <td className="p-3" dir="ltr">pic1</td>
            <td className="p-3" dir="ltr">gova-storage</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">معرّف المزوّد</td>
            <td className="p-3" dir="ltr">CloudflareR2</td>
            <td className="p-3" dir="ltr">CloudflareR2Products</td>
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle>ما الذي يحدد وجهة كل ملف</SubTitle>
      <Note>
        <span dir="ltr">src/config/storage-profiles.json</span>، ولا شيء
        آخر:
      </Note>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-3 text-start">الملف الشخصي (Profile)</th>
            <th className="p-3 text-start">الحساب</th>
            <th className="p-3 text-start">مجلد السحابة</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">avatar</td>
            <td className="p-3">عام</td>
            <td className="p-3" dir="ltr">images/profile/avatars</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">cover</td>
            <td className="p-3">عام</td>
            <td className="p-3" dir="ltr">images/profile/covers</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">home-hero-slider</td>
            <td className="p-3">عام</td>
            <td className="p-3" dir="ltr">images/content/advertisements/…</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">spicialOrder</td>
            <td className="p-3">عام</td>
            <td className="p-3" dir="ltr">images/content/spicialOrder</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3" dir="ltr">product-default</td>
            <td className="p-3">
              <strong>المنتجات</strong>
            </td>
            <td className="p-3" dir="ltr">images/products</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        ملف تعريف واحد بالضبط يشير إلى حساب المنتجات، واختبار تعاقدي (contract
        test) يتحقق أن تلك القائمة{" "}
        <strong>تساوي</strong> <span dir="ltr">["product-default"]</span> بالضبط.
      </Note>
      <Note>
        في بيئة التطوير لا يُستخدم أي من الحسابين: دالة{" "}
        <span dir="ltr">resolveStorageProvider</span> تُرجع{" "}
        <span dir="ltr">LocalStorage</span> بغض النظر عن الملف الشخصي.
      </Note>

      <SubTitle>المحتوى الحالي</SubTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-3 text-start">الحاوية</th>
            <th className="p-3 text-start">العناصر</th>
            <th className="p-3 text-start">الحجم</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-3">
              <span dir="ltr">pic1</span> (عام)
            </td>
            <td className="p-3">3,467 صورة OTA وبروفايل</td>
            <td className="p-3" dir="ltr">~61 MB</td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">
              <span dir="ltr">gova-storage</span> (منتجات)
            </td>
            <td className="p-3">4</td>
            <td className="p-3" dir="ltr">0.63 MB</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        الحاوية العامة تحمل أيضًا إصدارات OTA: البيان الحالي وشجرة الملفات،
        ثلاث نسخ سابقة، وحزم نقل الإصدار الحالي.
      </Note>
      <Note>
        حاوية المنتجات تحمل صور المنتجات <strong>بالإضافة إلى استثناءين
        متعمدين</strong> — <span dir="ltr">app-updates/manifest.json</span>{" "}
        و <span dir="ltr">app-updates/revocations.json</span>. نسخة المتجر
        المبنية تحمل رابط البيان القديم مُدمجًا فيها، لذا تُنسخ هاتان
        الوثيقتان هناك حتى يصدر إصدار متجر مبني على النطاق الحالي وينتشر بين
        المستخدمين. كل شيء آخر ما زال يُحمَّل من الحساب العام.
      </Note>

      <SubTitle>قراءة صورة ليست عملية على مستوى الحساب</SubTitle>
      <Note>
        <span dir="ltr">R2_API_TOKEN</span> و{" "}
        <span dir="ltr">PRODUCT_R2_API_TOKEN</span> تُستخدمان لإنشاء الحاويات
        وكتابة سياسة CORS. تحويل مفتاح إلى رابط هو معالجة نصوص بحتة، والتحقق
        من الوجود يحتاج فقط زوج S3 — لذا مسارات القراءة تستخدم أدوات وصول
        ضيقة، ولا يملك أي من <span dir="ltr">asol-products</span> أو{" "}
        <span dir="ltr">asol-profiles</span> رمز دخول API.
      </Note>

      <SectionTitle>أين تعيش الاعتمادات (credentials)</SectionTitle>
      <Note>لا شيء هنا هو مخزن أسرار. كل قيمة هي متغير بيئة:</Note>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-3 text-start">النطاق</th>
            <th className="p-3 text-start">المتغيرات</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-3">تشغيل Turso</td>
            <td className="p-3" dir="ltr">
              TURSO_*_DATABASE_URL / _AUTH_TOKEN، ولكل شظية{" "}
              &lt;SHARD&gt;_DATABASE_*
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">منصة Turso</td>
            <td className="p-3" dir="ltr">
              TURSO_*_API_TOKEN، TURSO_*_ORGANIZATION — للسكربتات فقط
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">Vercel</td>
            <td className="p-3" dir="ltr">
              VERCEL_TOKEN، VERCEL_NOTIFICATIONS_TOKEN،
              VERCEL_PRODUCTS_TOKEN، VERCEL_ORDERS_TOKEN،
              VERCEL_PROFILES_TOKEN
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">R2</td>
            <td className="p-3" dir="ltr">
              R2_*، PRODUCT_R2_*، وASOL_OTA_LEGACY_R2_* للنسخة المرآة
            </td>
          </tr>
          <tr className="border-t align-top">
            <td className="p-3">نطاقات آمنة للعميل</td>
            <td className="p-3" dir="ltr">
              NEXT_PUBLIC_ASOL_{"{"}NOTIFICATIONS,PRODUCTS,ORDERS,PROFILES{"}"}_URL
            </td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        <span dir="ltr">npm run db:push:vercel-env</span> يدفع مجموعة متغيرات
        طرف الخادم إلى مشروع <span dir="ltr">gova</span>. كل سكربت نشر خدمة
        يدفع فقط ما يحتاجه ذلك الحساب.
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
