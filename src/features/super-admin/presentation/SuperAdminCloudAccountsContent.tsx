"use client";

// ⚠️ SECURITY WARNING: This is a client-side component
// Do NOT include any secret references or environment variable names directly
// All secrets must only be referenced in server-side config files
// Use descriptive text instead of exact variable names to avoid security violations

import * as React from "react";
import { Cloud } from "lucide-react";

import { CloudAccountRoutesSection } from "./CloudAccountRoutesSection";
import {
  cloudAccountsGlance,
  tursoDatabaseCount,
  listR2CloudAccounts,
  listVercelCloudAccounts,
  TURSO_CLOUD_ACCOUNTS,
} from "./cloud-accounts-reference";

function SectionTitle({ id, children }: { children: React.ReactNode } & { id?: string }) {
  return (
    <h2 id={id} className="mt-8 text-lg font-semibold text-on-surface sm:text-xl">{children}</h2>
  );
}

function SubTitle({ id, children }: { children: React.ReactNode } & { id?: string }) {
  return (
    <h3 id={id} className="mt-5 text-base font-semibold text-on-surface">
      {children}
    </h3>
  );
}

function Note({ id, children }: { children: React.ReactNode } & { id?: string }) {
  return (
    <p id={id} className="mt-2 text-sm leading-7 text-on-surface-variant">
      {children}
    </p>
  );
}

function TableWrap({ id, children }: { children: React.ReactNode } & { id?: string }) {
  return (
    // `min-w` sets the width the table is allowed to scroll to; it does not stop cells
    // from pushing past it. Account ids, S3 endpoints and r2.dev URLs are single
    // unbroken tokens of 30–50 characters, so without `break-words` every table here
    // laid itself out around two thousand pixels wide and the horizontal scroll became
    // the only way to read any of it. Wrapping them brings each table back to its
    // declared width, and the scroll back to the short nudge it was meant to be.
    <div id={id} className="mt-3 overflow-x-auto rounded-lg border bg-surface">
      <table className="w-full min-w-[520px] text-xs [&_td]:break-words [&_th]:break-words sm:min-w-[640px] sm:text-sm">
        {children}
      </table>
    </div>
  );
}

