# الوكيل 1: سلطة التحكم والنشر

## الفرع

- يعمل على فرع محلي فقط: `codex/asol-control-authority` داخل worktree مستقل، بلا upstream وبلا GitHub branch.
- لا يعدل `main` إطلاقًا؛ يحدّث ملف النقاش فقط على فرع التنسيق `codex/asol-control-coordination`.
- لا ينفذ `git push` أو أي رفع إلى GitHub؛ كل commits محلية فقط.

## بروتوكول البدء والمراجعة

- يقرأ هذه الخطة أولًا من `note/asol-control-agent-01-control-authority.md`، ثم آخر commit في `note/asol-control-06-agent-discussion.md` على worktree التنسيق.
- بعد التنفيذ يراجع تنفيذ الوكيل 2 وخطته `note/asol-control-agent-02-api-routing.md` نقديًا قبل قبول دمجه المحلي.

## الهدف

جعل `asol-control` المالك الوحيد لـ `deploy:all`, `deploy:push`, `deploy:revision`, Vercel Sandbox, deploy secrets, service deploy tokens, وproduction deploy callbacks.

يبقى `gova` فقط: GitHub-linked main app + normal Vercel build + domain `https://gova-swart.vercel.app`.

## قرار معماري ملزم

`asol-control` حساب/مشروع تحكم تشغيلي ثامن، وليس سابع خدمات المنتج الست. الخدمات الست التي ينشرها `deploy:all` هي فقط: `notifications` و`products` و`orders` و`profiles` و`submain` و`sub2main`. ويجوز أن يكون له مصدر مستقل تحت `services/control` لأنه سطح تحكم إداري فقط، لكنه لا يدخل أبدًا في قوائم خدمات المنتج أو probes الخاصة بها.

الانتقال ذرّي: لا يُغيّر workflow إلى عنوان التحكم قبل إنشاء مشروع `asol-control` ونشر نسخة seed منه والتحقق نصيًا من مساري GitHub/status. هذا bootstrap شرط سابق للاقتطاع وليس طبقة توافق أو نشرًا للمستخدمين.

## عزل الحسابات غير القابل للتفاوض

1. `gova` هو المشروع الوحيد المرتبط بـGitHub. لا يجوز ربط `asol-control` أو أي من الخدمات الست بمستودع GitHub أو إنشاء Git deployment لها.
2. كل الخدمات الست و`gova` و`asol-control` تمنع اتصال backend-to-backend: لا URL داخلي، لا `fetch` لخدمة شقيقة، لا token لحساب شقيق، لا project/team ID لحساب شقيق، ولا import لـdeclaration غير بابها الخاص.
3. `asol-control` هو استثناء الإدارة الوحيد: runner النشر فقط يعرف أهداف Vercel الستة كي ينفذ `deploy:all`. هذه المعرفة محصورة في secret runtime المنسق وVercel Sandbox، لا تصل إلى route responses أو browser bundle أو أي service mirror.
4. المتصفح وstatic/native bundle يحملان عناوين HTTPS عامة فقط لتوجيه الطلب؛ لا تعد هذه بيانات حساب أو أسرار، ولا يجوز أن تقرأها server routes أو service runtimes. هذا الحد الأدنى الضروري لأن المتصفح هو الموصل المتفق عليه.

## حالة المشروع المنشأ

- Vercel scope: `01026546550`
- Project: `asol-control`
- Project ID: `prj_Pi7FQmsTr4qlvLGyhUK3tBSwbm5y`
- لا يوجد Git repository link أو deployment حتى الآن.
- لا تفترض `https://asol-control.vercel.app`: يثبت `ASOL_CONTROL_BASE_URL` فقط من production alias الذي يرجعه أول نشر seed ناجح.

## ملفات يملكها

