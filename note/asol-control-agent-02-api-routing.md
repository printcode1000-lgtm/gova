# الوكيل 2: توجيه APIs وتصنيف كل route

## الفرع

- يعمل على فرع محلي فقط: `codex/asol-control-api-routing` داخل worktree مستقل، بلا upstream وبلا GitHub branch.
- لا يعدل `main` إطلاقًا؛ يحدّث ملف النقاش فقط على فرع التنسيق `codex/asol-control-coordination`.
- لا ينفذ `git push` أو أي رفع إلى GitHub؛ كل commits محلية فقط.

## بروتوكول البدء والمراجعة

- يقرأ هذه الخطة أولًا من `note/asol-control-agent-02-api-routing.md`، ثم آخر commit في `note/asol-control-06-agent-discussion.md` على worktree التنسيق.
- بعد التنفيذ يراجع تنفيذ الوكيل 3 وخطته `note/asol-control-agent-03-service-extraction.md` نقديًا قبل قبول دمجه المحلي.

## الهدف

منع أي business API من العمل على production `gova`. كل API يجب أن يذهب إلى خدمة محددة عبر browser bridge.

## قاعدة الاكتمال

مصدر الحقيقة هو كل `src/app/api/**/route.ts` القائم وقت التنفيذ، وليس الجدول المختصر أدناه. أنشئ مصفوفة route+method صريحة تشمل dynamic routes و`OPTIONS` وroutes بلا exports مؤقتة. يفشل الاختبار إذا كان أي زوج route/method بلا وجهة، أو له أكثر من وجهة، أو إذا صُنّف `/api/health` أو `/.well-known` كـbusiness API.

## ملفات يملكها

- `packages/account-bridge/src/index.ts`
- `packages/account-bridge/src/ports/app-bridge.ts`
- `packages/account-bridge/src/tests/index.test.ts`
- `packages/account-bridge/src/tests/service-bridge.client.test.ts`
- `src/core/api/asol-api-config.ts`
- `src/core/api/asol-api-routes.ts`
- `src/core/api/asol-api-client.ts`
- `src/core/config/public-env.ts`
- `src/core/api/tests/asol-api-route-classification.test.ts`
- `src/features/system-logs/application/services/persistent-system-log-api-service.ts`
- `src/features/google-play-console/presentation/tabs/JobsTab.tsx`
- `src/core/api/tests/asol-api-client-boundary.test.ts`
- `next.config.ts`
- `scripts/cap-build.ts`
- `scripts/cap-build-local.ts`
- `packages/ota-core/src/publishing/build/out-runtime-config.ts`
- `packages/ota-core/src/publishing/config/ota-config.ts`
- `packages/native-core/src/domain/defaults/platform-defaults.ts`

## ممنوع عليه

- `.github/workflows/deploy-main.yml`
- `package.json`
- `packages/account-declarations/**`
- `packages/vercel-deploy-core/**`
- `packages/*-composition/**`
- `services/**`
- `scripts/deploy-*`
- `scripts/sync-*service-sources.ts`
- `src/app/api/**`
- كل `docs/**`
- صفحة حسابات السحابة ومرجعها

## التوزيع الملزم

| Route | Destination |
|---|---|
| `/api/auth/*` | `submain` |
| `/api/account/delete` | `submain` |
| `/api/contact` | `submain` |
| `/api/feature-flags` | `submain` |
| `/api/advertisements/*` | `submain` |
| `/api/follow/*` | `submain` |
| `/api/search/*` | `submain` |
| `GET /api/orders` | `orders` |
| `POST /api/orders/from-cart` | `submain` |
| `POST /api/orders/custom-request-from-profile` | `submain` |
| `GET /api/orders/[orderId]` | `submain` |
| `/api/orders/[orderId]/actions` | `submain` |
| `GET /api/products`, `GET /api/products/reviews`, `GET /api/pharmacy-profile-catalog` | `products` |
| كل write لـ `/api/products*` و`POST /api/pharmacy-profile-catalog`، بما فيها reviews/helpful/reply | `sub2main` |
| كل `GET` لـ `/api/profile/*` و`GET /api/profile/reviews` | `profiles` |
| كل write لـ `/api/profile/*` وreviews/helpful/reply | `sub2main` |
| storage uploads | `sub2main` |
| profile storage reads | `profiles` |
| `DELETE /api/storage/images/[imageKey]` | `sub2main` |
| `/api/notifications/*` | `notifications` |
| `/api/ota/access` | `submain` |
| `/api/ota/admin/*` | `control` |
| `/api/system-logs/*` | `control` |
| `/api/specialty-chat/*` | `submain` |
| `/api/super-admin/*` | `control` |
| `/api/dev/*` | `development-only` |
| `/api/health` | `gova-kept` |

## التنفيذ

