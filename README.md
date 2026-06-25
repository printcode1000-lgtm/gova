# gova

تطبيق Next.js مع نظام ثيم ودعم عربي/إنجليزي (I18n).

## البدء السريع

```bash
npm install
npm run dev
```

التطبيق يعمل على: http://localhost:3000

## أوامر مهمة

| الأمر | الوصف |
|--------|--------|
| `npm run dev` | تشغيل التطبيق |
| `npm run build` | بناء إنتاج |
| `npm run build:static` | تصدير ثابت (`out/`) |
| `npm run typecheck` | فحص الأنواع |
| `npm run server:stop` | إيقاف السيرفر على المنفذ 3000 |

## autofill التطويري

في وضع التطوير، أضف `?autofill=1` لصفحة `/addseller` لملء نموذج التسجيل تلقائياً:

```
http://localhost:3000/addseller?autofill=1
```

## التوثيق

- [note/i18n-system.md](./note/i18n-system.md) — نظام الترجمة (English)
- [note/theme-system.md](./note/theme-system.md) — نظام الثيم (English)
- [doc/COMMANDS.md](./doc/COMMANDS.md) — أوامر التشغيل والبناء
- [doc/GITHUB_SETUP.md](./doc/GITHUB_SETUP.md) — رفع المشروع إلى GitHub