- `.github/workflows/deploy-main.yml`
- `package.json`
- `packages/account-declarations/src/accounts/gova.ts`
- `packages/account-declarations/src/accounts/control.ts`
- `packages/account-declarations/src/index.ts`
- `packages/control-composition/**`
- `packages/vercel-deploy-core/src/index.ts`
- `packages/vercel-deploy-core/src/remote-deploy-sandbox.ts`
- `packages/vercel-deploy-core/src/remote-deploy-contracts.ts`
- `scripts/push-production-deploy-env.ts`
- `scripts/check-vercel-accounts.ts`
- `scripts/push-vercel-turso-env.ts`
- `scripts/check-production-smoke.ts`
- `scripts/check-service-smoke.ts`
- `scripts/check-deployed-release.ts`
- `scripts/deployed-origin-resolution.ts`
- `scripts/ensure-release-command-secrets.ts`
- `scripts/ensure-release-secrets-restored.ts`
- `scripts/vercel-deployment-guards.ts`
- `scripts/vercel-deployment-build.ts`
- `scripts/gate-step-checkpoints.ts`
- `scripts/generated-gate-contract.ts`
- `scripts/secret-presence-status.ts`
- `scripts/probe-notifications-service.ts`
- `scripts/deploy-notifications-service.ts`
- `scripts/deploy-orders-service.ts`
- `scripts/deploy-products-service.ts`
- `scripts/deploy-profiles-service.ts`
- `scripts/deploy-submain.ts`
- `scripts/deploy-sub2main.ts`
- `packages/release-core/src/**`
- `packages/account-declarations/src/accounts/gova-runtime-env-keys.ts`
- `scripts/deploy-all.ts`
- `scripts/deploy-push.ts`
- `scripts/redeploy-main-vercel.ts`
- `services/control/**`
- `packages/architecture-core/src/registry/capability-registry.ts`
- `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`
- `packages/architecture-core/src/checks/account-bridge-contract.ts`
- `scripts/verify-service-mirrors.ts`
- `scripts/build-all-services.ts`
- `scripts/release-service-smoke-probes.ts`
- `scripts/deployed-origin-resolution.ts`
- `scripts/deploy-push-target-choice.ts`
- `scripts/check-deployed-origins.ts`
- `scripts/tests/deploy-all.test.ts`
- `scripts/tests/deploy-all-resume.test.ts`
- `scripts/tests/github-ci-policy.test.ts`
- `scripts/tests/vercel-deployment-guards.test.ts`
- `docs/01-architecture/02-packages/module-isolation-rules.md`
- `docs/01-architecture/07-enforcement/build-test-gates.md`
- `docs/01-architecture/08-reference/architecture-diagrams.md`
- `src/app/api/super-admin/production-deploy/route.ts`
- `src/app/api/super-admin/production-deploy/github/route.ts`
- `src/app/api/super-admin/production-deploy/callback/route.ts`
- `src/features/release-commands/server/services/production-deploy-notification-delivery.server.ts`

## ممنوع عليه

- `packages/account-bridge/**`
- `packages/*-composition/**` ما عدا `packages/control-composition/**`
- `services/**` ما عدا `services/control/**`
- `src/core/api/**`
- `src/core/config/public-env.ts`
- كل `src/app/api/**` ما عدا production-deploy routes
- كل `docs/**` ما عدا الملفات الثلاثة المملوكة أعلاه، وبـ`[docs-contract-change]` فقط
- صفحة حسابات السحابة ومرجعها

## التنفيذ

1. أنشئ `CONTROL_DECLARATION`:
   - `name: "control"`
   - `project: "asol-control"`
   - `tokenEnvVar: "VERCEL_CONTROL_TOKEN"`
   - `teamIdEnvVar: "VERCEL_CONTROL_ORG_ID"`
   - `serviceDir: "services/control"`
2. أضف باب export `@asol/account-declarations/control` وأنشئ `services/control` و`packages/control-composition`. لا تسجل token أو أي قيمة سرية في Git أو `note/`.
3. انقل routes التحكم إلى `services/control`.
4. اجعل production-deploy routes على `gova` ترجع `410 Gone`:
   - `{ "error": "productionDeployMovedToControl" }`
