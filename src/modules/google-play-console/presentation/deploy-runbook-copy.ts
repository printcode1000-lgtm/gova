export const ALL_BRANCH_HELP: Record<string, string> = {
  "production-doctor": "يفحص جاهزية بيئة الإنتاج محلياً قبل أي كتابة في Git؛ تخطيه يعني أنك تثق أن Node وVercel والأسرار جاهزة.",
  "vercel-account-access": "يتحقق من الوصول لكل حسابات Vercel السبعة حتى لا يظهر نقص التوكن بعد الدفع.",
  lint: "يشغل فحص جودة الكود. إذا فشل، يتوقف التسلسل قبل النشر.",
  types: "يشغل TypeScript بدون إخراج ملفات؛ يكشف كسر العقود والاستيرادات.",
  architecture: "يتأكد من حدود الحزم وقواعد العزل ومنع الاستيرادات المخالفة.",
  tests: "يشغل مجموعة الاختبارات الكاملة. هذا أطول فرع في preflight لكنه أكثرها حماية.",
  "local-db": "يتأكد من توفر قواعد SQLite المحلية المطلوبة للتوليد والفحوص.",
  "release-schema": "يزامن مخططات Turso الخاصة بالإصدار قبل البناء والنشر.",
  "server-build": "يشغل بناء Next server الكامل لالتقاط أخطاء server components وroute handlers.",
  "static-build": "ينتج حزمة static الخاصة بالإصدار وملف manifest النهائي.",
  "service-mirror-sync": "يعيد توليد مرايا الخدمات المعزولة من الرسم الفعلي للاستيرادات.",
  "service-mirror-verify": "يتأكد أن كل استيراد داخل رفع الخدمة موجود ولن يفشل أول request.",
  "service-builds": "يبني الخدمات الست بالطريقة الأقرب لما يبنيه Vercel.",
  "main-branch": "يرفض التشغيل من فرع غير main حتى لا يُنشر مسار خاطئ.",
  "deployment-credentials": "يتأكد من توكنات النشر وربط مشروع Vercel الأساسي.",
  "scratch-files": "يمنع نشر ملفات تجريبية مثل logs وtmp وscratchpad.",
  "release-manifest": "يمنع خفض إصدار manifest نتيجة build:static بدون متغيرات إصدار.",
  "non-empty-release": "يمنع إنشاء نشر فارغ إلا إذا فعّلت allow-empty.",
  "secrets-backup": "ينشئ أو يتحقق من أرشيف الأسرار المشفر قبل commit.",
  "clear-git-lock": "يزيل Git index.lock القديم فقط إذا كان مهجوراً وليس عملية نشطة.",
  "stage-tree": "ينفذ git add -A لكل التغييرات التي ستدخل commit النشر.",
  "commit-tree": "ينشئ commit النشر على main.",
  "verify-clean-tree": "يتأكد أن الشجرة لم تتغير بعد commit حتى لا يُدفع مصدر غير متناسق.",
  "push-main": "يدفع main إلى GitHub، وهذا يطلق نشر المشروع الرئيسي المرتبط.",
  "notifications-deploy-command": "ينشر خدمة notifications في حسابها المعزول على Vercel.",
  "products-deploy-command": "ينشر خدمة products في حسابها المعزول على Vercel.",
  "orders-deploy-command": "ينشر خدمة orders في حسابها المعزول على Vercel.",
  "profiles-deploy-command": "ينشر خدمة profiles في حسابها المعزول على Vercel.",
  "submain-deploy-command": "ينشر تطبيق submain الكامل في حسابه المعزول.",
  "sub2main-deploy-command": "ينشر تطبيق sub2main الكامل في حسابه المعزول.",
  "main-ready": "ينتظر نشر Vercel الرئيسي المرتبط بـ GitHub حتى يصبح READY لنفس commit.",
};

export const PUSH_BRANCH_HELP: Record<string, string> = {
  "push-main-branch": "يتأكد أن التشغيل من main فقط.",
  "push-main-credentials": "يتأكد من VERCEL_TOKEN وربط مشروع gova الأساسي.",
  "push-target-accounts": "يتحقق من الحسابات المختارة في Vercel قبل commit/push.",
  "push-scratch-files": "يمنع دفع ملفات مؤقتة أو logs بالخطأ.",
  "push-release-manifest": "يمنع خفض manifest الإصدار في مسار الدفع السريع.",
  "push-non-empty": "يمنع دفع commit فارغ إلا مع allow-empty.",
  "push-secrets-backup": "يتأكد من أرشيف الأسرار المشفر قبل الدفع.",
  "push-clear-git-lock": "يزيل Git lock مهجوراً فقط.",
  "push-stage-tree": "يضيف كل تغييرات الشجرة إلى commit الدفع.",
  "push-commit-tree": "ينشئ commit بعنوان deploy(push).",
  "push-clean-tree": "يتأكد أن الشجرة نظيفة بعد commit.",
  "push-github": "يدفع main إلى GitHub.",
  "push-github-verify": "يتحقق أن origin/main يطابق commit المدفوع.",
  "push-notifications": "ينشر notifications عند اختيار target مطابق.",
  "push-products": "ينشر products عند اختيار target مطابق.",
  "push-orders": "ينشر orders عند اختيار target مطابق.",
  "push-profiles": "ينشر profiles عند اختيار target مطابق.",
  "push-submain": "ينشر submain عند اختيار target مطابق.",
  "push-sub2main": "ينشر sub2main عند اختيار target مطابق.",
  "push-main-ready": "ينتظر gova الرئيسي حتى يصبح READY بعد GitHub push.",
};

export const deployAllScenarios = [
  ["full", "تشغيل كامل"],
  ["preflight", "Preflight فقط"],
  ["publish", "Publish فقط"],
  ["services", "كل الخدمات فقط"],
  ["main", "تحقق main فقط"],
  ["from-notifications", "استكمال من notifications"],
  ["from-products", "استكمال من products"],
  ["from-orders", "استكمال من orders"],
  ["from-profiles", "استكمال من profiles"],
  ["from-submain", "استكمال من submain"],
  ["from-sub2main", "استكمال من sub2main"],
] as const;

export const deployPushTargets = [
  ["none", "GitHub + main فقط"],
  ["main", "main فقط"],
  ["notifications", "notifications"],
  ["products", "products"],
  ["orders", "orders"],
  ["profiles", "profiles"],
  ["submain", "submain"],
  ["sub2main", "sub2main"],
  ["all", "كل حسابات Vercel"],
] as const;

export function deployAllScenarioArg(value: string): string {
  if (value === "full") return "";
  if (value === "services") return "--phase=services";
  if (value.startsWith("from-")) return `--from-phase=${value.slice("from-".length)}`;
  return `--phase=${value}`;
}
