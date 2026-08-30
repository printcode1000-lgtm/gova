# الوكيل 5: صفحة حسابات السحابة والوثائق والتنسيق النهائي

## الفرع

- يعمل على فرع محلي فقط: `codex/asol-control-docs-ui-final` داخل worktree مستقل، بلا upstream وبلا GitHub branch.
- لا يعدل `main` إطلاقًا؛ يحدّث ملف النقاش فقط على فرع التنسيق `codex/asol-control-coordination`.
- بعد اكتمال المراجعات المتقاطعة، هو من ينظم الرفع النهائي إلى `main`.
- لا ينفذ `git push` أو أي رفع إلى GitHub؛ ينظم دمجًا محليًا فقط ويعرض النتيجة للمستخدم.

## بروتوكول البدء والمراجعة

- يقرأ هذه الخطة أولًا من `note/asol-control-agent-05-docs-ui-final-merge.md`، ثم آخر commit في `note/asol-control-06-agent-discussion.md` على worktree التنسيق.
- بعد التنفيذ يراجع تنفيذ الوكيل 1 وخطته `note/asol-control-agent-01-control-authority.md` نقديًا قبل قبول دمجه المحلي.

## الهدف

تحديث واجهة حسابات السحابة والوثائق، تنظيف Vercel env، تجميع نتائج الوكلاء، ثم تنظيم الدمج النهائي.

## دمج ذري ملزم

لا يُدمج أي فرع تنفيذي منفردًا إلى `main`: كل push إلى `main` يطلق workflow النشر. بعد قبول المراجعات، يجمع الوكيل 5 commits الوكلاء 1-4 في فرع الوكيل 5، يحل التعارضات فقط وفق مصفوفة النقاش، يضيف وثائقه ويشغل الفحوص، ثم ينتج commit/merge محليًا مكتملًا جاهزًا للمستخدم. لا يرفع أي شيء إلى GitHub.

## ملفات يملكها

- `src/features/super-admin/presentation/cloud-accounts-reference.ts`
- `src/features/super-admin/presentation/SuperAdminCloudAccountsContent.tsx`
- `src/features/super-admin/tests/cloud-accounts-emails.test.ts`
- `docs/06-super-admin-and-operations/cloud-accounts-architecture.md`
- `docs/06-super-admin-and-operations/super-admin-cloud-accounts.md`
- `docs/06-super-admin-and-operations/super-admin-production-deploy.md`
- `docs/07-mobile-and-release/deployment-targets.md`
- `docs/05-platform-features/service-bridge-module.md`
- `docs/05-platform-features/notification-bridge-module.md`
- `docs/02-data-and-storage/environment-variables.md`
- `docs/09-agent-knowledge/generated/**` بعد `npm run docs:generate`

## ممنوع عليه

- ملفات تنفيذ الوكلاء 1 إلى 4.
- إصلاح أخطاء التنفيذ داخل ملفاتهم.
- تعديل route أو deploy logic مباشرة.

## التنفيذ

1. اقرأ `docs/04-ui-components/touch-interaction-policy.md` قبل أي UI.
2. حدّث صفحة حسابات السحابة لتعرض:
   - `gova`: frontend/pages/static assets/`.well-known`/`health` فقط.
   - `asol-control`: `deploy:all`, Sandbox, Super Admin ops, system logs, OTA admin.
   - `submain`: auth/account/contact/ads/follow/search/orders detail/actions/specialty-chat/OTA access.
   - `orders`: `GET /api/orders`.
   - `sub2main`: seller writes/product writes/profile writes/uploads.
   - `products`: product reads/reviews/storage reads.
   - `profiles`: profile reads/reviews/profile storage reads.
   - `notifications`: notifications كاملة.
   - لا تعرض URL لـ`asol-control` قبل أن يثبته seed deployment؛ اعرض role/project فقط.
3. احذف من الصفحة والوثائق أي نص يقول إن `gova` يخدم التطبيق الكامل أو يملك production deploy.
4. أضف test يفشل إذا بقي الوصف القديم.
5. حدّث docs بالإنجليزية فقط.
6. شغّل `npm run docs:generate`.
7. نظف Vercel env:
   - احذف deploy/server-only env من `gova`.
   - ثبت deploy env على `asol-control`.
   - لا تطبع قيم الأسرار.
