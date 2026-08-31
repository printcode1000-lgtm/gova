import {
  DEPLOY_ALL_RUNBOOK,
  DEPLOY_PUSH_RUNBOOK,
  DEPLOY_ALL_SCENARIO_VALUES,
  DEPLOY_PUSH_TARGET_VALUES,
  deployAllBranchIds,
  deployPushBranchIds,
  type DeployAllRunbookBranch,
  type DeployPushRunbookBranch,
  type DeployAllScenarioValue,
  type DeployPushTargetValue,
} from "@asol/release-core/console";

/** Arabic labels for catalog scenario values — keys must cover every exported value. */
const DEPLOY_ALL_SCENARIO_LABELS: Record<DeployAllScenarioValue, string> = {
  full: "تشغيل كامل",
  preflight: "Preflight فقط",
  publish: "Publish فقط",
  services: "كل الخدمات فقط",
  main: "تحقق main فقط",
  "from-notifications": "استكمال من notifications",
  "from-products": "استكمال من products",
  "from-orders": "استكمال من orders",
  "from-profiles": "استكمال من profiles",
  "from-submain": "استكمال من submain",
  "from-sub2main": "استكمال من sub2main",
};

const DEPLOY_PUSH_TARGET_LABELS: Record<DeployPushTargetValue, string> = {
  none: "GitHub + main فقط",
  main: "main فقط",
  notifications: "notifications",
  products: "products",
  orders: "orders",
  profiles: "profiles",
  submain: "submain",
  sub2main: "sub2main",
  all: "كل حسابات Vercel",
};

/** High-signal Arabic help; anything missing falls back to the runbook command. */
const ALL_BRANCH_HELP_OVERRIDES: Record<string, string> = {
  "production-doctor": "يفحص جاهزية بيئة الإنتاج محلياً قبل أي كتابة في Git؛ تخطيه يعني أنك تثق أن Node وVercel والأسرار جاهزة.",
  "vercel-account-access": "يتحقق من الوصول لكل حسابات Vercel السبعة حتى لا يظهر نقص التوكن بعد الدفع.",
  lint: "يشغل فحص جودة الكود. إذا فشل، يتوقف التسلسل قبل النشر.",
  types: "يشغل TypeScript بدون إخراج ملفات؛ يكشف كسر العقود والاستيرادات.",
  architecture: "يتأكد من حدود الحزم وقواعد العزل ومنع الاستيرادات المخالفة.",
  tests: "يشغل مجموعة الاختبارات الكاملة. هذا أطول فرع في preflight لكنه أكثرها حماية.",
  "local-db": "يتأكد من توفر قواعد SQLite المحلية المطلوبة للتوليد والفحوص.",
  "release-schema": "يزامن مخططات Turso الخاصة بالإصدار قبل البناء والنشر.",
  "server-build": "يشغل بناء Next server الكامل لالتقاط أخطاء server components وroute handlers.",
  "function-size": "يقيس حجم دوال Vercel من أثر البناء؛ يوقف preflight قبل الدفع إذا تجاوزت ميزانية 250MB.",
  smoke: "يشغّل الخادم المبني ويسأله طلبات حقيقية؛ READY لا يكفي إذا كانت المسارات تجيب 500.",
  "static-build": "ينتج حزمة static الخاصة بالإصدار وملف manifest النهائي.",
  "service-mirror-sync": "يعيد توليد مرايا الخدمات المعزولة من الرسم الفعلي للاستيرادات.",
  "service-mirror-verify": "يتأكد أن كل استيراد داخل رفع الخدمة موجود ولن يفشل أول request.",
  "service-builds": "يبني الخدمات الست بالطريقة الأقرب لما يبنيه Vercel.",
  "service-smoke": "يسأل كل خدمة طريقاً يصل إلى بياناتها قبل أي نشر معزول.",
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

const PUSH_BRANCH_HELP_OVERRIDES: Record<string, string> = {
  "push-main-branch": "يتأكد أن التشغيل من main فقط.",
  "push-main-credentials": "يتأكد من توكن Vercel الأساسي وربط مشروع gova.",
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

function findAllBranch(id: string): DeployAllRunbookBranch | undefined {
  for (const phase of DEPLOY_ALL_RUNBOOK) {
    for (const section of phase.sections) {
      const hit = section.branches.find((branch) => branch.id === id);
      if (hit) return hit;
    }
  }
  return undefined;
}

function findPushBranch(id: string): DeployPushRunbookBranch | undefined {
  for (const phase of DEPLOY_PUSH_RUNBOOK) {
    for (const section of phase.sections) {
      const hit = section.branches.find((branch) => branch.id === id);
      if (hit) return hit;
    }
  }
  return undefined;
}

function defaultAllHelp(branch: DeployAllRunbookBranch): string {
  return `${branch.label} — يشغّل ${branch.command} (${branch.kind}).`;
}

function defaultPushHelp(branch: DeployPushRunbookBranch): string {
  return `${branch.label} — يشغّل ${branch.command} (${branch.kind}).`;
}

/** Every deploy-all branch id has help derived from the current runbook. */
export const ALL_BRANCH_HELP: Record<string, string> = Object.fromEntries(
  deployAllBranchIds().map((id) => {
    const branch = findAllBranch(id);
    if (!branch) return [id, ""];
    return [id, (ALL_BRANCH_HELP_OVERRIDES[id] ?? defaultAllHelp(branch)).trim()];
  }),
);

/** Every deploy-push branch id has help derived from the current runbook. */
export const PUSH_BRANCH_HELP: Record<string, string> = Object.fromEntries(
  deployPushBranchIds().map((id) => {
    const branch = findPushBranch(id);
    if (!branch) return [id, ""];
    return [id, (PUSH_BRANCH_HELP_OVERRIDES[id] ?? defaultPushHelp(branch)).trim()];
  }),
);

export const deployAllScenarios = DEPLOY_ALL_SCENARIO_VALUES.map(
  (value) => [value, DEPLOY_ALL_SCENARIO_LABELS[value]] as const,
);

export const deployPushTargets = DEPLOY_PUSH_TARGET_VALUES.map(
  (value) => [value, DEPLOY_PUSH_TARGET_LABELS[value]] as const,
);

export function deployAllScenarioArg(value: string): string {
  if (value === "full") return "";
  if (value === "services") return "--phase=services";
  if (value.startsWith("from-")) return `--from-phase=${value.slice("from-".length)}`;
  return `--phase=${value}`;
}

/** Section copy for the deploy runbook page. */
export const STATUS_SUMMARY_DESCRIPTION =
  "نظرة سريعة على الفروع المفعّلة وحالة التنفيذ وسلوك الخطأ.";

export const DEPLOY_PUSH_DESCRIPTION =
  "المسار السريع: أسرار، commit، push، ثم تحقق Vercel للأهداف المختارة دون فحوصات build/test.";