5. نفذ bootstrap قابلًا للتدقيق قبل تغيير workflow: تحقّق من هوية `asol-control` وproject link بدون طباعة token، انشر seed من commit الاقتطاع، ثم نفذ طلبات HTTP نصية موثقة إلى endpoint GitHub وstatus.
6. غيّر GitHub workflow إلى origin `ASOL_CONTROL_BASE_URL` المثبت من seed deployment ثم `/api/super-admin/production-deploy/github`؛ لا تضع domain مخمّنًا. يبقى GitHub/Vercel هو الذي يبني `gova` تلقائيًا من `main`: لا ينشئ `deploy:all` نشرًا ثانيًا لـ`gova`، بل يطابق SHA ويَنتظر deployment الجاهز ثم يتحقق منه.
7. اجعل `scripts/push-production-deploy-env.ts` يكتب إلى `asol-control` ويرفض `gova`.
8. عدّل `deploy:all` ليعمل من `asol-control` وينشر الخدمات الست ويتحقق من `gova`. لا تضف `control` إلى `SERVICE_PHASE_IDS` أو `ALL_DEPLOY_PUSH_TARGETS` أو service smoke الستة؛ له تحقق control منفصل.
9. أنشئ `@asol/control-composition` حسب قواعد إنشاء الحزم: package manifest، export واحد، اختبار ضمن `test:compositions`، تسجيل capability registry وfeature seams الدقيقة فقط. حدّث كل العقود العددية التي تفترض 41 package أو 6 compositions باستخدام `[docs-contract-change]`، ولا تعدل catalog مولد يدويًا.
10. أضف `ASOL_DEPLOYMENT_ACCOUNT=gova` إلى بيئة إنتاج gova كشرط تشغيل، ولا تمنح gova أي secret خاص بالنشر أو قواعد بيانات أو R2 أو push أو OTA. يبقى فقط public origins اللازمة لبناء الواجهة.
11. اجعل workflow يتجاهل تغييرات `note/asol-control-06-agent-discussion.md` حتى لا تخلق رسائل التنسيق نشرًا إنتاجيًا. وبعد الاقتطاع يجب أن يستدعي فقط origin `asol-control`.
12. أضف فحصًا في deployment tooling يفشل عند: Git integration في أي مشروع غير `gova`، أو وجود deployment token/team/project ID لحساب أجنبي في env/service manifest، أو استدعاء HTTP من runtime إلى deployed sibling. فحص `control` يسمح فقط ببيانات deploy المحصورة في runner ولا يسمح بها في routes.
13. قبل أول نشر كامل، أنشئ جدولًا مشتقًا من imports الفعلية لكل route تحكم يحدد كل env key لازم لـ`control`، وكل key لازم لكل خدمة، والـowner الوحيد له. لا يجوز دفع env أو حذف env اعتمادًا على قائمة تقديرية. يجب أن تحمل `control` كل مفاتيح التحقق من جلسة Super Admin وsystem logs وOTA admin التي يكشفها الجدول، بينما لا يحتفظ `gova` بأي server-only key.
14. نفذ preflight ذريًا قبل السماح للـworkflow أو `deploy:all` بإصدار أي deployment: ثبّت seed alias، ثبّت public origins للخدمات السبع، ثبّت env names-only لكل owner، اجتز `services:verify` ومصفوفة route+method، وتحقق من readiness لـSHA نفسه على `gova`. أي نقص يمنع التنفيذ ولا توجد إعادة توجيه أو fallback على `gova`.
15. أزل الاستدعاء الخلفي الحالي من production-deploy إلى خدمة notifications (`postAbsoluteJson`): هو يخالف العزل الصارم. قبل التنفيذ يقرر المالك أحد عقدين فقط ويكتبه في النقاش: (أ) إلغاء إشعار النشر، أو (ب) تحويله إلى grants موقعة يعيدها control للمتصفح ليوصلها browser إلى notifications. لا يوجد backend-to-backend بديل صامت، ولا يبدأ الاقتطاع قبل هذا القرار لأن المحافظة الحرفية على إشعار webhook فوري تتعارض منطقيًا مع قاعدة عدم الاتصال الخلفي.
16. حدّث كل أدوات deployment/smoke/release المملوكة أعلاه من نموذج seven targets القديم إلى `gova + six services + control`، مع فصل control عن service loops. لا تستخدم `NEXT_PUBLIC_ASOL_API_BASE_URL` كدليل على business API؛ خريطة readiness يجب أن تختبر كل public origin مستقلًا وتمنع origin مفقود أو fallback إلى `gova`.

## وصول الأسرار للوكلاء

كل الوكلاء يعملون من بيئة تنفيذ محلية مشتركة تستعاد فيها الأسرار من archive عبر `npm run secrets:restore` وتتحقق أسماءها فقط عبر `npm run secrets:verify`. يحق لكل وكيل الوصول إلى كل secret لازم لفحص عمله، لكن لا ينسخ قيمة إلى branch أو Git أو `note/` أو output. لا تُسقط أسرار الوكلاء في service mirrors أو Vercel runtime إلا بعد إسقاطها إلى أقل مجموعة مطلوبة للحساب الهدف.

## اختبارات

```bash
npm run test:vercel-deploy-core
npm run test:deployment-tools
npm run test:release-core
npm run test:release-commands
npm run test:cloud-accounts
npm run test:compositions
npm run secrets:verify
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
```

## يسلم للوكيل 5

- قائمة متغيرات يجب حذفها من `gova`.
- قائمة متغيرات يجب وجودها على `asol-control`.
- دليل أن `gova` لم يعد يملك deploy authority.
- commit foundation hash الذي يجب أن يبني عليه الوكلاء 2 و3 و4.

## مراجعة متقاطعة

بعد انتهاء التنفيذ، يراجع الوكيل 1 عمل الوكيل 2 نقديًا.