8. لا تنقل أو تحذف secret قبل أن يثبت check names-only أن البديل موجود في الحساب الصحيح؛ لا تطبع قيمة. تحقق من أن `gova` لا يملك secrets DB/R2/OTA/push/deploy وأن public origins وحدها المتوقعة باقية.
9. راجع في Vercel dashboard/CLI نصيًا أن `gova` وحده Git-linked، وأن المشاريع السبعة الأخرى ليس لها Git repository. راجع names-only للمتغيرات: لا حساب يحتوي token/team/project ID أو `NEXT_PUBLIC` origin لحساب آخر؛ لا استثناء إلا secrets deploy داخل control runner.
10. بعد مراجعات الوكلاء لبعضهم، نظم الدمج الذري إلى `main`.
11. لا تعتبر فحوص التكامل ناجحة إلا إذا استخدمت hashes التسليم المعتمدة للوكلاء 1-4، وفحصت أن `deploy:all` ينتظر deployment `gova` التلقائي للـSHA بدل إنشاء نشر `gova` موازٍ.
12. شغّل مقارنة خط الأساس التي سلّمها الوكيل 2 مقابل mirrors الوكيل 3 ثم guard الوكيل 4. وتحقق من فشل production/static/native عند غياب public origin بدل fallback إلى `gova`. يوثق التقرير أسماء routes وmethods فقط، لا أسرار أو responses حساسة.

## دورة الأسرار الملزمة

1. قبل التنفيذ: يستعيد كل وكيل archive محليًا أو يستخدم بيئة الأسرار المشتركة، ثم يشغل `npm run secrets:verify` فقط.
2. أثناء التنفيذ: لا يوثق إلا أسماء المتغيرات وحالة present/missing؛ لا قيمة ولا archive ولا project config سري في Git.
3. بعد تحقق التحويل والنشر المعتمد: يدوّر المالك كل credentials التي أتيحت للوكلاء، وخصوصًا deploy tokens وTurso/R2/push/session/password-recovery/OTA، ويزيل القديمة من كل Vercel project.
4. أخيرًا يحدّث archive محليًا بـ`npm run secrets:backup` ويعيد `npm run secrets:verify`؛ نجاح التدوير يعني أن القيم القديمة لا تعمل وأن names-only report مكتمل.

## ترتيب الدمج النهائي

1. اجلب commits الوكلاء 1، 2، 3، 4 إلى فرع الوكيل 5، دون push إلى `main`.
2. شغّل `services:sync` وdocs generation في الفرع الموحّد ثم أضف وثائق/واجهة الوكيل 5.
3. تشغيل كل أوامر التحقق النهائية.
4. حدّث ملف النقاش بنتيجة الفحوص والمراجعات.
5. نفذ merge محليًا واحدًا فقط إلى `main` بعد إذن صريح منفصل من المستخدم؛ لا تنفذ `git push`.
6. تحقق نصيًا من workflow الناتج، وأجّل أي نشر فعلي إلى إذن صريح منفصل من المستخدم.

## اختبارات نهائية

```bash
npm run docs:generate
npm run secrets:verify
npm run services:sync
npm run services:verify
npm run test:account-bridge
npm run test:account-declarations
npm run test:vercel-deploy-core
npm run test:deployment-tools
npm run test:release-core
npm run test:release-commands
npm run test:cloud-accounts
npx tsx src/features/super-admin/tests/cloud-accounts-emails.test.ts
npm run test:notifications
npm run test:auth-email-uniqueness
npm run test:account-deletion-registry
npm run typecheck
npm run lint
npm run architecture:check
npm run docs:ci
npm run runtime:check
npm run build
```

## بوابة عدم الفقد

قبل اعتبار التحويل ناجحًا، شغّل مقارنة contract لكل route+method في مصفوفة الوكيل 2: destination الصحيح، status/error code، authorization عبر `x-asol-session-token`، و`OPTIONS` عند وجوده. تنفذ المقارنة في Development وWeb وStatic `out/` وAndroid وiOS عبر فحوص runtime غير ناشرة. أي مسار مستخدم بلا اختبار أو أي اختلاف غير مقصود في contract مانع للقبول.

## مراجعة متقاطعة

بعد انتهاء التنفيذ، يراجع الوكيل 5 عمل الوكيل 1 نقديًا.

## شروط القبول

- `gova` frontend فقط.
- `asol-control` deploy authority كامل.
- Auth خارج `gova`.
- صفحة حسابات السحابة محدثة.
- docs محدثة.
- Vercel env منظف.
- كل المراجعات المتقاطعة مكتوبة في ملف النقاش.
- `gova` وحده Git-linked، وبقية المشاريع لا تعرف حسابًا شقيقًا خارج runner `asol-control` المحصور.
