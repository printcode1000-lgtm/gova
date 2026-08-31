/**
 * Arabic labels and help text for the deploy runbook's own controls.
 *
 * Separate from `deploy-runbook-copy.ts`, which maps catalog values to labels:
 * this file is the prose the page shows around those values. Both exist because
 * the presentation contract caps a `.tsx` line at 120 UTF-16 units, and Arabic
 * text with its combining marks crosses that at well under 120 visible
 * characters — so a sentence that reads as one short line cannot live inline.
 */

export const SCENARIO_HELP =
  "يحدد السيناريو الأمر الأعلى؛ checkboxes الفروع تحدد ما يُنفَّذ داخل الشجرة.";

export const SCENARIO_FOOTNOTE =
  "يحدد السيناريو الأمر الأعلى، بينما تحدد checkboxes الفروع المفعّلة داخل الشجرة.";

export const RUN_OPTIONS_TITLE = "خيارات التشغيل";

export const RUN_OPTIONS_DESCRIPTION = "سلوك التسلسل عند الأخطاء وتجاوز preflight.";

export const PHASE_TREE_DESCRIPTION =
  "كل مرحلة قابلة للطي؛ داخلها أقسام ثم فروع تنفيذية بأوامر npm.";

export const EXECUTION_BOX_DESCRIPTION =
  "شغّل أو أوقف job النظام المحلي بعد مراجعة الأمر وعبارة التأكيد.";

export const ALLOW_DOWNGRADE_HELP =
  "يتجاوز حماية خفض releaseId/version. لا تستخدمه إلا إذا كان الخفض مقصوداً.";

export const ALLOW_SCRATCH_HELP =
  "يسمح بنشر logs/tmp/scratchpad. الافتراضي يمنعها لأنها غالباً بقايا عمل.";

export const PAGE_INTRO =
  "تنفيذ الأوامر يتم كعملية نظام مستقلة من خلال Job محلي، والصفحة تعرض الطرفية وتتحكم في التسلسل فقط.";

export const BRANCH_CHECKBOX_HELP =
  "كل checkbox يحدد هل يدخل هذا الفرع ضمن خطة التشغيل الحالية أم يتم تجاوزه.";

export const EXECUTION_STATE_TITLE = "حالة التنفيذ";

export const EXECUTION_STATE_HELP = "العملية تستمر كـ job محلي حتى لو أغلقت الصفحة.";

export const CONTINUE_ON_ERROR_HELP =
  "الافتراضي يوقف التسلسل عند أول خطأ لحماية النشر من نتائج نصف مكتملة.";

export const DEPLOY_ALL_DESCRIPTION =
  "المسار الكامل: فحوصات، بناء، قواعد بيانات، خدمات، GitHub، ثم تحقق Vercel.";

export const CONTINUE_ON_ERROR_DETAIL =
  "عند التفعيل يحاول الانتقال للمرحلة التالية بعد تسجيل الخطأ. ";

export const SKIP_PREFLIGHT_HELP =
  "يسمح بتشغيل publish دون انتظار الفحوصات الطويلة. " +
  "يظهر هذا في commit حتى لا يختفي الاختصار.";

export const PHASE_DESCRIPTION =
  "مرحلة مستقلة في التسلسل؛ بعض الأوضاع تستأنف منها بعد فشل سابق.";

export const SECTION_DESCRIPTION =
  "قسم يجمع فروعاً متقاربة؛ كل فرع يمثل أمراً أو عملية واحدة.";

export const BRANCH_DESCRIPTION =
  "فرع تنفيذي ضمن الشجرة؛ تفعيله يعني تضمينه في خطة التشغيل، وتجاوزه يعني عدم طلبه من هذا المسار.";

export const TERMINAL_STATUS_LABEL = "الحالة";
export const TERMINAL_STATUS_HELP = "حالة الـ job كما يراها مشغل الأوامر.";
export const TERMINAL_PHASE_LABEL = "المرحلة";
export const TERMINAL_PHASE_HELP = "آخر مرحلة ظهرت في الطرفية.";
export const TERMINAL_SECTION_LABEL = "القسم";
export const TERMINAL_SECTION_HELP = "آخر قسم داخلي معروف داخل المرحلة.";
export const TERMINAL_EMPTY =
  "لا يوجد خرج بعد. شغّل أحد التبويبين لعرض سجل الطرفية هنا.";