1. أضف service key باسم `control` وpublic origin باسم `NEXT_PUBLIC_ASOL_CONTROL_URL`، ولا تسمّه ضمن services الستة.
2. اكتب exact route maps وdynamic matchers.
3. امنع production/static/native same-origin fallback لأي business API. local fallback مسموح في Development فقط ويجب أن يبقى مستحيلًا في Web production و`out/` وAndroid وiOS.
4. أبقِ server-side routing يرجع `null` حتى لا تتصل الخدمات ببعضها.
5. أنشئ `src/core/api/tests/asol-api-route-classification.test.ts`: كل route تحت `src/app/api` يجب أن يصنف مرة واحدة فقط، مع فحص products/profile/reviews حسب method، pharmacy catalog حسب method، storage image delete، order dynamic route، وكل `super-admin` و`system-logs` و`ota/admin` إلى control.
6. انقل EventSource الخاص بـ`/api/system-logs/stream` إلى URL يبنيه `buildAsolApiUrl`؛ لا يكفي تحويل `fetch` لأن EventSource الحالي يتجاوز العميل المركزي.
7. حافظ على نموذج الهوية القائم: كل business API يبقى `credentials: 'omit'`، ويمرر الجلسة الموقعة صراحةً في `x-asol-session-token` حيث تتطلبها العملية. لا تضف cookies cross-origin أو `credentials: 'include'` أو معرفة origin لخدمة شقيقة؛ هذه كانت ستخالف العميل الحالي وسياسة العزل.
8. اجعل route map وorigins قابلة للوصول من browser/static/native فقط. server-side resolver يبقى `null`، ولا يتلقى أي service runtime `NEXT_PUBLIC_ASOL_*_URL` لحساب آخر.
9. المصفوفة هي artifact تسليم ملزم داخل مدخلة نقاش موقعة بالـcommit hash: لكل route+method سجّل destination وauth header وCORS/OPTIONS وسبب الاستثناء. لا يحق للوكيل 3 أو 4 تغييرها؛ أي route جديد أو تعديل method يعود للوكيل 2 لاعتماد مكتوب.
10. أضف اختبارًا يمنع route bridge أو response headers من كشف token/team/project ID أو تحويل request من server إلى origin خدمة أخرى.
11. سلّم للوكيل 3 مصفوفة route+method وCORS المطلوبة، وهو لا يملك تغييرها.
12. افحص كل references داخل `src/features` و`src/shared` إلى `/api/` أو `fetch` أو `EventSource`: لا يبقى استدعاء إنتاجي يتجاوز `buildAsolApiUrl`. عالج تنزيل artifacts في `JobsTab` بعقد مصادق عليه؛ رابط `<a>` لا يحمل `x-asol-session-token`، لذلك لا يجوز تحويله إلى control URL على أنه يعمل تلقائيًا. اختبر أن التنزيل الإداري لا يفقد auth أو يهبط إلى same-origin `gova`.
13. أزل من public client code أي fallback server-only مثل `ASOL_API_BASE_URL`، واجعل production/static/native يفشل بوضوح عند غياب origin للمسار المصنف بدل إرسال business API إلى `gova`. لا يطبق ذلك على `/api/health` أو الأصول العامة.
14. عدّل static/OTA/Capacitor configuration ليبني ويثبت public origins الثمانية (`gova` للـhealth/assets وسبع وجهات API) بدل `NEXT_PUBLIC_ASOL_API_BASE_URL` الواحد. يجب أن يفشل `cap-build` وOTA validation names-only عند غياب أي origin لازم، وأن يثبت اختبار Android/iOS أن كل business route يحل إلى service origin لا `gova`.
11. إذا احتجت تعديل أي test آخر، اكتب طلب ملكية في ملف النقاش ولا تعدله مباشرة.

## عقد العميل

توجد origins في browser/static/native bundle فقط لأنها عناوين HTTPS عامة لازمة للتوجيه المباشر. لا تدخل في server-side config أو service mirror أو Vercel runtime env لخدمة، ولا تحوي اسم حساب أو project ID أو credential. اختبر أن `resolveServiceOrigin()` لا يعيد قيمة خارج المتصفح.

## شرط البدء والتسليم

- يبدأ بعد cherry-pick محلي لأساس الوكيل 1 الذي يضيف declaration/export `control`، ولا يعدل أي ملف من ذلك الأساس.
- يكتب hash أساسه وhash تسليم مصفوفة route+method في worktree فرع التنسيق قبل أن يبدأ الوكيل 3.
- يسجل خط أساس قابلًا للتشغيل للـ124 `route.ts` ولـroute exports غير المكتوبة بصيغة `function`، بما في ذلك `POST /api/super-admin/simulation/users` و`GET/POST /api/super-admin/ui-registry/pending` و`POST /api/super-admin/users/delete`. عدّ الملفات ليس معيار اكتمال؛ الأزواج الفعلية هي المعيار.

## اختبارات

```bash
npm run test:account-bridge
npm run typecheck
npm run lint
npm run architecture:check
npm run runtime:check
```

## يسلم للوكيل 5

- جدول route classification النهائي.
- قائمة public origins المطلوبة على `gova`.

## مراجعة متقاطعة

بعد انتهاء التنفيذ، يراجع الوكيل 2 عمل الوكيل 3 نقديًا.
