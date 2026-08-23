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
    <main className="mx-auto w-full max-w-5xl space-y-2 p-4 pb-24" dir="rtl">
      <header className="flex flex-wrap items-center gap-3">
        <Cloud className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold text-on-surface sm:text-2xl">
            الحسابات السحابية
          </h1>
          <p className="text-sm text-on-surface-variant">
            {glance.vercelWord} حسابات Vercel و{glance.tursoWord} Turso و
            {glance.r2Word} R2.{" "}
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
        لمعرفة أي متغير يحمل أي قيمة. جداول Vercel وR2 تُشتق من إعلانات
        الحزم؛ عند إضافة حساب في الكود تتحدث الصفحة تلقائياً.
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
            <td className="p-2 sm:p-3">{glance.vercel}</td>
            <td className="p-2 sm:p-3">نشرة واحدة لكل حساب</td>
          </tr>
          <tr className="border-t">
            <td className="p-2 sm:p-3">Turso</td>
            <td className="p-2 sm:p-3">{glance.turso}</td>
            <td className="p-2 sm:p-3">
              {glance.tursoDatabases} قاعدة بيانات (مجموع الشظايا المعلنة)
            </td>
          </tr>
          <tr className="border-t">
            <td className="p-2 sm:p-3">Cloudflare R2</td>
            <td className="p-2 sm:p-3">{glance.r2}</td>
            <td className="p-2 sm:p-3">{glance.r2} حاويات منفصلة تماماً</td>
          </tr>
        </tbody>
      </TableWrap>
      <Note>
        الرقم {glance.vercelWord} لحسابات Vercel:{" "}
        <strong>حساب واحد لكل نشرة.</strong>{" "}
        <span dir="ltr">gova</span> هو التطبيق الكامل عبر GitHub؛ الباقي
        خدمات معزولة تُنشر من{" "}
        <span dir="ltr">services/&lt;name&gt;/</span> عبر أوامر طرفية — بما فيها{" "}
        <span dir="ltr">submain</span> (بحث وسلة وطلبات) و{" "}
        <span dir="ltr">sub2main</span> (كتابات البائع). الجسر (bridge) في
        المتصفح يوجّه الطلبات؛ لا يوجد اتصال خادم-إلى-خادم بين الحسابات.
      </Note>

      <SectionTitle>Vercel — {glance.vercelWord} حسابات</SectionTitle>
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
        <span dir="ltr">gova</span> هو الوحيد المتصل بـ GitHub. الحسابات
        الأخرى تُحدَّث حصريًا بأوامر نشر طرفية — كل واحد يرفع مجلدًا واحدًا
        فقط: <span dir="ltr">services/&lt;name&gt;/</span> (بما فيها{" "}
        <span dir="ltr">submain</span> و<span dir="ltr">sub2main</span>).
      </Note>

      <SectionTitle>
        Turso — {glance.tursoWord} حسابات، {glance.tursoDatabases} قاعدة بيانات
      </SectionTitle>
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
      <Note>
        <span dir="ltr">gova</span> و<span dir="ltr">submain</span> يحملان
        اعتمادات التشغيل الكاملة. <span dir="ltr">sub2main</span> يحمل
        اعتمادات المنتجات وشظايا البروفايل والمستخدمين لكتابات البائع. كل
        نشرة للقراءة فقط تحمل <strong>فقط</strong> الشظايا التي تخدمها.
      </Note>

      <SubTitle>hesham101 — {tursoDatabaseCount("hesham101")} قواعد بيانات</SubTitle>
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

      <SubTitle>hesham103 — المنتجات</SubTitle>
      <Note>
        <span dir="ltr">asol-products</span> · 8 جداول —{" "}
        <span dir="ltr">products</span>، تقييمات المنتجات وردودها، تجاوزات
        بروفايل الصيدليات.
      </Note>

      <SubTitle>hesham104 — {tursoDatabaseCount("hesham104")} شظايا طلبات</SubTitle>
      <Note>
        <span dir="ltr">orders-core</span> ·{" "}
        <span dir="ltr">orders-items</span> ·{" "}
        <span dir="ltr">orders-fulfillment</span> ·{" "}
        <span dir="ltr">orders-delivery-plans</span> ·{" "}
        <span dir="ltr">orders-shipping-quotes</span> ·{" "}
        <span dir="ltr">orders-payments</span> ·{" "}
        <span dir="ltr">orders-refunds</span> ·{" "}
        <span dir="ltr">orders-after-sales</span> ·{" "}
        <span dir="ltr">orders-disputes-audit</span>.
      </Note>

      <SubTitle>hesham105 — {tursoDatabaseCount("hesham105")} شظايا بروفايل</SubTitle>
      <Note>
        <span dir="ltr">profile-core</span> ·{" "}
        <span dir="ltr">profile-contact</span> ·{" "}
        <span dir="ltr">profile-media</span> ·{" "}
        <span dir="ltr">profile-social</span> ·{" "}
        <span dir="ltr">profile-catalog</span> ·{" "}
        <span dir="ltr">profile-promotions</span> ·{" "}
        <span dir="ltr">profile-fulfillment</span>.
      </Note>

      <SectionTitle>Cloudflare R2 — {glance.r2} حسابات</SectionTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3"> </th>
            {r2Accounts.map((account) => (
              <th key={account.id} className="p-2 text-start sm:p-3">
                {account.columnLabelAr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">المتغيرات</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-env`} className="p-2 sm:p-3" dir="ltr">
                {account.envPrefixLabel}
              </td>
            ))}
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">الحساب</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-id`} className="p-2 sm:p-3" dir="ltr">
                {abbreviateAccountId(account.accountId)}
              </td>
            ))}
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">البريد الإلكتروني</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-email`} className="p-2 sm:p-3" dir="ltr">
                {account.email}
              </td>
            ))}
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">الحاوية (Bucket)</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-bucket`} className="p-2 sm:p-3" dir="ltr">
                {account.bucketName}
              </td>
            ))}
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">معرّف المزوّد / الهدف</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-target`} className="p-2 sm:p-3" dir="ltr">
                {account.targetLabel}
              </td>
            ))}
          </tr>
          <tr className="border-t align-top">
            <td className="p-2 sm:p-3">العنوان العام</td>
            {r2Accounts.map((account) => (
              <td key={`${account.id}-url`} className="p-2 sm:p-3" dir="ltr">
                {publicHost(account.publicUrl)}
              </td>
            ))}
          </tr>
        </tbody>
      </TableWrap>

      <SubTitle>ما الذي يحدد وجهة كل ملف</SubTitle>
      <Note>
        ملفات الوسائط عبر بروفايلات التخزين، وإصدارات OTA عبر{" "}
        <span dir="ltr">@asol/ota-core</span> فقط.
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

      <SubTitle>المحتوى الحالي للحاويات</SubTitle>
      <TableWrap>
        <thead className="bg-muted/50 text-xs text-on-surface-variant">
          <tr>
            <th className="p-2 text-start sm:p-3">الحاوية</th>
            <th className="p-2 text-start sm:p-3">الاستخدام</th>
          </tr>
        </thead>
        <tbody>
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

      <SectionTitle>أين تعيش الاعتمادات (credentials)</SectionTitle>
      <Note>لا شيء هنا هو مخزن أسرار. كل قيمة هي متغير بيئة في الملفات المحلية والنسخ الاحتياطي المشفّر فقط.</Note>
      <Note>
        <span dir="ltr">npm run db:push:vercel-env</span> يدفع مجموعة متغيرات
        طرف الخادم إلى مشروع <span dir="ltr">gova</span>. أوامر نشر الخدمات
        تزامن فقط ما يحتاجه كل حساب — بدون رموز نشر الحسابات الأخرى.
      </Note>
      <Note>
        <strong>القيمة الاحتياطية (fallback) التي تعبر حدود حساب ليست
        قيمة افتراضية — إنها إعادة توجيه صامتة.</strong> كل سلسلة كهذه أُزيلت؛
        القيمة المفقودة الآن تفشل بصوت واضح.
      </Note>
    </main>
  );
}
