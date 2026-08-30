# الوكيل 3: نقل تنفيذ APIs إلى الخدمات

## الفرع

- يعمل على فرع محلي فقط: `codex/asol-control-service-extraction` داخل worktree مستقل، بلا upstream وبلا GitHub branch.
- لا يعدل `main` إطلاقًا؛ يحدّث ملف النقاش فقط على فرع التنسيق `codex/asol-control-coordination`.
- لا ينفذ `git push` أو أي رفع إلى GitHub؛ كل commits محلية فقط.

## بروتوكول البدء والمراجعة

- يقرأ هذه الخطة أولًا من `note/asol-control-agent-03-service-extraction.md`، ثم آخر commit في `note/asol-control-06-agent-discussion.md` على worktree التنسيق.
- بعد التنفيذ يراجع تنفيذ الوكيل 4 وخطته `note/asol-control-agent-04-gova-api-shutdown.md` نقديًا قبل قبول دمجه المحلي.

## الهدف

جعل الخدمات تنفذ التصنيف الذي وضعه الوكيل 2، مع نقل Auth الآن إلى `submain`.

## حارس ضد فقدان السلوك

لا يُنشأ route handler بديل مختصر. تبقى handlers الفعلية المصدرية قابلة للـmirror، وتوسّع mirror entry points وcomposition فقط بعد استلام مصفوفة route+method النهائية من الوكيل 2. كل handler منقول يجب أن يحافظ على status/body/error code و`OPTIONS` وقواعد authorization كما كانت.

## أسرار التنفيذ

تتاح للوكيل بيئة الأسرار المحلية الكاملة للتحقق، لكن manifest أو Vercel env لكل خدمة يستقبل فقط أسرار اختصاصه من declaration. قبل وبعد كل push env يستخدم `npm run secrets:verify` أو check names-only؛ ممنوع طباعة أو تمرير قيمة secret في test output أو ملف النقاش.

## ملفات يملكها

- `packages/account-declarations/src/accounts/submain.ts`
- `packages/account-declarations/src/accounts/sub2main.ts`
- `packages/account-declarations/src/accounts/submain-runtime-env-keys.ts`
- `packages/account-declarations/src/accounts/sub2main-runtime-env-keys.ts`
- `packages/account-declarations/src/accounts/notifications.ts`
- `packages/account-declarations/src/accounts/products.ts`
- `packages/account-declarations/src/accounts/orders.ts`
- `packages/account-declarations/src/accounts/profiles.ts`
- `packages/submain-composition/src/index.ts`
- `packages/sub2main-composition/src/index.ts`
- `packages/notifications-composition/src/index.ts`
- `packages/products-composition/src/index.ts`
- `packages/orders-composition/src/index.ts`
- `packages/profiles-composition/src/index.ts`
- `scripts/sync-notifications-service-sources.ts`
- `scripts/sync-products-service-sources.ts`
- `scripts/sync-orders-service-sources.ts`
- `scripts/sync-profiles-service-sources.ts`
- `scripts/sync-submain-service-sources.ts`
- `scripts/sync-sub2main-service-sources.ts`
- generated service manifests after `npm run services:sync`

## ممنوع عليه

- `packages/account-bridge/**`
- `src/core/api/**`
- `src/core/config/public-env.ts`
- `src/app/api/**`
- `packages/account-declarations/src/accounts/gova.ts`
- `packages/account-declarations/src/accounts/control.ts`
- `packages/account-declarations/src/index.ts`
- `packages/vercel-deploy-core/**`
- `services/control/**`
- `packages/control-composition/**`
- كل `docs/**`
- صفحة حسابات السحابة ومرجعها

## التنفيذ

