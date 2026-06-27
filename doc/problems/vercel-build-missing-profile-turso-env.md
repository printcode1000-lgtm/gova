# فشل بناء Vercel — متغيرات Turso للبروفيل غير مضبوطة

**التاريخ:** 2026-06-27  
**البيئة:** Vercel Production (`main`)  
**حالة الحل:** محلول

---

## الأعراض

فشل أمر `npm run build` على Vercel برسالة:

```
❌ Schema sync failed: Error: Turso profile credentials not configured
   (TURSO_PROFILE_DATABASE_URL / TURSO_PROFILE_AUTH_TOKEN)
```

من سجل البناء:

- `db:ensure` نجح (وجود `allusers.db` و `profile.db`)
- `db:schema:sync` فشل عند مزامنة قاعدة البروفيل
- `injected env (0) from .env` — لا توجد متغيرات محلية على Vercel

---

## السبب

بعد إضافة قاعدة بيانات منفصلة للبروفيل (`profile.db` → Turso `gova-profile`)، أصبح البناء يشغّل **مزامنتين**:

| SQLite | Turso | المتغيرات المطلوبة |
|--------|-------|-------------------|
| `allusers.db` | `gova-db` | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |
| `profile.db` | `gova-profile` | `TURSO_PROFILE_DATABASE_URL`, `TURSO_PROFILE_AUTH_TOKEN` |

على Vercel كانت متغيرات **المستخدمين** موجودة فقط. متغيرات **البروفيل** لم تُضف إلى **Environment Variables** في المشروع، بينما السكربت `schema-sync.ts` يعتبر بيئة CI/Vercel (`VERCEL=1`) بيئة إلزامية — أي غياب المتغيرات يوقف البناء ولا يتخطى المزامنة.

---

## الحل

### 1. إضافة المتغيرات إلى Vercel

تمت إضافة المتغيرين التاليين لجميع البيئات (Production, Preview, Development):

```env
TURSO_PROFILE_DATABASE_URL=libsql://gova-profile-....turso.io
TURSO_PROFILE_AUTH_TOKEN=...
```

**يدوياً:** Vercel → Project → Settings → Environment Variables

**تلقائياً من الجهاز المحلي** (بعد `npm run db:provision:turso` ووجود القيم في `.env.local`):

```bash
npm run db:push:vercel-env
```

السكربت: `scripts/push-vercel-turso-env.ts` — يرفع الأربعة متغيرات Turso (users + profile).

### 2. إعادة النشر

بعد حفظ المتغيرات: **Redeploy** من لوحة Vercel، أو:

```bash
npx vercel deploy --prod
```

### 3. التحقق من نجاح البناء

في سجل البناء يجب أن يظهر:

```
✅ users schema synchronization completed
✅ profile schema synchronization completed
```

ثم اكتمال `next build` بدون أخطاء.

---

## الوقاية

1. عند إضافة قاعدة Turso جديدة، أضف متغيراتها إلى Vercel فوراً.
2. بعد `npm run db:provision:turso` شغّل `npm run db:push:vercel-env`.
3. راجع `.env.example` — يجب أن يعكس كل متغيرات runtime المطلوبة للبناء.

---

## ملفات ذات صلة

- `scripts/schema-sync.ts` — يشغّل `runAllSchemaSyncs` ويفشل على CI عند غياب credentials
- `src/core/provisioning/schema-sync.ts` — منطق المزامنة لكل قاعدة على حدة
- `doc/system/profile-system.md` — بنية قاعدة البروفيل
- `doc/system/data-architecture-guide.md` — متغيرات البيئة
