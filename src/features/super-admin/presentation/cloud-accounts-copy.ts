import type {
  CloudAccountsFacts,
  GovaBoundaryFacts,
  TursoAccountFacts,
  VercelAccountFacts,
} from "./cloud-accounts-facts.types";
import { joinRichText, type RichText } from "./cloud-accounts-rich-text";

/**
 * Every word `/dev/cloud-accounts` paints.
 *
 * Wording lives here once; every number, name, command, path and package inside
 * it is a parameter taken from `CloudAccountsFacts`, which the server derives
 * from the code that owns it. The components hold no strings of their own.
 */

const LIST_SEPARATOR = "، ";

function count(values: readonly unknown[]): number {
  return values.length;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function serviceDirPattern(facts: CloudAccountsFacts): string {
  const parents = unique(
    facts.vercel.flatMap((account) =>
      account.serviceDir ? [account.serviceDir.split("/").slice(0, -1).join("/")] : [],
    ),
  );
  return parents.map((parent) => `${parent}/<name>/`).join(", ");
}

function frontendProjects(facts: CloudAccountsFacts): string[] {
  return facts.vercel.filter((account) => account.servesFrontend).map((a) => a.project);
}

function keptRoutePatterns(boundary: GovaBoundaryFacts): RichText {
  return joinRichText(boundary.keptRoutes.map((route) => ({ ltr: route.pattern })), LIST_SEPARATOR);
}

function tursoDatabaseTotal(facts: CloudAccountsFacts): number {
  return facts.turso.reduce((sum, account) => sum + account.databases.length, 0);
}

function tursoTableTotal(facts: CloudAccountsFacts): number {
  return facts.turso.reduce(
    (sum, account) =>
      sum + account.databases.reduce((inner, database) => inner + database.tables.length, 0),
    0,
  );
}

export const CLOUD_ACCOUNTS_COPY = {
  loading: "جاري التحميل...",
  forbidden: "هذه الصفحة متاحة للسوبر أدمن فقط.",
  unavailable: "غير متاح",
  noSnapshot: "لا توجد لقطة",
  none: "لا يوجد",
  listSeparator: LIST_SEPARATOR,
  partSeparator: " · ",

  title: "الحسابات السحابية",
  summary: (facts: CloudAccountsFacts): RichText => [
    `${count(facts.vercel)} حسابات Vercel و${count(facts.turso)} Turso و${count(facts.r2)} R2. الأسرار في `,
    { ltr: facts.localEnvFile },
    " والنسخة الاحتياطية المشفّرة (",
    { ltr: facts.commands.secretsBackup },
    facts.localEnvFileGitIgnored ? ") — والملف مستثنى من Git." : ") — تحذير: الملف غير مستثنى من Git.",
  ],
  intro: (): RichText => [
    "كل ما في هذه الصفحة يُشتق عند كل تحميل من الكود نفسه — إعلانات الحسابات، سجل ملكية المسارات، سجلات التخزين، مخططات قواعد البيانات، عقد متغيرات البيئة، وسكربتات ",
    { ltr: "package.json" },
    " — وتُقرأ هوية كل حساب واستهلاكه من المزوّد عند فتح تبويبه. لا يظهر هنا أي رمز دخول أو مفتاح أو سر.",
  ],

  tabsLabel: "أقسام الحسابات السحابية",
  tabs: {
    general: "عام",
    vercel: "حسابات Vercel",
    turso: "حسابات Turso",
    cloudflare: "حسابات Cloudflare",
  },

  providers: { vercel: "Vercel", turso: "Turso", r2: "Cloudflare R2" },

  general: {
    overviewTitle: "نظرة عامة",
    overviewHeaders: ["المزوّد", "عدد الحسابات", "يحتوي على"],
    vercelHolds: (facts: CloudAccountsFacts) =>
      `${count(unique(facts.vercel.map((account) => account.project)))} مشروع Vercel`,
    tursoHolds: (facts: CloudAccountsFacts) =>
      `${tursoDatabaseTotal(facts)} قاعدة بيانات، ${tursoTableTotal(facts)} جدولًا`,
    r2Holds: (facts: CloudAccountsFacts) =>
      `${count(unique(facts.r2.map((account) => account.bucketName)))} حاويات منفصلة`,
    topology: (facts: CloudAccountsFacts): RichText => [
      ...joinRichText(
        frontendProjects(facts).map((project) => ({ ltr: project })),
        LIST_SEPARATOR,
      ),
      ...(facts.govaBoundary
        ? [
            " يقدّم واجهة التطبيق، ويجيب ",
            ...keptRoutePatterns(facts.govaBoundary),
            " فقط، ويعيد توجيه (",
            { ltr: String(facts.govaBoundary.redirectStatus) },
            ") كل مسار API آخر إلى الحساب المالك",
          ]
        : []),
      "؛ الباقي خدمات معزولة تُنشر من ",
      { ltr: serviceDirPattern(facts) },
      ". ",
      { ltr: facts.bridgePackage },
      " في المتصفح يوجّه الطلبات؛ لا يوجد اتصال خادم-إلى-خادم بين الحسابات.",
    ],
    credentialsTitle: "أين تعيش الاعتمادات (credentials)",
    credentialsStore: (facts: CloudAccountsFacts): RichText => [
      "لا شيء هنا هو مخزن أسرار. كل قيمة هي متغير بيئة في ",
      { ltr: facts.localEnvFile },
      " وتُحفظ نسخة مشفّرة منها عبر ",
      { ltr: facts.commands.secretsBackup },
      ".",
    ],
    credentialsSync: (facts: CloudAccountsFacts): RichText => [
      { ltr: facts.commands.pushVercelEnv },
      " يطابق متغيرات مشروع ",
      { ltr: facts.pushVercelEnvProject ?? "—" },
      " مع إعلانه. أوامر النشر تزامن لكل حساب المتغيرات التي يعلنها إعلانه فقط (",
      ...joinRichText(
        facts.vercel.map((account) => ({ ltr: `${account.project}: ${account.declaredEnvCount}` })),
        LIST_SEPARATOR,
      ),
      ").",
    ],
  },

  vercel: {
    title: (facts: CloudAccountsFacts) => `Vercel — ${count(facts.vercel)} حسابات`,
    headers: [
      "الحساب",
      "المشروع",
      "البريد الإلكتروني",
      "يخدم",
      "متغيرات معلنة",
      "Git",
      "يُحدَّث بواسطة",
      "استخدام قابل للجلب",
      "قراءات متاحة",
      "آخر لقطة",
    ],
    serves: (account: VercelAccountFacts, boundary: GovaBoundaryFacts | null): RichText =>
      account.servesFrontend && boundary
        ? [
            "واجهة التطبيق؛ يجيب ",
            ...keptRoutePatterns(boundary),
            " فقط؛ ويعيد توجيه (",
            { ltr: String(boundary.redirectStatus) },
            ") كل مسار API آخر إلى مالكه عبر بوابة ",
            { ltr: boundary.boundaryMatcher },
          ]
        : [
            `${count(account.ownedRoutePatterns)} مسار: `,
            ...joinRichText(
              account.ownedRoutePatterns.map((pattern) => ({ ltr: pattern })),
              LIST_SEPARATOR,
            ),
          ],
    git: (account: VercelAccountFacts): RichText => [
      ...(account.usage.status !== "ok"
        ? ["الربط غير معروف"]
        : account.usage.gitRepository
          ? ["مربوط بـ ", { ltr: account.usage.gitRepository }]
          : ["غير مربوط بأي مستودع"]),
      " · ",
      { ltr: "vercel.json" },
      account.gitAutoDeploy ? ": النشر التلقائي من Git مفعّل" : ": النشر التلقائي من Git معطّل",
    ],
    deployCommandMissing: "لا يوجد سكربت نشر معلن",
    emailMismatch: (ownerEmail: string) => `مالك التوكن في Vercel: ${ownerEmail} — لا يطابق الإعلان`,
    noUsageMetrics: "لا توجد قراءات استخدام قابلة للجلب آليًا لهذه الخطة",
    noApiReadings: "لا توجد قراءات قابلة للجلب",
    apiPart: (value: string) => `API ${value}`,
    billingPart: (value: string) => `Billing ${value}`,
    billingLinesPart: (value: string) => `${value} lines`,
    liveFailed: (message: string) => `Live: ${message} · تعرض آخر لقطة محفوظة.`,
    snapshotNote: (facts: CloudAccountsFacts): RichText => [
      "تُجلب قيم Vercel تلقائيًا عند فتح هذا التبويب بعد تحقق السوبر أدمن؛ عند فشل حساب تعرض الصفحة آخر لقطة محفوظة له فقط. ويمكن تحديث اللقطة الاحتياطية يدويًا عبر ",
      { ltr: facts.commands.vercelUsage },
      ". يعرض الجدول القراءات التي تعود فعليًا من Vercel فقط. الخطط الحالية: ",
      ...joinRichText(
        unique(facts.vercel.map((account) => account.usage.planLabel ?? "—")).map((plan) => ({ ltr: plan })),
        LIST_SEPARATOR,
      ),
      "؛ الخطة التي لا تتيح بيانات الاستخدام آليًا تُظهر حدود API فقط. لا تحمل اللقطة أي توكن أو سر.",
    ],
    routesTitle: "مسارات كل حساب",
    routesNote: (facts: CloudAccountsFacts): RichText => [
      "أي حساب يجيب أي طلب. المصدر هو سجل الملكية في ",
      { ltr: facts.bridgePackage },
      " نفسه الذي يستخدمه موجّه العميل، فلا يمكن للصفحة أن تعرض وجهة تخالف الوجهة الفعلية. الجرد الكامل لكل طريقة في ",
      { code: facts.routingCatalogPath },
      ".",
    ],
    routeCount: (patterns: number) => `${patterns} مسار`,
    routeHeaders: ["المسار", "الطرق", "ما يقوم به الطلب"],
    ruleTitle: "القاعدة التي تجعل هذا يعمل",
    rule: (facts: CloudAccountsFacts): RichText => [
      { strong: "لا يجوز لأي نشرة استدعاء نشرة أخرى." },
      " كل عبور يمر عبر ",
      { ltr: facts.bridgePackage },
      " الذي لا يُنشر على أي حساب إطلاقًا — بل يعمل داخل متصفح المستخدم. تفرض ذلك قاعدة ",
      { ltr: facts.isolationRule },
      " في ",
      { ltr: facts.commands.architectureCheck },
      ":",
    ],
    diagramRoot: "browser",
    diagramBoundary: (boundary: GovaBoundaryFacts) =>
      `${boundary.keptRoutes.map((route) => route.pattern).join(", ")} · ${boundary.boundaryMatcher} → ${boundary.redirectStatus}`,
    keptRouteDescription: (boundary: GovaBoundaryFacts): string =>
      `تجيبه ${boundary.project} بنفسها — المسار الذي تبقيه حزمة النشر في نشرتها؛ كل ما عداه من src/app/api يُحذف من النشرة.`,
    boundaryDescription: (boundary: GovaBoundaryFacts): string =>
      `بوابة التوافق: كل طلب يملكه حساب آخر يُعاد توجيهه (${boundary.redirectStatus}) إلى أصل ذلك الحساب، وطلبات CORS preflight تُجاب هنا، ومسار أعمال بلا مالك يُرد عليه ${boundary.unownedStatus} (${boundary.unownedError}).`,
    deploymentNote: (facts: CloudAccountsFacts): RichText => {
      const linked = facts.vercel.filter((account) => account.gitAutoDeploy && account.usage.gitRepository);
      return [
        ...(linked.length === 0
          ? ["لا توجد نشرة تُنشر تلقائيًا من Git"]
          : [
              ...joinRichText(
                linked.map((account) => ({ ltr: account.project })),
                LIST_SEPARATOR,
              ),
              " تُنشر تلقائيًا من Git",
            ]),
        "؛ كل حساب آخر يُحدَّث بأمر النشر المذكور في الجدول، وكل خدمة ترفع مجلدها فقط: ",
        { ltr: serviceDirPattern(facts) },
        ".",
      ];
    },
  },

  turso: {
    title: (facts: CloudAccountsFacts) =>
      `Turso — ${count(facts.turso)} منظمات، ${tursoDatabaseTotal(facts)} قاعدة بيانات`,
    headers: [
      "المنظمة",
      "مفتاح البيئة",
      "مالك التوكن",
      "قواعد البيانات",
      "مضبوطة في الكود",
      "موجودة في Turso",
      "يُقرأ بواسطة",
      "قراءة",
      "كتابة",
      "تخزين",
      "مزامنة",
      "تفاصيل",
    ],
    locations: (value: string) => `${value} مواقع`,
    groups: (value: string) => `${value} مجموعات`,
    plan: (value: string) => `خطة ${value}`,
    input: (value: string) => `إدخال ${value}`,
    output: (value: string) => `إخراج ${value}`,
    liveFailed: (message: string) => `Live: ${message} · تعرض آخر لقطة محفوظة.`,
    note: (facts: CloudAccountsFacts): RichText => [
      "المنظمات هي مفاتيح ",
      ...joinRichText(
        facts.turso.map((account) => ({ ltr: account.organizationEnv })),
        LIST_SEPARATOR,
      ),
      " في ",
      { ltr: facts.envContractFile },
      "، وكل قاعدة بيانات تُنسب إلى المنظمة التي يشير إليها عنوانها المضبوط. تُجلب من Turso تلقائيًا عند فتح هذا التبويب: مالك التوكن، وقواعد البيانات الموجودة فعلًا، والاستهلاك، والخطة وحدودها. عند فشل منظمة تعرض الصفحة آخر لقطة محفوظة لها فقط، ويمكن تحديث اللقطة عبر ",
      { ltr: facts.commands.tursoUsage },
      ". رموز Turso تبقى على الخادم ولا تُرسل إلى المتصفح.",
    ],
    readersNote: (): RichText => [
      "عمود «يُقرأ بواسطة» مشتق من متغيرات البيئة التي يعلنها كل حساب Vercel: النشرة تظهر فقط إن كانت تحمل اعتمادات تلك القاعدة.",
    ],
    unassigned: (facts: CloudAccountsFacts): RichText => [
      "قواعد بيانات لا يشير عنوانها المضبوط إلى أي منظمة معروفة: ",
      ...joinRichText(
        facts.tursoUnassigned.map((database) => ({ ltr: `${database.label} (${database.urlEnv})` })),
        LIST_SEPARATOR,
      ),
      ".",
    ],
    accountTitle: (account: TursoAccountFacts) =>
      `${account.organization} — ${count(account.databases)} قاعدة بيانات`,
    databaseHeaders: ["قاعدة البيانات", "الاسم في Turso", "موجودة في Turso", "الجداول", "أسماء الجداول", "يُقرأ بواسطة"],
    presentInCloud: "نعم",
    missingFromCloud: "لا — غير موجودة في المنظمة",
    cloudUnknown: "غير معروف — لم تُقرأ المنظمة",
  },

  cloudflare: {
    title: (facts: CloudAccountsFacts) => `Cloudflare R2 — ${count(facts.r2)} حسابات`,
    rows: {
      env: "المتغيرات",
      account: "الحساب",
      email: "البريد الإلكتروني",
      bucket: "الحاوية (Bucket)",
      target: "معرّف المزوّد / الهدف",
      publicUrl: "العنوان العام",
    },
    envPattern: (prefix: string) => `${prefix}_*`,
    destinationsTitle: "ما الذي يحدد وجهة كل ملف",
    destinationsNote: (facts: CloudAccountsFacts): RichText => [
      "ملفات الوسائط عبر بروفايلات التخزين، وإصدارات OTA عبر ",
      { ltr: facts.otaPackage },
      " فقط.",
    ],
    destinationHeaders: ["البروفايل / الحزمة", "الحساب", "مجلد السحابة"],
    contentsTitle: "المحتوى الحالي للحاويات",
    contentsHeaders: ["الحاوية", "الاستخدام", "آخر تحديث"],
    classA: "Class A Operations",
    classB: "Class B Operations",
    totalStorage: "Total storage",
    currentObjects: "Current objects",
    currentSize: "Current size",
    latestObject: "Latest object",
    analytics: "Analytics",
    contents: "Contents",
    liveFailed: (message: string) => `Live Analytics: ${message} · تعرض آخر لقطة محفوظة.`,
    liveContentsFailed: (message: string) => `Live Contents: ${message} · تعرض آخر لقطة محفوظة.`,
    note: (facts: CloudAccountsFacts): RichText => [
      "تُجلب قيم Cloudflare R2 Analytics ومحتوى الحاويات تلقائيًا عند فتح هذا التبويب بعد تحقق السوبر أدمن؛ الحساب الذي تفشل قراءته يعرض آخر لقطة محفوظة. ويمكن تحديث اللقطات الاحتياطية يدويًا عبر ",
      { ltr: facts.commands.r2Usage },
      "، وتحديث محتوى الحاويات عبر ",
      { ltr: facts.commands.r2Contents },
      ". تعرض الصفحة الأرقام الآمنة فقط، ولا ترسل مفاتيح Cloudflare إلى المتصفح.",
    ],
  },
} as const;