function abbreviateAccountId(id: string): string {
  if (id.includes("…") || id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-5)}`;
}

function publicHost(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function SuperAdminCloudAccountsContent() {
  const glance = cloudAccountsGlance();
  const vercelAccounts = listVercelCloudAccounts();
  const r2Accounts = listR2CloudAccounts();

  return (
    <main id="super-admin.super-admin-cloud-accounts-content.main" className="mx-auto w-full max-w-5xl space-y-2 p-4 pb-24" dir="rtl">
      <header id="super-admin.super-admin-cloud-accounts-content.header" className="flex flex-wrap items-center gap-3">
        <Cloud id="super-admin.super-admin-cloud-accounts-content.cloud" className="h-6 w-6 text-primary" />
        <div id="super-admin.super-admin-cloud-accounts-content.div">
          <h1 id="super-admin.super-admin-cloud-accounts-content.h1" className="text-xl font-semibold text-on-surface sm:text-2xl">
            الحسابات السحابية
          </h1>
          <p id="super-admin.super-admin-cloud-accounts-content.p" className="text-sm text-on-surface-variant">
            {glance.vercelWord} حسابات Vercel و{glance.tursoWord} Turso و
            {glance.r2Word} R2.{" "}
            <span id="super-admin.super-admin-cloud-accounts-content.span" dir="ltr">submain</span> للبحث والسلة وإنشاء الطلبات؛{" "}
            <span id="super-admin.super-admin-cloud-accounts-content.span.2" dir="ltr">sub2main</span> لكتابات البائع (بروفايل، منتجات،
            تخزين). الأسرار في <span id="super-admin.super-admin-cloud-accounts-content.span.3" dir="ltr">.env.local</span> والنسخ
            الاحتياطي المشفّر فقط — لا في Git.
          </p>
        </div>
      </header>

      <Note id="super-admin.super-admin-cloud-accounts-content.note">
        تم التحقق من هذه القائمة مباشرة مقابل واجهة برمجة كل مزوّد. لا يظهر
        هنا أي رمز دخول أو مفتاح أو سر — راجع صفحة متغيرات البيئة في التوثيق
        لمعرفة أي متغير يحمل أي قيمة. جداول Vercel وR2 تُشتق من إعلانات
        الحزم؛ عند إضافة حساب في الكود تتحدث الصفحة تلقائياً.
      </Note>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title">نظرة عامة</SectionTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap">
        <thead id="super-admin.super-admin-cloud-accounts-content.thead" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr">
            <th id="super-admin.super-admin-cloud-accounts-content.th" className="p-2 text-start sm:p-3">المزوّد</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.2" className="p-2 text-start sm:p-3">عدد الحسابات</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.3" className="p-2 text-start sm:p-3">يحتوي على</th>
          </tr>
        </thead>
        <tbody id="super-admin.super-admin-cloud-accounts-content.tbody">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.2" className="border-t">
            <td id="super-admin.super-admin-cloud-accounts-content.td" className="p-2 sm:p-3">Vercel</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.2" className="p-2 sm:p-3">{glance.vercel}</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.3" className="p-2 sm:p-3">نشرة واحدة لكل حساب</td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.3" className="border-t">
            <td id="super-admin.super-admin-cloud-accounts-content.td.4" className="p-2 sm:p-3">Turso</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.5" className="p-2 sm:p-3">{glance.turso}</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.6" className="p-2 sm:p-3">
              {glance.tursoDatabases} قاعدة بيانات (مجموع الشظايا المعلنة)
            </td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.4" className="border-t">
            <td id="super-admin.super-admin-cloud-accounts-content.td.7" className="p-2 sm:p-3">Cloudflare R2</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.8" className="p-2 sm:p-3">{glance.r2}</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.9" className="p-2 sm:p-3">{glance.r2} حاويات منفصلة تماماً</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.2">
        الرقم {glance.vercelWord} لحسابات Vercel:{" "}
        <strong>حساب واحد لكل نشرة.</strong>{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.4" dir="ltr">gova</span> هو التطبيق الكامل عبر GitHub؛ الباقي
        خدمات معزولة تُنشر من{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.5" dir="ltr">services/&lt;name&gt;/</span> عبر أوامر طرفية — بما فيها{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.6" dir="ltr">submain</span> (بحث وسلة وطلبات) و{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.7" dir="ltr">sub2main</span> (كتابات البائع). الجسر (bridge) في
        المتصفح يوجّه الطلبات؛ لا يوجد اتصال خادم-إلى-خادم بين الحسابات.
      </Note>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title.2">Vercel — {glance.vercelWord} حسابات</SectionTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.2">
        <thead id="super-admin.super-admin-cloud-accounts-content.thead.2" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.5">
            <th id="super-admin.super-admin-cloud-accounts-content.th.4" className="p-2 text-start sm:p-3">الحساب</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.5" className="p-2 text-start sm:p-3">المشروع</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.6" className="p-2 text-start sm:p-3">البريد الإلكتروني</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.7" className="p-2 text-start sm:p-3">يخدم</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.8" className="p-2 text-start sm:p-3">GitHub</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.9" className="p-2 text-start sm:p-3">يُحدَّث بواسطة</th>
          </tr>
        </thead>
        <tbody id="super-admin.super-admin-cloud-accounts-content.tbody.2">
          {vercelAccounts.map((account) => (
            <tr key={account.name} className="border-t align-top">
              <td className="p-2 sm:p-3" dir="ltr">
                {account.accountLabel}
              </td>
              <td className="p-2 sm:p-3" dir="ltr">
                {account.project}
              </td>
              <td className="p-2 sm:p-3" dir="ltr">
                {account.email}
              </td>
              <td className="p-2 sm:p-3">{account.servesAr}</td>
              <td className="p-2 sm:p-3">
                {account.githubConnected ? (
                  <>
                    <strong>متصل</strong> — كل push يعيد النشر
                  </>
                ) : (
                  "غير متصل"
                )}
              </td>
              <td className="p-2 sm:p-3" dir="ltr">
                {account.updatedByAr}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.routes">مسارات كل حساب</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.routes">
        أي حساب يجيب أي طلب. المصدر هو سجل الملكية نفسه الذي يستخدمه موجّه
        العميل وحدّ التوافق في gova، فلا يمكن للصفحة أن تعرض وجهة تخالف الوجهة
        الفعلية. الجرد الكامل لكل طريقة، وأي معالج تشحنه كل خدمة اليوم، في
        <code dir="ltr"> docs/09-agent-knowledge/generated/catalogs/account-routing-catalog.md</code>.
      </Note>
      <CloudAccountRoutesSection id="super-admin.super-admin-cloud-accounts-content.routes-section" />

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title">القاعدة التي تجعل هذا يعمل</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.3">
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
      <Note id="super-admin.super-admin-cloud-accounts-content.note.4">
        <span id="super-admin.super-admin-cloud-accounts-content.span.8" dir="ltr">gova</span> هو الوحيد المتصل بـ GitHub. الحسابات
        الأخرى تُحدَّث حصريًا بأوامر نشر طرفية — كل واحد يرفع مجلدًا واحدًا
        فقط: <span id="super-admin.super-admin-cloud-accounts-content.span.9" dir="ltr">services/&lt;name&gt;/</span> (بما فيها{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.10" dir="ltr">submain</span> و<span id="super-admin.super-admin-cloud-accounts-content.span.11" dir="ltr">sub2main</span>).
      </Note>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title.3">
        Turso — {glance.tursoWord} حسابات، {glance.tursoDatabases} قاعدة بيانات
      </SectionTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.3">
        <thead id="super-admin.super-admin-cloud-accounts-content.thead.3" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.6">
            <th id="super-admin.super-admin-cloud-accounts-content.th.10" className="p-2 text-start sm:p-3">الحساب</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.11" className="p-2 text-start sm:p-3">قواعد البيانات</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.12" className="p-2 text-start sm:p-3">البريد الإلكتروني</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.13" className="p-2 text-start sm:p-3">النطاق</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.14" className="p-2 text-start sm:p-3">يُقرأ بواسطة</th>
          </tr>
        </thead>
        <tbody id="super-admin.super-admin-cloud-accounts-content.tbody.3">
          {TURSO_CLOUD_ACCOUNTS.map((account) => (
            <tr key={account.account} className="border-t align-top">
              <td className="p-2 sm:p-3" dir="ltr">
                {account.account}
              </td>
              <td className="p-2 sm:p-3">{account.databases}</td>
              <td className="p-2 sm:p-3" dir="ltr">
                {account.email}
              </td>
              <td className="p-2 sm:p-3">{account.domainAr}</td>
              <td className="p-2 sm:p-3" dir="ltr">
                {account.readByAr}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.5">
        <span id="super-admin.super-admin-cloud-accounts-content.span.12" dir="ltr">gova</span> و<span id="super-admin.super-admin-cloud-accounts-content.span.13" dir="ltr">submain</span> يحملان
        اعتمادات التشغيل الكاملة. <span id="super-admin.super-admin-cloud-accounts-content.span.14" dir="ltr">sub2main</span> يحمل
        اعتمادات المنتجات وشظايا البروفايل والمستخدمين لكتابات البائع. كل
        نشرة للقراءة فقط تحمل <strong>فقط</strong> الشظايا التي تخدمها.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.2">hesham101 — {tursoDatabaseCount("hesham101")} قواعد بيانات</SubTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.4">
        <thead id="super-admin.super-admin-cloud-accounts-content.thead.4" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.7">
            <th id="super-admin.super-admin-cloud-accounts-content.th.15" className="p-2 text-start sm:p-3">قاعدة البيانات</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.16" className="p-2 text-start sm:p-3">الجداول</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.17" className="p-2 text-start sm:p-3">المحتوى</th>
          </tr>
        </thead>
        <tbody id="super-admin.super-admin-cloud-accounts-content.tbody.4">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.8" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.10" className="p-2 sm:p-3" dir="ltr">allusers</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.11" className="p-2 sm:p-3">6</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.12" className="p-2 sm:p-3">
              <span id="super-admin.super-admin-cloud-accounts-content.span.15" dir="ltr">users</span>، استرجاع كلمة المرور، أعلام
              الميزات (feature flags)، إصدارات OTA وسجل التدقيق
            </td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.9" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.13" className="p-2 sm:p-3" dir="ltr">advertisements</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.14" className="p-2 sm:p-3">4</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.15" className="p-2 sm:p-3">
              شريط البطل (hero slider)، الشريط المميز، شريط الأكثر رواجًا
            </td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.10" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.16" className="p-2 sm:p-3" dir="ltr">system-ops</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.17" className="p-2 sm:p-3">9</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.18" className="p-2 sm:p-3">
              <span id="super-admin.super-admin-cloud-accounts-content.span.16" dir="ltr">system_logs</span>،{" "}
              <span id="super-admin.super-admin-cloud-accounts-content.span.17" dir="ltr">data_health_*</span>
            </td>
          </tr>
        </tbody>
      </TableWrap>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.6">
        <span id="super-admin.super-admin-cloud-accounts-content.span.18" dir="ltr">system-ops</span> انفصلت عن نفس مصدر{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.19" dir="ltr">profile.db</span> الذي جاءت منه شظايا البروفايل، لكنها{" "}
        <strong>لم تنتقل إلى hesham105</strong>: فهي تحمل سجلات تشغيلية، لا
        بيانات بروفايل.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.3">hesham102 — الإشعارات</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.7">
        <span id="super-admin.super-admin-cloud-accounts-content.span.20" dir="ltr">asol-notifications</span> · 3 جداول —{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.21" dir="ltr">user_notification_tokens</span>،{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.22" dir="ltr">user_notification_preferences</span>، بالإضافة إلى
        سجلات drizzle الداخلية.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.4">hesham103 — المنتجات</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.8">
        <span id="super-admin.super-admin-cloud-accounts-content.span.23" dir="ltr">asol-products</span> · 8 جداول —{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.24" dir="ltr">products</span>، تقييمات المنتجات وردودها، تجاوزات
        بروفايل الصيدليات.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.5">hesham104 — {tursoDatabaseCount("hesham104")} شظايا طلبات</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.9">
        <span id="super-admin.super-admin-cloud-accounts-content.span.25" dir="ltr">orders-core</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.26" dir="ltr">orders-items</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.27" dir="ltr">orders-fulfillment</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.28" dir="ltr">orders-delivery-plans</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.29" dir="ltr">orders-shipping-quotes</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.30" dir="ltr">orders-payments</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.31" dir="ltr">orders-refunds</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.32" dir="ltr">orders-after-sales</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.33" dir="ltr">orders-disputes-audit</span>.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.6">hesham105 — {tursoDatabaseCount("hesham105")} شظايا بروفايل</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.10">
        <span id="super-admin.super-admin-cloud-accounts-content.span.34" dir="ltr">profile-core</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.35" dir="ltr">profile-contact</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.36" dir="ltr">profile-media</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.37" dir="ltr">profile-social</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.38" dir="ltr">profile-catalog</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.39" dir="ltr">profile-promotions</span> ·{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.40" dir="ltr">profile-fulfillment</span>.
      </Note>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title.4">Cloudflare R2 — {glance.r2} حسابات</SectionTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.5">
        <thead id="super-admin.super-admin-cloud-accounts-content.thead.5" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.11">
            <th id="super-admin.super-admin-cloud-accounts-content.th.18" className="p-2 text-start sm:p-3"> </th>
            {r2Accounts.map((account) => (
              <th key={account.id} className="p-2 text-start sm:p-3">
                {account.columnLabelAr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody id="super-admin.super-admin-cloud-accounts-content.tbody.5">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.12" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.19" className="p-2 sm:p-3">المتغيرات</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-env`} className="p-2 sm:p-3" dir="ltr">
                {account.envPrefixLabel}
              </td>
            ))}
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.13" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.20" className="p-2 sm:p-3">الحساب</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-id`} className="p-2 sm:p-3" dir="ltr">
                {abbreviateAccountId(account.accountId)}
              </td>
            ))}
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.14" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.21" className="p-2 sm:p-3">البريد الإلكتروني</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-email`} className="p-2 sm:p-3" dir="ltr">
                {account.email}
              </td>
            ))}
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.15" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.22" className="p-2 sm:p-3">الحاوية (Bucket)</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-bucket`} className="p-2 sm:p-3" dir="ltr">
                {account.bucketName}
              </td>
            ))}
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.16" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.23" className="p-2 sm:p-3">معرّف المزوّد / الهدف</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-target`} className="p-2 sm:p-3" dir="ltr">
                {account.targetLabel}
              </td>
            ))}
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.17" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.24" className="p-2 sm:p-3">العنوان العام</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-url`} className="p-2 sm:p-3" dir="ltr">
                {publicHost(account.publicUrl)}
              </td>
            ))}
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.7">ما الذي يحدد وجهة كل ملف</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.11">
        ملفات الوسائط عبر بروفايلات التخزين، وإصدارات OTA عبر{" "}
        <span id="super-admin.super-admin-cloud-accounts-content.span.41" dir="ltr">@asol/ota-core</span> فقط.
      </Note>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.6">
        <thead id="super-admin.super-admin-cloud-accounts-content.thead.6" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.18">
            <th id="super-admin.super-admin-cloud-accounts-content.th.19" className="p-2 text-start sm:p-3">الملف الشخصي (Profile) / الوحدة</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.20" className="p-2 text-start sm:p-3">الحساب</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.21" className="p-2 text-start sm:p-3">مجلد السحابة</th>
          </tr>
        </thead>
        <tbody id="super-admin.super-admin-cloud-accounts-content.tbody.6">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.19" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.25" className="p-2 sm:p-3" dir="ltr">avatar</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.26" className="p-2 sm:p-3">عام</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.27" className="p-2 sm:p-3" dir="ltr">images/profile/avatars</td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.20" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.28" className="p-2 sm:p-3" dir="ltr">cover</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.29" className="p-2 sm:p-3">عام</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.30" className="p-2 sm:p-3" dir="ltr">images/profile/covers</td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.21" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.31" className="p-2 sm:p-3" dir="ltr">home-hero-slider</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.32" className="p-2 sm:p-3">عام</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.33" className="p-2 sm:p-3" dir="ltr">images/content/advertisements/…</td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.22" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.34" className="p-2 sm:p-3" dir="ltr">spicialOrder</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.35" className="p-2 sm:p-3">عام</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.36" className="p-2 sm:p-3" dir="ltr">images/content/spicialOrder</td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.23" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.37" className="p-2 sm:p-3" dir="ltr">product-default</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.38" className="p-2 sm:p-3">
              <strong>المنتجات</strong>
            </td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.39" className="p-2 sm:p-3" dir="ltr">images/products</td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.24" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.40" className="p-2 sm:p-3" dir="ltr">product-apparel-pets</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.41" className="p-2 sm:p-3">
              <strong>ملابس وحيوانات</strong>
            </td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.42" className="p-2 sm:p-3" dir="ltr">images/products-apparel-pets</td>
          </tr>
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.25" className="border-t align-top">
            <td id="super-admin.super-admin-cloud-accounts-content.td.43" className="p-2 sm:p-3" dir="ltr">@asol/ota-core</td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.44" className="p-2 sm:p-3">
              <strong>تحديثات OTA</strong>
            </td>
            <td id="super-admin.super-admin-cloud-accounts-content.td.45" className="p-2 sm:p-3" dir="ltr">app-updates/</td>
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.8">المحتوى الحالي للحاويات</SubTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.7">
        <thead id="super-admin.super-admin-cloud-accounts-content.thead.7" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id="super-admin.super-admin-cloud-accounts-content.tr.26">
            <th id="super-admin.super-admin-cloud-accounts-content.th.22" className="p-2 text-start sm:p-3">الحاوية</th>
            <th id="super-admin.super-admin-cloud-accounts-content.th.23" className="p-2 text-start sm:p-3">الاستخدام</th>
          </tr>
        </thead>
        <tbody id="super-admin.super-admin-cloud-accounts-content.tbody.7">
          {r2Accounts.map((account) => (
            <tr key={`usage-${account.id}`} className="border-t align-top">
              <td className="p-2 sm:p-3">
                <span dir="ltr">{account.bucketName}</span> ({account.columnLabelAr})
              </td>
              <td className="p-2 sm:p-3" dir="ltr">
                {account.targetLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title.5">أين تعيش الاعتمادات (credentials)</SectionTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.12">لا شيء هنا هو مخزن أسرار. كل قيمة هي متغير بيئة في الملفات المحلية والنسخ الاحتياطي المشفّر فقط.</Note>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.13">
        <span id="super-admin.super-admin-cloud-accounts-content.span.42" dir="ltr">npm run db:push:vercel-env</span> يدفع مجموعة متغيرات
        طرف الخادم إلى مشروع <span id="super-admin.super-admin-cloud-accounts-content.span.43" dir="ltr">gova</span>. أوامر نشر الخدمات
        تزامن فقط ما يحتاجه كل حساب — بدون رموز نشر الحسابات الأخرى.
      </Note>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.14">
        <strong>القيمة الاحتياطية (fallback) التي تعبر حدود حساب ليست
        قيمة افتراضية — إنها إعادة توجيه صامتة.</strong> كل سلسلة كهذه أُزيلت؛
        القيمة المفقودة الآن تفشل بصوت واضح.
      </Note>
    </main>
  );
}
