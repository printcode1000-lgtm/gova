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
      <table id="features-super-admin-presentation-superadmincloudaccountscontent-table-5-tycyuj" className="w-full min-w-[520px] text-xs [&_td]:break-words [&_th]:break-words sm:min-w-[640px] sm:text-sm">
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
    <main id='features-super-admin-presentation-superadmincloudaccountscontent-main-6-4uw4oe' className="mx-auto w-full max-w-5xl space-y-2 p-4 pb-24" dir="rtl">
      <header id='features-super-admin-presentation-superadmincloudaccountscontent-header-7-qohfcl' className="flex flex-wrap items-center gap-3">
        <Cloud id='features-super-admin-presentation-superadmincloudaccountscontent-cloud-8-czmiif' className="h-6 w-6 text-primary" />
        <div id='features-super-admin-presentation-superadmincloudaccountscontent-div-9-svt8j1'>
          <h1 id='features-super-admin-presentation-superadmincloudaccountscontent-heading-10-dc13q0' className="text-xl font-semibold text-on-surface sm:text-2xl">
            الحسابات السحابية
          </h1>
          <p id='features-super-admin-presentation-superadmincloudaccountscontent-text-11-o4dt5l' className="text-sm text-on-surface-variant">
            {glance.vercelWord} حسابات Vercel و{glance.tursoWord} Turso و
            {glance.r2Word} R2.{" "}
            <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-12-oui7mt' dir="ltr">submain</span> للبحث والسلة وإنشاء الطلبات؛{" "}
            <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-13-7ykc78' dir="ltr">sub2main</span> لكتابات البائع (بروفايل، منتجات،
            تخزين). الأسرار في <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-14-nf6z0e' dir="ltr">.env.local</span> والنسخ
            الاحتياطي المشفّر فقط — لا في Git.
          </p>
        </div>
      </header>

      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-15-idoggy'>
        تم التحقق من هذه القائمة مباشرة مقابل واجهة برمجة كل مزوّد. لا يظهر
        هنا أي رمز دخول أو مفتاح أو سر — راجع صفحة متغيرات البيئة في التوثيق
        لمعرفة أي متغير يحمل أي قيمة. جداول Vercel وR2 تُشتق من إعلانات
        الحزم؛ عند إضافة حساب في الكود تتحدث الصفحة تلقائياً.
      </Note>

      <SectionTitle id='features-super-admin-presentation-superadmincloudaccountscontent-sectiontitle-16-hceotx'>نظرة عامة</SectionTitle>
      <TableWrap id='features-super-admin-presentation-superadmincloudaccountscontent-tablewrap-17-0xr324'>
        <thead id='features-super-admin-presentation-superadmincloudaccountscontent-thead-18-nxt6xt' className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-19-i65ksz'>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-20-2n6tyd' className="p-2 text-start sm:p-3">المزوّد</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-21-35pnqv' className="p-2 text-start sm:p-3">عدد الحسابات</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-22-lqm6jx' className="p-2 text-start sm:p-3">يحتوي على</th>
          </tr>
        </thead>
        <tbody id='features-super-admin-presentation-superadmincloudaccountscontent-tbody-23-cmwbkm'>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-24-gwnfpd' className="border-t">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-25-6rvadk' className="p-2 sm:p-3">Vercel</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-26-2mqulz' className="p-2 sm:p-3">{glance.vercel}</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-27-lwuywl' className="p-2 sm:p-3">نشرة واحدة لكل حساب</td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-28-qydj3q' className="border-t">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-29-omtkwy' className="p-2 sm:p-3">Turso</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-30-ckrffm' className="p-2 sm:p-3">{glance.turso}</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-31-iip7gh' className="p-2 sm:p-3">
              {glance.tursoDatabases} قاعدة بيانات (مجموع الشظايا المعلنة)
            </td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-32-ac2lz1' className="border-t">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-33-e5nofm' className="p-2 sm:p-3">Cloudflare R2</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-34-pxqt7i' className="p-2 sm:p-3">{glance.r2}</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-35-xnajed' className="p-2 sm:p-3">{glance.r2} حاويات منفصلة تماماً</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-36-h3ixbc'>
        الرقم {glance.vercelWord} لحسابات Vercel:{" "}
        <strong id="features-super-admin-presentation-superadmincloudaccountscontent-strong-37-d7qzfy">حساب واحد لكل نشرة.</strong>{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-38-1bmhbo' dir="ltr">gova</span> هو التطبيق الكامل عبر GitHub؛ الباقي
        خدمات معزولة تُنشر من{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-39-ic0ze6' dir="ltr">services/&lt;name&gt;/</span> عبر أوامر طرفية — بما فيها{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-40-im26jc' dir="ltr">submain</span> (بحث وسلة وطلبات) و{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-41-pmyjkj' dir="ltr">sub2main</span> (كتابات البائع). الجسر (bridge) في
        المتصفح يوجّه الطلبات؛ لا يوجد اتصال خادم-إلى-خادم بين الحسابات.
      </Note>

      <SectionTitle id='features-super-admin-presentation-superadmincloudaccountscontent-sectiontitle-42-yselqa'>Vercel — {glance.vercelWord} حسابات</SectionTitle>
      <TableWrap id='features-super-admin-presentation-superadmincloudaccountscontent-tablewrap-43-2ojusb'>
        <thead id='features-super-admin-presentation-superadmincloudaccountscontent-thead-44-dlxhv5' className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-45-tgshpw'>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-46-thebys' className="p-2 text-start sm:p-3">الحساب</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-47-dh8ebv' className="p-2 text-start sm:p-3">المشروع</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-48-fwfo58' className="p-2 text-start sm:p-3">البريد الإلكتروني</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-49-vdj2ng' className="p-2 text-start sm:p-3">يخدم</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-50-i5oj8w' className="p-2 text-start sm:p-3">GitHub</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-51-rpmial' className="p-2 text-start sm:p-3">يُحدَّث بواسطة</th>
          </tr>
        </thead>
        <tbody id='features-super-admin-presentation-superadmincloudaccountscontent-tbody-52-wh9qso'>
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

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-53-gmrniv'>مسارات كل حساب</SubTitle>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-54-dqrsnu'>
        أي حساب يجيب أي طلب. المصدر هو سجل الملكية نفسه الذي يستخدمه موجّه
        العميل وحدّ التوافق في gova، فلا يمكن للصفحة أن تعرض وجهة تخالف الوجهة
        الفعلية. الجرد الكامل لكل طريقة، وأي معالج تشحنه كل خدمة اليوم، في
        <code id="features-super-admin-presentation-superadmincloudaccountscontent-code-55-xdqbbq" dir="ltr"> docs/09-agent-knowledge/generated/catalogs/account-routing-catalog.md</code>.
      </Note>
      <CloudAccountRoutesSection id='features-super-admin-presentation-superadmincloudaccountscontent-cloudaccountroutessection-56-cwdwa3' />

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-57-fxatnj'>القاعدة التي تجعل هذا يعمل</SubTitle>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-58-uypkou'>
        <strong id="features-super-admin-presentation-superadmincloudaccountscontent-strong-59-r7dypz">لا يجوز لأي نشرة استدعاء نشرة أخرى.</strong> لا تملك أي نشرة
        رابط نشرة أخرى، ولا يوجد لديها مسار برمجي يصل إليها. كل عبور يمر عبر
        وحدة جسر (bridge) لا تُنشر على أي حساب إطلاقًا — بل تعمل داخل متصفح
        المستخدم:
      </Note>
      <pre id="features-super-admin-presentation-superadmincloudaccountscontent-pre-60-9eqvs9" className="mt-3 overflow-x-auto rounded-lg border bg-surface p-3 text-[10px] leading-5 sm:p-4 sm:text-xs sm:leading-6" dir="ltr">
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
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-61-dirbst'>
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-62-si8wd5' dir="ltr">gova</span> هو الوحيد المتصل بـ GitHub. الحسابات
        الأخرى تُحدَّث حصريًا بأوامر نشر طرفية — كل واحد يرفع مجلدًا واحدًا
        فقط: <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-63-tmdosd' dir="ltr">services/&lt;name&gt;/</span> (بما فيها{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-64-snmt1w' dir="ltr">submain</span> و<span id='features-super-admin-presentation-superadmincloudaccountscontent-text-65-cvhfhm' dir="ltr">sub2main</span>).
      </Note>

      <SectionTitle id='features-super-admin-presentation-superadmincloudaccountscontent-sectiontitle-66-rgkcfk'>
        Turso — {glance.tursoWord} حسابات، {glance.tursoDatabases} قاعدة بيانات
      </SectionTitle>
      <TableWrap id='features-super-admin-presentation-superadmincloudaccountscontent-tablewrap-67-qi3uu7'>
        <thead id='features-super-admin-presentation-superadmincloudaccountscontent-thead-68-gcglt8' className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-69-qdyj4y'>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-70-krwwdc' className="p-2 text-start sm:p-3">الحساب</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-71-4cg4d3' className="p-2 text-start sm:p-3">قواعد البيانات</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-72-qeojyz' className="p-2 text-start sm:p-3">البريد الإلكتروني</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-73-x9wvce' className="p-2 text-start sm:p-3">النطاق</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-74-aej0xy' className="p-2 text-start sm:p-3">يُقرأ بواسطة</th>
          </tr>
        </thead>
        <tbody id='features-super-admin-presentation-superadmincloudaccountscontent-tbody-75-e5uxa4'>
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
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-76-jx8k7w'>
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-77-31tbde' dir="ltr">gova</span> و<span id='features-super-admin-presentation-superadmincloudaccountscontent-text-78-ovadgv' dir="ltr">submain</span> يحملان
        اعتمادات التشغيل الكاملة. <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-79-bvv1at' dir="ltr">sub2main</span> يحمل
        اعتمادات المنتجات وشظايا البروفايل والمستخدمين لكتابات البائع. كل
        نشرة للقراءة فقط تحمل <strong id="features-super-admin-presentation-superadmincloudaccountscontent-strong-80-tcgoop">فقط</strong> الشظايا التي تخدمها.
      </Note>

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-81-7yvjq9'>hesham101 — {tursoDatabaseCount("hesham101")} قواعد بيانات</SubTitle>
      <TableWrap id='features-super-admin-presentation-superadmincloudaccountscontent-tablewrap-82-axnqrh'>
        <thead id='features-super-admin-presentation-superadmincloudaccountscontent-thead-83-czijzj' className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-84-ayvq1s'>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-85-fv4msv' className="p-2 text-start sm:p-3">قاعدة البيانات</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-86-7fh8gd' className="p-2 text-start sm:p-3">الجداول</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-87-qzih5z' className="p-2 text-start sm:p-3">المحتوى</th>
          </tr>
        </thead>
        <tbody id='features-super-admin-presentation-superadmincloudaccountscontent-tbody-88-pwkxst'>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-89-cy3e7d' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-90-axk0rn' className="p-2 sm:p-3" dir="ltr">allusers</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-91-ke22ds' className="p-2 sm:p-3">6</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-92-xrzkon' className="p-2 sm:p-3">
              <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-93-bidpur' dir="ltr">users</span>، استرجاع كلمة المرور، أعلام
              الميزات (feature flags)، إصدارات OTA وسجل التدقيق
            </td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-94-nnq5nc' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-95-gmn3vl' className="p-2 sm:p-3" dir="ltr">advertisements</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-96-mclhag' className="p-2 sm:p-3">4</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-97-rcddy5' className="p-2 sm:p-3">
              شريط البطل (hero slider)، الشريط المميز، شريط الأكثر رواجًا
            </td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-98-qwdamg' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-99-iloqek' className="p-2 sm:p-3" dir="ltr">system-ops</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-100-fxjuxp' className="p-2 sm:p-3">9</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-101-aie9ks' className="p-2 sm:p-3">
              <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-102-l70y4p' dir="ltr">system_logs</span>،{" "}
              <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-103-1d4jxr' dir="ltr">data_health_*</span>
            </td>
          </tr>
        </tbody>
      </TableWrap>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-104-ob6qht'>
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-105-cipahn' dir="ltr">system-ops</span> انفصلت عن نفس مصدر{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-106-xneqgq' dir="ltr">profile.db</span> الذي جاءت منه شظايا البروفايل، لكنها{" "}
        <strong id="features-super-admin-presentation-superadmincloudaccountscontent-strong-107-odkixk">لم تنتقل إلى hesham105</strong>: فهي تحمل سجلات تشغيلية، لا
        بيانات بروفايل.
      </Note>

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-108-hhos1s'>hesham102 — الإشعارات</SubTitle>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-109-meagoc'>
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-110-bt9gnh' dir="ltr">asol-notifications</span> · 3 جداول —{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-111-yhzm0d' dir="ltr">user_notification_tokens</span>،{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-112-swywto' dir="ltr">user_notification_preferences</span>، بالإضافة إلى
        سجلات drizzle الداخلية.
      </Note>

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-113-kvkbxu'>hesham103 — المنتجات</SubTitle>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-114-km4jni'>
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-115-7s2kh3' dir="ltr">asol-products</span> · 8 جداول —{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-116-zjrwem' dir="ltr">products</span>، تقييمات المنتجات وردودها، تجاوزات
        بروفايل الصيدليات.
      </Note>

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-117-vimxdc'>hesham104 — {tursoDatabaseCount("hesham104")} شظايا طلبات</SubTitle>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-118-tugue8'>
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-119-b5csdn' dir="ltr">orders-core</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-120-ojqqey' dir="ltr">orders-items</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-121-jleafn' dir="ltr">orders-fulfillment</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-122-lanntj' dir="ltr">orders-delivery-plans</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-123-39kr6b' dir="ltr">orders-shipping-quotes</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-124-tienpp' dir="ltr">orders-payments</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-125-h9x13s' dir="ltr">orders-refunds</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-126-lricw5' dir="ltr">orders-after-sales</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-127-ffvr6g' dir="ltr">orders-disputes-audit</span>.
      </Note>

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-128-f91p6e'>hesham105 — {tursoDatabaseCount("hesham105")} شظايا بروفايل</SubTitle>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-129-1qdn91'>
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-130-cl137w' dir="ltr">profile-core</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-131-g32hnm' dir="ltr">profile-contact</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-132-gusd41' dir="ltr">profile-media</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-133-mc11or' dir="ltr">profile-social</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-134-i93cve' dir="ltr">profile-catalog</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-135-bp5lua' dir="ltr">profile-promotions</span> ·{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-136-npccuc' dir="ltr">profile-fulfillment</span>.
      </Note>

      <SectionTitle id='features-super-admin-presentation-superadmincloudaccountscontent-sectiontitle-137-cq4msi'>Cloudflare R2 — {glance.r2} حسابات</SectionTitle>
      <TableWrap id='features-super-admin-presentation-superadmincloudaccountscontent-tablewrap-138-osl6pu'>
        <thead id='features-super-admin-presentation-superadmincloudaccountscontent-thead-139-fxrsyj' className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-140-671noz'>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-141-jdhi0a' className="p-2 text-start sm:p-3"> </th>
            {r2Accounts.map((account) => (
              <th key={account.id} className="p-2 text-start sm:p-3">
                {account.columnLabelAr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody id='features-super-admin-presentation-superadmincloudaccountscontent-tbody-142-wni7bw'>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-143-qw0jiq' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-144-xhkf9n' className="p-2 sm:p-3">المتغيرات</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-env`} className="p-2 sm:p-3" dir="ltr">
                {account.envPrefixLabel}
              </td>
            ))}
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-145-4e82kq' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-146-atu1wu' className="p-2 sm:p-3">الحساب</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-id`} className="p-2 sm:p-3" dir="ltr">
                {abbreviateAccountId(account.accountId)}
              </td>
            ))}
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-147-tr9ba4' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-148-xbl84w' className="p-2 sm:p-3">البريد الإلكتروني</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-email`} className="p-2 sm:p-3" dir="ltr">
                {account.email}
              </td>
            ))}
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-149-ebarey' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-150-1fiwck' className="p-2 sm:p-3">الحاوية (Bucket)</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-bucket`} className="p-2 sm:p-3" dir="ltr">
                {account.bucketName}
              </td>
            ))}
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-151-zklnoa' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-152-tmsmfc' className="p-2 sm:p-3">معرّف المزوّد / الهدف</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-target`} className="p-2 sm:p-3" dir="ltr">
                {account.targetLabel}
              </td>
            ))}
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-153-x7ftf7' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-154-kkzpt4' className="p-2 sm:p-3">العنوان العام</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-url`} className="p-2 sm:p-3" dir="ltr">
                {publicHost(account.publicUrl)}
              </td>
            ))}
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-155-jwedtp'>ما الذي يحدد وجهة كل ملف</SubTitle>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-156-xhhuha'>
        ملفات الوسائط عبر بروفايلات التخزين، وإصدارات OTA عبر{" "}
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-157-elycmc' dir="ltr">@asol/ota-core</span> فقط.
      </Note>
      <TableWrap id='features-super-admin-presentation-superadmincloudaccountscontent-tablewrap-158-2zsimo'>
        <thead id='features-super-admin-presentation-superadmincloudaccountscontent-thead-159-qfklq9' className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-160-kjifte'>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-161-fpxuik' className="p-2 text-start sm:p-3">الملف الشخصي (Profile) / الوحدة</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-162-0lmg8o' className="p-2 text-start sm:p-3">الحساب</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-163-cuzr2a' className="p-2 text-start sm:p-3">مجلد السحابة</th>
          </tr>
        </thead>
        <tbody id='features-super-admin-presentation-superadmincloudaccountscontent-tbody-164-lweqe5'>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-165-qv9v56' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-166-afsgum' className="p-2 sm:p-3" dir="ltr">avatar</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-167-j2b7fp' className="p-2 sm:p-3">عام</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-168-pkbf7h' className="p-2 sm:p-3" dir="ltr">images/profile/avatars</td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-169-50w4zg' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-170-hweqoe' className="p-2 sm:p-3" dir="ltr">cover</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-171-2t3tvp' className="p-2 sm:p-3">عام</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-172-0hczys' className="p-2 sm:p-3" dir="ltr">images/profile/covers</td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-173-qbewmy' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-174-1ko9lt' className="p-2 sm:p-3" dir="ltr">home-hero-slider</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-175-vh4bqc' className="p-2 sm:p-3">عام</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-176-a2mwxr' className="p-2 sm:p-3" dir="ltr">images/content/advertisements/…</td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-177-6epqsk' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-178-mhasey' className="p-2 sm:p-3" dir="ltr">spicialOrder</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-179-glqthg' className="p-2 sm:p-3">عام</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-180-cxnbnf' className="p-2 sm:p-3" dir="ltr">images/content/spicialOrder</td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-181-0tup54' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-182-6qaa5b' className="p-2 sm:p-3" dir="ltr">product-default</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-183-mysvys' className="p-2 sm:p-3">
              <strong id="features-super-admin-presentation-superadmincloudaccountscontent-strong-184-8tkco9">المنتجات</strong>
            </td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-185-bju5pc' className="p-2 sm:p-3" dir="ltr">images/products</td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-186-dnj3cy' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-187-msgkxg' className="p-2 sm:p-3" dir="ltr">product-apparel-pets</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-188-3tsrtt' className="p-2 sm:p-3">
              <strong id="features-super-admin-presentation-superadmincloudaccountscontent-strong-189-uwtrsg">ملابس وحيوانات</strong>
            </td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-190-u0bqeh' className="p-2 sm:p-3" dir="ltr">images/products-apparel-pets</td>
          </tr>
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-191-mkj58p' className="border-t align-top">
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-192-ktltrl' className="p-2 sm:p-3" dir="ltr">@asol/ota-core</td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-193-kgequq' className="p-2 sm:p-3">
              <strong id="features-super-admin-presentation-superadmincloudaccountscontent-strong-194-pteahr">تحديثات OTA</strong>
            </td>
            <td id='features-super-admin-presentation-superadmincloudaccountscontent-td-195-fyi99p' className="p-2 sm:p-3" dir="ltr">app-updates/</td>
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle id='features-super-admin-presentation-superadmincloudaccountscontent-subtitle-196-lcadea'>المحتوى الحالي للحاويات</SubTitle>
      <TableWrap id='features-super-admin-presentation-superadmincloudaccountscontent-tablewrap-197-ii7m6m'>
        <thead id='features-super-admin-presentation-superadmincloudaccountscontent-thead-198-altt1b' className="bg-muted/50 text-xs text-on-surface-variant">
          <tr id='features-super-admin-presentation-superadmincloudaccountscontent-tr-199-9am5uz'>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-200-srun3z' className="p-2 text-start sm:p-3">الحاوية</th>
            <th id='features-super-admin-presentation-superadmincloudaccountscontent-th-201-yfgkuw' className="p-2 text-start sm:p-3">الاستخدام</th>
          </tr>
        </thead>
        <tbody id='features-super-admin-presentation-superadmincloudaccountscontent-tbody-202-28vjfy'>
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

      <SectionTitle id='features-super-admin-presentation-superadmincloudaccountscontent-sectiontitle-203-ajqlzx'>أين تعيش الاعتمادات (credentials)</SectionTitle>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-204-ex3vdr'>لا شيء هنا هو مخزن أسرار. كل قيمة هي متغير بيئة في الملفات المحلية والنسخ الاحتياطي المشفّر فقط.</Note>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-205-zhwszj'>
        <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-206-e0fiyt' dir="ltr">npm run db:push:vercel-env</span> يدفع مجموعة متغيرات
        طرف الخادم إلى مشروع <span id='features-super-admin-presentation-superadmincloudaccountscontent-text-207-ul20ul' dir="ltr">gova</span>. أوامر نشر الخدمات
        تزامن فقط ما يحتاجه كل حساب — بدون رموز نشر الحسابات الأخرى.
      </Note>
      <Note id='features-super-admin-presentation-superadmincloudaccountscontent-note-208-yq87ox'>
        <strong id="features-super-admin-presentation-superadmincloudaccountscontent-strong-209-fe7hcw">القيمة الاحتياطية (fallback) التي تعبر حدود حساب ليست
        قيمة افتراضية — إنها إعادة توجيه صامتة.</strong> كل سلسلة كهذه أُزيلت؛
        القيمة المفقودة الآن تفشل بصوت واضح.
      </Note>
    </main>
  );
}