1. انقل Auth إلى `submain` عبر mirror entries:
   - `app/api/auth/login/route.ts`
   - `app/api/auth/register/route.ts`
   - `app/api/auth/logout/route.ts`
   - `app/api/auth/profile/route.ts`
   - `app/api/auth/check-phone/route.ts`
   - `app/api/auth/password-recovery/request/route.ts`
   - `app/api/auth/password-recovery/verify/route.ts`
   - `app/api/auth/password-recovery/reset/route.ts`
2. أضف إلى `submain` env:
   - `ASOL_SESSION_SIGNING_SECRET`
   - `PASSWORD_RECOVERY_GMAIL_USER`
   - `PASSWORD_RECOVERY_GMAIL_APP_PASSWORD`
   - `PASSWORD_RECOVERY_SIGNING_SECRET`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. انقل account/contact/ads/follow/feature flags/orders detail/actions/specialty-chat/OTA access إلى `submain`، مع كل methods الخاصة بها، وليس مسارًا واحدًا فقط.
4. انقل notifications كاملة إلى `notifications`.
5. أبقِ product reads/reviews على `products`.
6. أبقِ product/profile writes/uploads على `sub2main`.
7. أبقِ `GET /api/orders` على `orders`.
8. طبّق CORS بلا cookies: `credentials: omit` وheader `x-asol-session-token` فقط. تضبط كل خدمة `ASOL_CORS_ORIGINS=*` وتعيد `Access-Control-Allow-Origin: *` مع `x-asol-session-token` وmethods المطلوبة في preflight. لا تعكس `Origin` ولا تضف `Access-Control-Allow-Credentials` ولا قائمة origins ثابتة تعرف مشاريع Vercel الأخرى؛ الهوية تبقى محصورة في التوكن الموقع والتحقق داخل الـhandler.
9. تأكد أن `submain` يحمل كل اعتماد Auth (session, password recovery, users Turso) وأن بقية الخدمات لا تستلم أسرار Auth أو أي `NEXT_PUBLIC_ASOL_*_URL` غير عنوانها الذاتي إن احتاجته.
10. بعد `services:sync` نفذ تدقيق manifest صارم لكل خدمة: لا توجد declaration files أو email/tokenEnvVar/teamId/project name تخص حسابًا آخر، ولا import إلى origin/HTTP sibling، ولا secret من نطاق آخر. افصل/صحح service mirror walker إن كان ينسخ package `account-declarations` كاملًا بدل باب الحساب المحدد.
11. شغّل `npm run services:sync` وراجع أن كل خدمة أخذت ملفاتها فقط، وأن `services/control` له تحقق mirror منفصل ولا يوسّع خدمة من الخدمات الست.
12. لا تبدأ تعديل mirror قبل cherry-pick محلي لأساس الوكيل 1 ومصفوفة route+method النهائية للوكيل 2. سجّل hash الأساس وhash التسليم في ملف النقاش؛ ويعاد تنفيذ اختبار العقد لكل handler في المصفوفة بعد التوليد.
13. لكل زوج route+method، قارن source وmirror في harness محلي مع نفس fixtures: status وheaders وbody/error code وauth rejection و`OPTIONS`. يعامل اختلاف واحد غير معتمد كفقد ميزة، بما في ذلك exports المعاد تصديرها أو المسارات الديناميكية.

## اختبارات

```bash
npm run services:sync
npm run services:verify
npm run test:account-declarations
npm run test:submain-composition
npm run test:sub2main-composition
npm run test:notifications-composition
npm run test:products-composition
npm run test:orders-composition
npm run test:profiles-composition
npm run test:auth-email-uniqueness
npm run test:account-deletion-registry
npm run test:service-runtime-core
npm run services:build
npm run typecheck
npm run lint
npm run architecture:check
```

## يسلم للوكيل 5

- تقرير service manifests.
- قائمة env المطلوبة لكل خدمة.
- إثبات أن Auth موجود في `submain`.

## مراجعة متقاطعة

بعد انتهاء التنفيذ، يراجع الوكيل 3 عمل الوكيل 4 نقديًا.
