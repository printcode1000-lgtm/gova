# Build Static And Serve Out

`npm run build:static` ينشئ نسخة static في `out/` ويكتب `out/asol-web-manifest.json`.

## Flags

- `npx tsx scripts/build-static.ts --diagnostic`: يبني static output أسرع ويتجاوز audits البطيئة لل routes والصيدليات. يضع marker في manifest، و`ota-publish` يرفض هذا الناتج.
- `npx tsx scripts/ota-publish.ts --notes "text"`: يستبدل release notes التلقائية.
- `npx tsx scripts/ota-publish.ts --mandatory`: يوقع manifest وفيه `mandatory: true`.
- `npx tsx scripts/cap-build.ts --dry-run`: يطبع الخطة كاملة ولا يغير الملفات ولا ينشر.
- `npx tsx scripts/cap-build.ts --skip-ota`: يتجاوز نشر OTA ويستخدم manifest محلي موجود.
- `npx tsx scripts/cap-build.ts --no-r8 --skip-ota`: يستخدم مسار `ReleaseNoR8` التشخيصي، ولا يسمح بالدمج مع أي خطوة نشر.

## Safety

لا تستخدم diagnostic output للنشر. `ota-publish` يفحص marker الموجود في manifest المحلي ويرفض المتابعة برسالة واضحة.
