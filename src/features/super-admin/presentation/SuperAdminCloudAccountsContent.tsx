"use client";

// ⚠️ SECURITY WARNING: This is a client-side component
// Do NOT include any secret references or environment variable names directly
// All secrets must only be referenced in server-side config files
// Use descriptive text instead of exact variable names to avoid security violations

import * as React from "react";
import { Cloud } from "lucide-react";

import {
  cloudAccountsGlance,
  tursoDatabaseCount,
  listR2CloudAccounts,
  listVercelCloudAccounts,
  TURSO_CLOUD_ACCOUNTS,
} from "./cloud-accounts-reference";
import { uiAttributes } from "@asol/ui-registry-core";

function SectionTitle({ id, children }: { children: React.ReactNode } & { id?: string }) {
  return (
    <h2 {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.h2-6oiW8D", id: "super-admin.super-admin-cloud-accounts-content.h2" })} id={id} className="mt-8 text-lg font-semibold text-on-surface sm:text-xl">{children}</h2>
  );
}

function SubTitle({ id, children }: { children: React.ReactNode } & { id?: string }) {
  return (
    <h3 {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.h3-Pt7xNH", id: "super-admin.super-admin-cloud-accounts-content.h3" })} id={id} className="mt-5 text-base font-semibold text-on-surface">
      {children}
    </h3>
  );
}

function Note({ id, children }: { children: React.ReactNode } & { id?: string }) {
  return (
    <p {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.p.2-u05Ll5", id: "super-admin.super-admin-cloud-accounts-content.p.2" })} id={id} className="mt-2 text-sm leading-7 text-on-surface-variant">
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
    <div {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.div.2-F5PNTR", id: "super-admin.super-admin-cloud-accounts-content.div.2" })} id={id} className="mt-3 overflow-x-auto rounded-lg border bg-surface">
      <table {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.table-617UfH", id: "super-admin.super-admin-cloud-accounts-content.table" })} className="w-full min-w-[520px] text-xs [&_td]:break-words [&_th]:break-words sm:min-w-[640px] sm:text-sm">
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
    <main {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.main.2-4HJ5gA", id: "super-admin.super-admin-cloud-accounts-content.main.2" })} id="super-admin.super-admin-cloud-accounts-content.main" className="mx-auto w-full max-w-5xl space-y-2 p-4 pb-24" dir="rtl">
      <header {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.header.2-RhA7JH", id: "super-admin.super-admin-cloud-accounts-content.header.2" })} id="super-admin.super-admin-cloud-accounts-content.header" className="flex flex-wrap items-center gap-3">
        <Cloud id="super-admin.super-admin-cloud-accounts-content.cloud" className="h-6 w-6 text-primary" />
        <div {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.div.3-1rtU6n", id: "super-admin.super-admin-cloud-accounts-content.div.3" })} id="super-admin.super-admin-cloud-accounts-content.div">
          <h1 {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.h1.2-d1MCPC", id: "super-admin.super-admin-cloud-accounts-content.h1.2" })} id="super-admin.super-admin-cloud-accounts-content.h1" className="text-xl font-semibold text-on-surface sm:text-2xl">
            الحسابات السحابية
          </h1>
          <p {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.p.3-X1ABFr", id: "super-admin.super-admin-cloud-accounts-content.p.3" })} id="super-admin.super-admin-cloud-accounts-content.p" className="text-sm text-on-surface-variant">
            {glance.vercelWord} حسابات Vercel و{glance.tursoWord} Turso و
            {glance.r2Word} R2.{" "}
            <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.44-v71K5D", id: "super-admin.super-admin-cloud-accounts-content.span.44" })} id="super-admin.super-admin-cloud-accounts-content.span" dir="ltr">submain</span> للبحث والسلة وإنشاء الطلبات؛{" "}
            <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.45-1eOTGV", id: "super-admin.super-admin-cloud-accounts-content.span.45" })} id="super-admin.super-admin-cloud-accounts-content.span.2" dir="ltr">sub2main</span> لكتابات البائع (بروفايل، منتجات،
            تخزين). الأسرار في <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.46-Dw47W1", id: "super-admin.super-admin-cloud-accounts-content.span.46" })} id="super-admin.super-admin-cloud-accounts-content.span.3" dir="ltr">.env.local</span> والنسخ
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
        <thead {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.thead.8-l7WAnT", id: "super-admin.super-admin-cloud-accounts-content.thead.8" })} id="super-admin.super-admin-cloud-accounts-content.thead" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.27-VDHcS8", id: "super-admin.super-admin-cloud-accounts-content.tr.27" })} id="super-admin.super-admin-cloud-accounts-content.tr">
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.24-V7qVgt", id: "super-admin.super-admin-cloud-accounts-content.th.24" })} id="super-admin.super-admin-cloud-accounts-content.th" className="p-2 text-start sm:p-3">المزوّد</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.25-XMc2xg", id: "super-admin.super-admin-cloud-accounts-content.th.25" })} id="super-admin.super-admin-cloud-accounts-content.th.2" className="p-2 text-start sm:p-3">عدد الحسابات</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.26-5yvD8M", id: "super-admin.super-admin-cloud-accounts-content.th.26" })} id="super-admin.super-admin-cloud-accounts-content.th.3" className="p-2 text-start sm:p-3">يحتوي على</th>
          </tr>
        </thead>
        <tbody {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tbody.8-Pov3AO", id: "super-admin.super-admin-cloud-accounts-content.tbody.8" })} id="super-admin.super-admin-cloud-accounts-content.tbody">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.28-3Y6C3A", id: "super-admin.super-admin-cloud-accounts-content.tr.28" })} id="super-admin.super-admin-cloud-accounts-content.tr.2" className="border-t">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.46-HNY8In", id: "super-admin.super-admin-cloud-accounts-content.td.46" })} id="super-admin.super-admin-cloud-accounts-content.td" className="p-2 sm:p-3">Vercel</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.47-7R8j5w", id: "super-admin.super-admin-cloud-accounts-content.td.47" })} id="super-admin.super-admin-cloud-accounts-content.td.2" className="p-2 sm:p-3">{glance.vercel}</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.48-1NEvEO", id: "super-admin.super-admin-cloud-accounts-content.td.48" })} id="super-admin.super-admin-cloud-accounts-content.td.3" className="p-2 sm:p-3">نشرة واحدة لكل حساب</td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.29-R6VYs9", id: "super-admin.super-admin-cloud-accounts-content.tr.29" })} id="super-admin.super-admin-cloud-accounts-content.tr.3" className="border-t">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.49-37VzNE", id: "super-admin.super-admin-cloud-accounts-content.td.49" })} id="super-admin.super-admin-cloud-accounts-content.td.4" className="p-2 sm:p-3">Turso</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.50-n63zSB", id: "super-admin.super-admin-cloud-accounts-content.td.50" })} id="super-admin.super-admin-cloud-accounts-content.td.5" className="p-2 sm:p-3">{glance.turso}</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.51-u1sSVf", id: "super-admin.super-admin-cloud-accounts-content.td.51" })} id="super-admin.super-admin-cloud-accounts-content.td.6" className="p-2 sm:p-3">
              {glance.tursoDatabases} قاعدة بيانات (مجموع الشظايا المعلنة)
            </td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.30-OE5z5W", id: "super-admin.super-admin-cloud-accounts-content.tr.30" })} id="super-admin.super-admin-cloud-accounts-content.tr.4" className="border-t">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.52-RD1pEN", id: "super-admin.super-admin-cloud-accounts-content.td.52" })} id="super-admin.super-admin-cloud-accounts-content.td.7" className="p-2 sm:p-3">Cloudflare R2</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.53-E48zKT", id: "super-admin.super-admin-cloud-accounts-content.td.53" })} id="super-admin.super-admin-cloud-accounts-content.td.8" className="p-2 sm:p-3">{glance.r2}</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.54-mJT75X", id: "super-admin.super-admin-cloud-accounts-content.td.54" })} id="super-admin.super-admin-cloud-accounts-content.td.9" className="p-2 sm:p-3">{glance.r2} حاويات منفصلة تماماً</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.2">
        الرقم {glance.vercelWord} لحسابات Vercel:{" "}
        <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong-9G7OQU", id: "super-admin.super-admin-cloud-accounts-content.strong" })}>حساب واحد لكل نشرة.</strong>{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.47-Ps6IDA", id: "super-admin.super-admin-cloud-accounts-content.span.47" })} id="super-admin.super-admin-cloud-accounts-content.span.4" dir="ltr">gova</span> هو التطبيق الكامل عبر GitHub؛ الباقي
        خدمات معزولة تُنشر من{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.48-Ukb4JK", id: "super-admin.super-admin-cloud-accounts-content.span.48" })} id="super-admin.super-admin-cloud-accounts-content.span.5" dir="ltr">services/&lt;name&gt;/</span> عبر أوامر طرفية — بما فيها{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.49-76qGfO", id: "super-admin.super-admin-cloud-accounts-content.span.49" })} id="super-admin.super-admin-cloud-accounts-content.span.6" dir="ltr">submain</span> (بحث وسلة وطلبات) و{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.50-TSs45y", id: "super-admin.super-admin-cloud-accounts-content.span.50" })} id="super-admin.super-admin-cloud-accounts-content.span.7" dir="ltr">sub2main</span> (كتابات البائع). الجسر (bridge) في
        المتصفح يوجّه الطلبات؛ لا يوجد اتصال خادم-إلى-خادم بين الحسابات.
      </Note>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title.2">Vercel — {glance.vercelWord} حسابات</SectionTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.2">
        <thead {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.thead.9-t0mJZQ", id: "super-admin.super-admin-cloud-accounts-content.thead.9" })} id="super-admin.super-admin-cloud-accounts-content.thead.2" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.31-J19cwK", id: "super-admin.super-admin-cloud-accounts-content.tr.31" })} id="super-admin.super-admin-cloud-accounts-content.tr.5">
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.27-E6XqSe", id: "super-admin.super-admin-cloud-accounts-content.th.27" })} id="super-admin.super-admin-cloud-accounts-content.th.4" className="p-2 text-start sm:p-3">الحساب</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.28-G0cx8u", id: "super-admin.super-admin-cloud-accounts-content.th.28" })} id="super-admin.super-admin-cloud-accounts-content.th.5" className="p-2 text-start sm:p-3">المشروع</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.29-QGGy80", id: "super-admin.super-admin-cloud-accounts-content.th.29" })} id="super-admin.super-admin-cloud-accounts-content.th.6" className="p-2 text-start sm:p-3">البريد الإلكتروني</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.30-45QlAk", id: "super-admin.super-admin-cloud-accounts-content.th.30" })} id="super-admin.super-admin-cloud-accounts-content.th.7" className="p-2 text-start sm:p-3">يخدم</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.31-h1Swys", id: "super-admin.super-admin-cloud-accounts-content.th.31" })} id="super-admin.super-admin-cloud-accounts-content.th.8" className="p-2 text-start sm:p-3">GitHub</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.32-8A53HQ", id: "super-admin.super-admin-cloud-accounts-content.th.32" })} id="super-admin.super-admin-cloud-accounts-content.th.9" className="p-2 text-start sm:p-3">يُحدَّث بواسطة</th>
          </tr>
        </thead>
        <tbody {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tbody.9-L6kF5K", id: "super-admin.super-admin-cloud-accounts-content.tbody.9" })} id="super-admin.super-admin-cloud-accounts-content.tbody.2">
          {vercelAccounts.map((account) => (
            <tr key={account.name} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.32-GO6DO4", id: "super-admin.super-admin-cloud-accounts-content.tr.32" })} className="border-t align-top">
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.55-Ggdb0W", id: "super-admin.super-admin-cloud-accounts-content.td.55" })} className="p-2 sm:p-3" dir="ltr">
                {account.accountLabel}
              </td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.56-24OliQ", id: "super-admin.super-admin-cloud-accounts-content.td.56" })} className="p-2 sm:p-3" dir="ltr">
                {account.project}
              </td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.57-Obv5Da", id: "super-admin.super-admin-cloud-accounts-content.td.57" })} className="p-2 sm:p-3" dir="ltr">
                {account.email}
              </td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.58-xb6GFi", id: "super-admin.super-admin-cloud-accounts-content.td.58" })} className="p-2 sm:p-3">{account.servesAr}</td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.59-G956Nj", id: "super-admin.super-admin-cloud-accounts-content.td.59" })} className="p-2 sm:p-3">
                {account.githubConnected ? (
                  <>
                    <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong.2-Ni9z2W", id: "super-admin.super-admin-cloud-accounts-content.strong.2" })}>متصل</strong> — كل push يعيد النشر
                  </>
                ) : (
                  "غير متصل"
                )}
              </td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.60-ND6NkY", id: "super-admin.super-admin-cloud-accounts-content.td.60" })} className="p-2 sm:p-3" dir="ltr">
                {account.updatedByAr}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title">القاعدة التي تجعل هذا يعمل</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.3">
        <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong.3-UmXX0y", id: "super-admin.super-admin-cloud-accounts-content.strong.3" })}>لا يجوز لأي نشرة استدعاء نشرة أخرى.</strong> لا تملك أي نشرة
        رابط نشرة أخرى، ولا يوجد لديها مسار برمجي يصل إليها. كل عبور يمر عبر
        وحدة جسر (bridge) لا تُنشر على أي حساب إطلاقًا — بل تعمل داخل متصفح
        المستخدم:
      </Note>
      <pre {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.pre-Gf5mV8", id: "super-admin.super-admin-cloud-accounts-content.pre" })} className="mt-3 overflow-x-auto rounded-lg border bg-surface p-3 text-[10px] leading-5 sm:p-4 sm:text-xs sm:leading-6" dir="ltr">
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
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.51-fQhZt4", id: "super-admin.super-admin-cloud-accounts-content.span.51" })} id="super-admin.super-admin-cloud-accounts-content.span.8" dir="ltr">gova</span> هو الوحيد المتصل بـ GitHub. الحسابات
        الأخرى تُحدَّث حصريًا بأوامر نشر طرفية — كل واحد يرفع مجلدًا واحدًا
        فقط: <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.52-SP9Wu0", id: "super-admin.super-admin-cloud-accounts-content.span.52" })} id="super-admin.super-admin-cloud-accounts-content.span.9" dir="ltr">services/&lt;name&gt;/</span> (بما فيها{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.53-fcmJ5T", id: "super-admin.super-admin-cloud-accounts-content.span.53" })} id="super-admin.super-admin-cloud-accounts-content.span.10" dir="ltr">submain</span> و<span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.54-AwZ4zc", id: "super-admin.super-admin-cloud-accounts-content.span.54" })} id="super-admin.super-admin-cloud-accounts-content.span.11" dir="ltr">sub2main</span>).
      </Note>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title.3">
        Turso — {glance.tursoWord} حسابات، {glance.tursoDatabases} قاعدة بيانات
      </SectionTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.3">
        <thead {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.thead.10-Qy1Cp1", id: "super-admin.super-admin-cloud-accounts-content.thead.10" })} id="super-admin.super-admin-cloud-accounts-content.thead.3" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.33-wEB1hT", id: "super-admin.super-admin-cloud-accounts-content.tr.33" })} id="super-admin.super-admin-cloud-accounts-content.tr.6">
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.33-3mlHO7", id: "super-admin.super-admin-cloud-accounts-content.th.33" })} id="super-admin.super-admin-cloud-accounts-content.th.10" className="p-2 text-start sm:p-3">الحساب</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.34-lcvXM8", id: "super-admin.super-admin-cloud-accounts-content.th.34" })} id="super-admin.super-admin-cloud-accounts-content.th.11" className="p-2 text-start sm:p-3">قواعد البيانات</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.35-NkUy1I", id: "super-admin.super-admin-cloud-accounts-content.th.35" })} id="super-admin.super-admin-cloud-accounts-content.th.12" className="p-2 text-start sm:p-3">البريد الإلكتروني</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.36-5xcI5E", id: "super-admin.super-admin-cloud-accounts-content.th.36" })} id="super-admin.super-admin-cloud-accounts-content.th.13" className="p-2 text-start sm:p-3">النطاق</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.37-62xNML", id: "super-admin.super-admin-cloud-accounts-content.th.37" })} id="super-admin.super-admin-cloud-accounts-content.th.14" className="p-2 text-start sm:p-3">يُقرأ بواسطة</th>
          </tr>
        </thead>
        <tbody {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tbody.10-iCgw31", id: "super-admin.super-admin-cloud-accounts-content.tbody.10" })} id="super-admin.super-admin-cloud-accounts-content.tbody.3">
          {TURSO_CLOUD_ACCOUNTS.map((account) => (
            <tr key={account.account} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.34-V7C9EK", id: "super-admin.super-admin-cloud-accounts-content.tr.34" })} className="border-t align-top">
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.61-dtOTD1", id: "super-admin.super-admin-cloud-accounts-content.td.61" })} className="p-2 sm:p-3" dir="ltr">
                {account.account}
              </td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.62-6BS5HE", id: "super-admin.super-admin-cloud-accounts-content.td.62" })} className="p-2 sm:p-3">{account.databases}</td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.63-59JJ7c", id: "super-admin.super-admin-cloud-accounts-content.td.63" })} className="p-2 sm:p-3" dir="ltr">
                {account.email}
              </td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.64-G5AFkb", id: "super-admin.super-admin-cloud-accounts-content.td.64" })} className="p-2 sm:p-3">{account.domainAr}</td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.65-29ChF5", id: "super-admin.super-admin-cloud-accounts-content.td.65" })} className="p-2 sm:p-3" dir="ltr">
                {account.readByAr}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.5">
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.55-5f2Iwb", id: "super-admin.super-admin-cloud-accounts-content.span.55" })} id="super-admin.super-admin-cloud-accounts-content.span.12" dir="ltr">gova</span> و<span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.56-skt73W", id: "super-admin.super-admin-cloud-accounts-content.span.56" })} id="super-admin.super-admin-cloud-accounts-content.span.13" dir="ltr">submain</span> يحملان
        اعتمادات التشغيل الكاملة. <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.57-I5WJOZ", id: "super-admin.super-admin-cloud-accounts-content.span.57" })} id="super-admin.super-admin-cloud-accounts-content.span.14" dir="ltr">sub2main</span> يحمل
        اعتمادات المنتجات وشظايا البروفايل والمستخدمين لكتابات البائع. كل
        نشرة للقراءة فقط تحمل <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong.4-FZEK07", id: "super-admin.super-admin-cloud-accounts-content.strong.4" })}>فقط</strong> الشظايا التي تخدمها.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.2">hesham101 — {tursoDatabaseCount("hesham101")} قواعد بيانات</SubTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.4">
        <thead {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.thead.11-2tHllV", id: "super-admin.super-admin-cloud-accounts-content.thead.11" })} id="super-admin.super-admin-cloud-accounts-content.thead.4" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.35-Sn1ZTg", id: "super-admin.super-admin-cloud-accounts-content.tr.35" })} id="super-admin.super-admin-cloud-accounts-content.tr.7">
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.38-T10HFB", id: "super-admin.super-admin-cloud-accounts-content.th.38" })} id="super-admin.super-admin-cloud-accounts-content.th.15" className="p-2 text-start sm:p-3">قاعدة البيانات</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.39-G1KosB", id: "super-admin.super-admin-cloud-accounts-content.th.39" })} id="super-admin.super-admin-cloud-accounts-content.th.16" className="p-2 text-start sm:p-3">الجداول</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.40-3U9Ab0", id: "super-admin.super-admin-cloud-accounts-content.th.40" })} id="super-admin.super-admin-cloud-accounts-content.th.17" className="p-2 text-start sm:p-3">المحتوى</th>
          </tr>
        </thead>
        <tbody {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tbody.11-X3pbD1", id: "super-admin.super-admin-cloud-accounts-content.tbody.11" })} id="super-admin.super-admin-cloud-accounts-content.tbody.4">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.36-V23yxe", id: "super-admin.super-admin-cloud-accounts-content.tr.36" })} id="super-admin.super-admin-cloud-accounts-content.tr.8" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.66-R5ys75", id: "super-admin.super-admin-cloud-accounts-content.td.66" })} id="super-admin.super-admin-cloud-accounts-content.td.10" className="p-2 sm:p-3" dir="ltr">allusers</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.67-DbeZM6", id: "super-admin.super-admin-cloud-accounts-content.td.67" })} id="super-admin.super-admin-cloud-accounts-content.td.11" className="p-2 sm:p-3">6</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.68-HBY3H8", id: "super-admin.super-admin-cloud-accounts-content.td.68" })} id="super-admin.super-admin-cloud-accounts-content.td.12" className="p-2 sm:p-3">
              <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.58-59RU4J", id: "super-admin.super-admin-cloud-accounts-content.span.58" })} id="super-admin.super-admin-cloud-accounts-content.span.15" dir="ltr">users</span>، استرجاع كلمة المرور، أعلام
              الميزات (feature flags)، إصدارات OTA وسجل التدقيق
            </td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.37-f9D4Q2", id: "super-admin.super-admin-cloud-accounts-content.tr.37" })} id="super-admin.super-admin-cloud-accounts-content.tr.9" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.69-qRyao9", id: "super-admin.super-admin-cloud-accounts-content.td.69" })} id="super-admin.super-admin-cloud-accounts-content.td.13" className="p-2 sm:p-3" dir="ltr">advertisements</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.70-eO5jOG", id: "super-admin.super-admin-cloud-accounts-content.td.70" })} id="super-admin.super-admin-cloud-accounts-content.td.14" className="p-2 sm:p-3">4</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.71-sjPEB0", id: "super-admin.super-admin-cloud-accounts-content.td.71" })} id="super-admin.super-admin-cloud-accounts-content.td.15" className="p-2 sm:p-3">
              شريط البطل (hero slider)، الشريط المميز، شريط الأكثر رواجًا
            </td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.38-2izoIN", id: "super-admin.super-admin-cloud-accounts-content.tr.38" })} id="super-admin.super-admin-cloud-accounts-content.tr.10" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.72-jF3GxU", id: "super-admin.super-admin-cloud-accounts-content.td.72" })} id="super-admin.super-admin-cloud-accounts-content.td.16" className="p-2 sm:p-3" dir="ltr">system-ops</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.73-n29nyA", id: "super-admin.super-admin-cloud-accounts-content.td.73" })} id="super-admin.super-admin-cloud-accounts-content.td.17" className="p-2 sm:p-3">9</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.74-gNOO1y", id: "super-admin.super-admin-cloud-accounts-content.td.74" })} id="super-admin.super-admin-cloud-accounts-content.td.18" className="p-2 sm:p-3">
              <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.59-Y0QX5w", id: "super-admin.super-admin-cloud-accounts-content.span.59" })} id="super-admin.super-admin-cloud-accounts-content.span.16" dir="ltr">system_logs</span>،{" "}
              <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.60-E47Zzw", id: "super-admin.super-admin-cloud-accounts-content.span.60" })} id="super-admin.super-admin-cloud-accounts-content.span.17" dir="ltr">data_health_*</span>
            </td>
          </tr>
        </tbody>
      </TableWrap>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.6">
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.61-eM2m0W", id: "super-admin.super-admin-cloud-accounts-content.span.61" })} id="super-admin.super-admin-cloud-accounts-content.span.18" dir="ltr">system-ops</span> انفصلت عن نفس مصدر{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.62-yeHE23", id: "super-admin.super-admin-cloud-accounts-content.span.62" })} id="super-admin.super-admin-cloud-accounts-content.span.19" dir="ltr">profile.db</span> الذي جاءت منه شظايا البروفايل، لكنها{" "}
        <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong.5-A67p23", id: "super-admin.super-admin-cloud-accounts-content.strong.5" })}>لم تنتقل إلى hesham105</strong>: فهي تحمل سجلات تشغيلية، لا
        بيانات بروفايل.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.3">hesham102 — الإشعارات</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.7">
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.63-0A5Iu0", id: "super-admin.super-admin-cloud-accounts-content.span.63" })} id="super-admin.super-admin-cloud-accounts-content.span.20" dir="ltr">asol-notifications</span> · 3 جداول —{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.64-NH587I", id: "super-admin.super-admin-cloud-accounts-content.span.64" })} id="super-admin.super-admin-cloud-accounts-content.span.21" dir="ltr">user_notification_tokens</span>،{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.65-WMB7zz", id: "super-admin.super-admin-cloud-accounts-content.span.65" })} id="super-admin.super-admin-cloud-accounts-content.span.22" dir="ltr">user_notification_preferences</span>، بالإضافة إلى
        سجلات drizzle الداخلية.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.4">hesham103 — المنتجات</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.8">
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.66-1cFXB8", id: "super-admin.super-admin-cloud-accounts-content.span.66" })} id="super-admin.super-admin-cloud-accounts-content.span.23" dir="ltr">asol-products</span> · 8 جداول —{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.67-7zLijO", id: "super-admin.super-admin-cloud-accounts-content.span.67" })} id="super-admin.super-admin-cloud-accounts-content.span.24" dir="ltr">products</span>، تقييمات المنتجات وردودها، تجاوزات
        بروفايل الصيدليات.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.5">hesham104 — {tursoDatabaseCount("hesham104")} شظايا طلبات</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.9">
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.68-4j7GRA", id: "super-admin.super-admin-cloud-accounts-content.span.68" })} id="super-admin.super-admin-cloud-accounts-content.span.25" dir="ltr">orders-core</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.69-8RNQUH", id: "super-admin.super-admin-cloud-accounts-content.span.69" })} id="super-admin.super-admin-cloud-accounts-content.span.26" dir="ltr">orders-items</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.70-5yEMlt", id: "super-admin.super-admin-cloud-accounts-content.span.70" })} id="super-admin.super-admin-cloud-accounts-content.span.27" dir="ltr">orders-fulfillment</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.71-KxL7K3", id: "super-admin.super-admin-cloud-accounts-content.span.71" })} id="super-admin.super-admin-cloud-accounts-content.span.28" dir="ltr">orders-delivery-plans</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.72-gRNY40", id: "super-admin.super-admin-cloud-accounts-content.span.72" })} id="super-admin.super-admin-cloud-accounts-content.span.29" dir="ltr">orders-shipping-quotes</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.73-Xe9gJQ", id: "super-admin.super-admin-cloud-accounts-content.span.73" })} id="super-admin.super-admin-cloud-accounts-content.span.30" dir="ltr">orders-payments</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.74-7egPHp", id: "super-admin.super-admin-cloud-accounts-content.span.74" })} id="super-admin.super-admin-cloud-accounts-content.span.31" dir="ltr">orders-refunds</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.75-zIGW0U", id: "super-admin.super-admin-cloud-accounts-content.span.75" })} id="super-admin.super-admin-cloud-accounts-content.span.32" dir="ltr">orders-after-sales</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.76-WMLKQ3", id: "super-admin.super-admin-cloud-accounts-content.span.76" })} id="super-admin.super-admin-cloud-accounts-content.span.33" dir="ltr">orders-disputes-audit</span>.
      </Note>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.6">hesham105 — {tursoDatabaseCount("hesham105")} شظايا بروفايل</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.10">
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.77-V4NRbA", id: "super-admin.super-admin-cloud-accounts-content.span.77" })} id="super-admin.super-admin-cloud-accounts-content.span.34" dir="ltr">profile-core</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.78-S8vE7O", id: "super-admin.super-admin-cloud-accounts-content.span.78" })} id="super-admin.super-admin-cloud-accounts-content.span.35" dir="ltr">profile-contact</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.79-7N2XiD", id: "super-admin.super-admin-cloud-accounts-content.span.79" })} id="super-admin.super-admin-cloud-accounts-content.span.36" dir="ltr">profile-media</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.80-E3uhF4", id: "super-admin.super-admin-cloud-accounts-content.span.80" })} id="super-admin.super-admin-cloud-accounts-content.span.37" dir="ltr">profile-social</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.81-s1GkE0", id: "super-admin.super-admin-cloud-accounts-content.span.81" })} id="super-admin.super-admin-cloud-accounts-content.span.38" dir="ltr">profile-catalog</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.82-9MnUwH", id: "super-admin.super-admin-cloud-accounts-content.span.82" })} id="super-admin.super-admin-cloud-accounts-content.span.39" dir="ltr">profile-promotions</span> ·{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.83-4d0ZDr", id: "super-admin.super-admin-cloud-accounts-content.span.83" })} id="super-admin.super-admin-cloud-accounts-content.span.40" dir="ltr">profile-fulfillment</span>.
      </Note>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title.4">Cloudflare R2 — {glance.r2} حسابات</SectionTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.5">
        <thead {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.thead.12-VVX12V", id: "super-admin.super-admin-cloud-accounts-content.thead.12" })} id="super-admin.super-admin-cloud-accounts-content.thead.5" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.39-6L3FPY", id: "super-admin.super-admin-cloud-accounts-content.tr.39" })} id="super-admin.super-admin-cloud-accounts-content.tr.11">
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.41-3XI8tA", id: "super-admin.super-admin-cloud-accounts-content.th.41" })} id="super-admin.super-admin-cloud-accounts-content.th.18" className="p-2 text-start sm:p-3"> </th>
            {r2Accounts.map((account) => (
              <th key={account.id} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.42-1XATLG", id: "super-admin.super-admin-cloud-accounts-content.th.42" })} className="p-2 text-start sm:p-3">
                {account.columnLabelAr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tbody.12-6LeST7", id: "super-admin.super-admin-cloud-accounts-content.tbody.12" })} id="super-admin.super-admin-cloud-accounts-content.tbody.5">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.40-Enu0dE", id: "super-admin.super-admin-cloud-accounts-content.tr.40" })} id="super-admin.super-admin-cloud-accounts-content.tr.12" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.75-87wVaM", id: "super-admin.super-admin-cloud-accounts-content.td.75" })} id="super-admin.super-admin-cloud-accounts-content.td.19" className="p-2 sm:p-3">المتغيرات</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-env`} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.76-5XmxEE", id: "super-admin.super-admin-cloud-accounts-content.td.76" })} className="p-2 sm:p-3" dir="ltr">
                {account.envPrefixLabel}
              </td>
            ))}
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.41-JN9z0b", id: "super-admin.super-admin-cloud-accounts-content.tr.41" })} id="super-admin.super-admin-cloud-accounts-content.tr.13" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.77-19UDf2", id: "super-admin.super-admin-cloud-accounts-content.td.77" })} id="super-admin.super-admin-cloud-accounts-content.td.20" className="p-2 sm:p-3">الحساب</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-id`} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.78-QSvdB3", id: "super-admin.super-admin-cloud-accounts-content.td.78" })} className="p-2 sm:p-3" dir="ltr">
                {abbreviateAccountId(account.accountId)}
              </td>
            ))}
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.42-hvTVv1", id: "super-admin.super-admin-cloud-accounts-content.tr.42" })} id="super-admin.super-admin-cloud-accounts-content.tr.14" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.79-YEfK8X", id: "super-admin.super-admin-cloud-accounts-content.td.79" })} id="super-admin.super-admin-cloud-accounts-content.td.21" className="p-2 sm:p-3">البريد الإلكتروني</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-email`} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.80-nqA4w6", id: "super-admin.super-admin-cloud-accounts-content.td.80" })} className="p-2 sm:p-3" dir="ltr">
                {account.email}
              </td>
            ))}
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.43-y8UVck", id: "super-admin.super-admin-cloud-accounts-content.tr.43" })} id="super-admin.super-admin-cloud-accounts-content.tr.15" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.81-TC3JEK", id: "super-admin.super-admin-cloud-accounts-content.td.81" })} id="super-admin.super-admin-cloud-accounts-content.td.22" className="p-2 sm:p-3">الحاوية (Bucket)</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-bucket`} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.82-MN6slb", id: "super-admin.super-admin-cloud-accounts-content.td.82" })} className="p-2 sm:p-3" dir="ltr">
                {account.bucketName}
              </td>
            ))}
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.44-Tf1XdS", id: "super-admin.super-admin-cloud-accounts-content.tr.44" })} id="super-admin.super-admin-cloud-accounts-content.tr.16" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.83-DS8g2J", id: "super-admin.super-admin-cloud-accounts-content.td.83" })} id="super-admin.super-admin-cloud-accounts-content.td.23" className="p-2 sm:p-3">معرّف المزوّد / الهدف</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-target`} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.84-FN4XFU", id: "super-admin.super-admin-cloud-accounts-content.td.84" })} className="p-2 sm:p-3" dir="ltr">
                {account.targetLabel}
              </td>
            ))}
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.45-6BQPIR", id: "super-admin.super-admin-cloud-accounts-content.tr.45" })} id="super-admin.super-admin-cloud-accounts-content.tr.17" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.85-cLm0Dj", id: "super-admin.super-admin-cloud-accounts-content.td.85" })} id="super-admin.super-admin-cloud-accounts-content.td.24" className="p-2 sm:p-3">العنوان العام</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-url`} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.86-pd50Vh", id: "super-admin.super-admin-cloud-accounts-content.td.86" })} className="p-2 sm:p-3" dir="ltr">
                {publicHost(account.publicUrl)}
              </td>
            ))}
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.7">ما الذي يحدد وجهة كل ملف</SubTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.11">
        ملفات الوسائط عبر بروفايلات التخزين، وإصدارات OTA عبر{" "}
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.84-81cUOQ", id: "super-admin.super-admin-cloud-accounts-content.span.84" })} id="super-admin.super-admin-cloud-accounts-content.span.41" dir="ltr">@asol/ota-core</span> فقط.
      </Note>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.6">
        <thead {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.thead.13-HVF5w7", id: "super-admin.super-admin-cloud-accounts-content.thead.13" })} id="super-admin.super-admin-cloud-accounts-content.thead.6" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.46-qPG5qQ", id: "super-admin.super-admin-cloud-accounts-content.tr.46" })} id="super-admin.super-admin-cloud-accounts-content.tr.18">
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.43-S0OL25", id: "super-admin.super-admin-cloud-accounts-content.th.43" })} id="super-admin.super-admin-cloud-accounts-content.th.19" className="p-2 text-start sm:p-3">الملف الشخصي (Profile) / الوحدة</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.44-A4Jnso", id: "super-admin.super-admin-cloud-accounts-content.th.44" })} id="super-admin.super-admin-cloud-accounts-content.th.20" className="p-2 text-start sm:p-3">الحساب</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.45-5rSm6F", id: "super-admin.super-admin-cloud-accounts-content.th.45" })} id="super-admin.super-admin-cloud-accounts-content.th.21" className="p-2 text-start sm:p-3">مجلد السحابة</th>
          </tr>
        </thead>
        <tbody {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tbody.13-VADZ5r", id: "super-admin.super-admin-cloud-accounts-content.tbody.13" })} id="super-admin.super-admin-cloud-accounts-content.tbody.6">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.47-0tPOS2", id: "super-admin.super-admin-cloud-accounts-content.tr.47" })} id="super-admin.super-admin-cloud-accounts-content.tr.19" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.87-B3C0IP", id: "super-admin.super-admin-cloud-accounts-content.td.87" })} id="super-admin.super-admin-cloud-accounts-content.td.25" className="p-2 sm:p-3" dir="ltr">avatar</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.88-rMFt7a", id: "super-admin.super-admin-cloud-accounts-content.td.88" })} id="super-admin.super-admin-cloud-accounts-content.td.26" className="p-2 sm:p-3">عام</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.89-dfYu1A", id: "super-admin.super-admin-cloud-accounts-content.td.89" })} id="super-admin.super-admin-cloud-accounts-content.td.27" className="p-2 sm:p-3" dir="ltr">images/profile/avatars</td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.48-5UXXnw", id: "super-admin.super-admin-cloud-accounts-content.tr.48" })} id="super-admin.super-admin-cloud-accounts-content.tr.20" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.90-M2TOUv", id: "super-admin.super-admin-cloud-accounts-content.td.90" })} id="super-admin.super-admin-cloud-accounts-content.td.28" className="p-2 sm:p-3" dir="ltr">cover</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.91-WWD8ji", id: "super-admin.super-admin-cloud-accounts-content.td.91" })} id="super-admin.super-admin-cloud-accounts-content.td.29" className="p-2 sm:p-3">عام</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.92-hoN0Fg", id: "super-admin.super-admin-cloud-accounts-content.td.92" })} id="super-admin.super-admin-cloud-accounts-content.td.30" className="p-2 sm:p-3" dir="ltr">images/profile/covers</td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.49-iBUJa6", id: "super-admin.super-admin-cloud-accounts-content.tr.49" })} id="super-admin.super-admin-cloud-accounts-content.tr.21" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.93-F45DGp", id: "super-admin.super-admin-cloud-accounts-content.td.93" })} id="super-admin.super-admin-cloud-accounts-content.td.31" className="p-2 sm:p-3" dir="ltr">home-hero-slider</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.94-EG6KX7", id: "super-admin.super-admin-cloud-accounts-content.td.94" })} id="super-admin.super-admin-cloud-accounts-content.td.32" className="p-2 sm:p-3">عام</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.95-ScV1sE", id: "super-admin.super-admin-cloud-accounts-content.td.95" })} id="super-admin.super-admin-cloud-accounts-content.td.33" className="p-2 sm:p-3" dir="ltr">images/content/advertisements/…</td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.50-nL4x3B", id: "super-admin.super-admin-cloud-accounts-content.tr.50" })} id="super-admin.super-admin-cloud-accounts-content.tr.22" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.96-TqAZ24", id: "super-admin.super-admin-cloud-accounts-content.td.96" })} id="super-admin.super-admin-cloud-accounts-content.td.34" className="p-2 sm:p-3" dir="ltr">spicialOrder</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.97-H6dFKN", id: "super-admin.super-admin-cloud-accounts-content.td.97" })} id="super-admin.super-admin-cloud-accounts-content.td.35" className="p-2 sm:p-3">عام</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.98-m0TTKu", id: "super-admin.super-admin-cloud-accounts-content.td.98" })} id="super-admin.super-admin-cloud-accounts-content.td.36" className="p-2 sm:p-3" dir="ltr">images/content/spicialOrder</td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.51-Z0gU6H", id: "super-admin.super-admin-cloud-accounts-content.tr.51" })} id="super-admin.super-admin-cloud-accounts-content.tr.23" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.99-OHjb2L", id: "super-admin.super-admin-cloud-accounts-content.td.99" })} id="super-admin.super-admin-cloud-accounts-content.td.37" className="p-2 sm:p-3" dir="ltr">product-default</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.100-Ep8BBA", id: "super-admin.super-admin-cloud-accounts-content.td.100" })} id="super-admin.super-admin-cloud-accounts-content.td.38" className="p-2 sm:p-3">
              <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong.6-4peAk5", id: "super-admin.super-admin-cloud-accounts-content.strong.6" })}>المنتجات</strong>
            </td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.101-IY2tG0", id: "super-admin.super-admin-cloud-accounts-content.td.101" })} id="super-admin.super-admin-cloud-accounts-content.td.39" className="p-2 sm:p-3" dir="ltr">images/products</td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.52-9oIGIJ", id: "super-admin.super-admin-cloud-accounts-content.tr.52" })} id="super-admin.super-admin-cloud-accounts-content.tr.24" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.102-5y67oI", id: "super-admin.super-admin-cloud-accounts-content.td.102" })} id="super-admin.super-admin-cloud-accounts-content.td.40" className="p-2 sm:p-3" dir="ltr">product-apparel-pets</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.103-Mbas4K", id: "super-admin.super-admin-cloud-accounts-content.td.103" })} id="super-admin.super-admin-cloud-accounts-content.td.41" className="p-2 sm:p-3">
              <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong.7-pBP3WR", id: "super-admin.super-admin-cloud-accounts-content.strong.7" })}>ملابس وحيوانات</strong>
            </td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.104-63JwBS", id: "super-admin.super-admin-cloud-accounts-content.td.104" })} id="super-admin.super-admin-cloud-accounts-content.td.42" className="p-2 sm:p-3" dir="ltr">images/products-apparel-pets</td>
          </tr>
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.53-Tl4jnP", id: "super-admin.super-admin-cloud-accounts-content.tr.53" })} id="super-admin.super-admin-cloud-accounts-content.tr.25" className="border-t align-top">
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.105-Ov7BSZ", id: "super-admin.super-admin-cloud-accounts-content.td.105" })} id="super-admin.super-admin-cloud-accounts-content.td.43" className="p-2 sm:p-3" dir="ltr">@asol/ota-core</td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.106-UWZf0W", id: "super-admin.super-admin-cloud-accounts-content.td.106" })} id="super-admin.super-admin-cloud-accounts-content.td.44" className="p-2 sm:p-3">
              <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong.8-6cq7XX", id: "super-admin.super-admin-cloud-accounts-content.strong.8" })}>تحديثات OTA</strong>
            </td>
            <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.107-X4NyqN", id: "super-admin.super-admin-cloud-accounts-content.td.107" })} id="super-admin.super-admin-cloud-accounts-content.td.45" className="p-2 sm:p-3" dir="ltr">app-updates/</td>
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle id="super-admin.super-admin-cloud-accounts-content.sub-title.8">المحتوى الحالي للحاويات</SubTitle>
      <TableWrap id="super-admin.super-admin-cloud-accounts-content.table-wrap.7">
        <thead {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.thead.14-9MYZ76", id: "super-admin.super-admin-cloud-accounts-content.thead.14" })} id="super-admin.super-admin-cloud-accounts-content.thead.7" className="bg-muted/50 text-xs text-on-surface-variant">
          <tr {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.54-VVv4Tc", id: "super-admin.super-admin-cloud-accounts-content.tr.54" })} id="super-admin.super-admin-cloud-accounts-content.tr.26">
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.46-wBDi5f", id: "super-admin.super-admin-cloud-accounts-content.th.46" })} id="super-admin.super-admin-cloud-accounts-content.th.22" className="p-2 text-start sm:p-3">الحاوية</th>
            <th {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.th.47-oiS3On", id: "super-admin.super-admin-cloud-accounts-content.th.47" })} id="super-admin.super-admin-cloud-accounts-content.th.23" className="p-2 text-start sm:p-3">الاستخدام</th>
          </tr>
        </thead>
        <tbody {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tbody.14-yt59Al", id: "super-admin.super-admin-cloud-accounts-content.tbody.14" })} id="super-admin.super-admin-cloud-accounts-content.tbody.7">
          {r2Accounts.map((account) => (
            <tr key={`usage-${account.id}`} {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.tr.55-fGMx92", id: "super-admin.super-admin-cloud-accounts-content.tr.55" })} className="border-t align-top">
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.108-K4IaGO", id: "super-admin.super-admin-cloud-accounts-content.td.108" })} className="p-2 sm:p-3">
                <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.85-9eRJIS", id: "super-admin.super-admin-cloud-accounts-content.span.85" })} dir="ltr">{account.bucketName}</span> ({account.columnLabelAr})
              </td>
              <td {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.td.109-pl9L4x", id: "super-admin.super-admin-cloud-accounts-content.td.109" })} className="p-2 sm:p-3" dir="ltr">
                {account.targetLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <SectionTitle id="super-admin.super-admin-cloud-accounts-content.section-title.5">أين تعيش الاعتمادات (credentials)</SectionTitle>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.12">لا شيء هنا هو مخزن أسرار. كل قيمة هي متغير بيئة في الملفات المحلية والنسخ الاحتياطي المشفّر فقط.</Note>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.13">
        <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.86-IvMA7G", id: "super-admin.super-admin-cloud-accounts-content.span.86" })} id="super-admin.super-admin-cloud-accounts-content.span.42" dir="ltr">npm run db:push:vercel-env</span> يدفع مجموعة متغيرات
        طرف الخادم إلى مشروع <span {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.span.87-9Cih6P", id: "super-admin.super-admin-cloud-accounts-content.span.87" })} id="super-admin.super-admin-cloud-accounts-content.span.43" dir="ltr">gova</span>. أوامر نشر الخدمات
        تزامن فقط ما يحتاجه كل حساب — بدون رموز نشر الحسابات الأخرى.
      </Note>
      <Note id="super-admin.super-admin-cloud-accounts-content.note.14">
        <strong {...uiAttributes({ uid: "super-admin.super-admin-cloud-accounts-content.strong.9-Yo6Pq6", id: "super-admin.super-admin-cloud-accounts-content.strong.9" })}>القيمة الاحتياطية (fallback) التي تعبر حدود حساب ليست
        قيمة افتراضية — إنها إعادة توجيه صامتة.</strong> كل سلسلة كهذه أُزيلت؛
        القيمة المفقودة الآن تفشل بصوت واضح.
      </Note>
    </main>
  );
}
