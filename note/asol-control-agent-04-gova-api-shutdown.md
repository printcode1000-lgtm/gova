# الوكيل 4: إغلاق APIs على `gova`

## الفرع

- يعمل على فرع محلي فقط: `codex/asol-control-gova-api-shutdown` داخل worktree مستقل، بلا upstream وبلا GitHub branch.
- لا يعدل `main` إطلاقًا؛ يحدّث ملف النقاش فقط على فرع التنسيق `codex/asol-control-coordination`.
- لا ينفذ `git push` أو أي رفع إلى GitHub؛ كل commits محلية فقط.

## بروتوكول البدء والمراجعة

- يقرأ هذه الخطة أولًا من `note/asol-control-agent-04-gova-api-shutdown.md`، ثم آخر commit في `note/asol-control-06-agent-discussion.md` على worktree التنسيق.
- بعد التنفيذ يراجع تنفيذ الوكيل 5 وخطته `note/asol-control-agent-05-docs-ui-final-merge.md` نقديًا قبل قبول دمجه المحلي.

## الهدف

ضمان أن production `gova` لا ينفذ أي business API. يبقى فقط frontend/pages/static assets/`.well-known`/`health`.

## ملفات يملكها

- `src/app/api/**/route.ts` باستثناء `src/app/api/super-admin/production-deploy/**`
- `src/proxy.ts`
- `src/app/.well-known/**`
- `src/app/**/page.tsx` فقط عند الحاجة لإزالة اعتماد مباشر على API محلي
- `src/core/api/tests/gova-api-shutdown.test.ts`

## ممنوع عليه

- `packages/account-bridge/**`
- `packages/account-declarations/**`
- `packages/*-composition/**`
- `services/**`
- `scripts/**`
- `.github/**`
- `package.json`
- `src/core/api/asol-api-config.ts`
- `src/core/api/asol-api-routes.ts`
- `src/core/config/public-env.ts`
- `src/app/api/super-admin/production-deploy/**`
- كل `docs/**`
- صفحة حسابات السحابة ومرجعها

## التنفيذ

1. لا تغيّر handlers المصدرية إلى ردود `410`: تلك الملفات هي مدخل الـmirror للخدمات وستكسرها. نفذ الإغلاق في `src/proxy.ts` قبل route handlers، وفقط عندما يكون `NODE_ENV=production` و`ASOL_DEPLOYMENT_ACCOUNT=gova`.
2. اجعل matcher شاملًا لـ`/api/**` ويستثني فقط `/api/health` وroutes production-deploy الثلاثة كي يرجع كل منها الخطأ المتخصص الذي يملكه الوكيل 1. استثنِ `/.well-known/**` من matcher. لا يوجد bypass عبر query أو trailing slash أو method `OPTIONS`.
3. عندما لا يكون runtime هو gova production، لا يتدخل proxy؛ لذلك تبقى source handlers نفسها صالحة للخدمات والـDevelopment.
4. كل business API على production `gova` يجب أن يرجع:
   - status: `410`
   - body: `{ "error": "apiMovedToService" }`
5. لا تضف proxy عكسي أو توافق قديم.
6. أبقِ `/api/health` يعمل.
7. أبقِ `/.well-known/apple-app-site-association` و`/.well-known/assetlinks.json` يعملان.
8. `/api/dev/*` لا يعمل في production.
9. اختبر gova production guard، Development bypass، وكل service identity bypass بمصفوفة طلبات نصية. لا تعدل اختبار الوكيل 2.
10. لا يعتبر الإغلاق جاهزًا ولا يسلّم commit نهائيًا قبل cherry-pick محلي لأساس الوكيل 1 وتسليم الوكيل 3، ثم تمرير كل زوج route+method من مصفوفة الوكيل 2. يسجل hashes الثلاثة ونتيجة الاختبار في ملف النقاش.
11. ادمج guard الإغلاق مع CORS القائم في `src/proxy.ts` بلا حذف غير مقصود للـpreflight أو headers. في `gova` production يرجع كل `OPTIONS` لـbusiness API أيضًا `410` (ولا يتجاوز الإغلاق إلى handler)، بينما تبقى الخدمة المالكة هي التي تقدم preflight الناجح.

## اختبارات

```bash
npm run test
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
```

## يسلم للوكيل 5

- قائمة routes التي ترجع `410` على `gova`.
- قائمة routes التي بقيت على `gova`.

## مراجعة متقاطعة

بعد انتهاء التنفيذ، يراجع الوكيل 4 عمل الوكيل 5 نقديًا.
