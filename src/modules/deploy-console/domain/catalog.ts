/**
 * UI catalog for Deploy All / Deploy Push.
 * Phase and target ids must stay aligned with:
 * - scripts/lib/deploy-all-phases.ts
 * - scripts/lib/isolated-deploy-targets.ts
 * - scripts/deploy-all.ts flags
 * - scripts/deploy-push.ts (--vercel-target, --retry-failed)
 */

export const DEPLOY_ALL_PHASE_ORDER = [
  "preflight",
  "publish",
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
  "main",
] as const;

export type DeployAllPhaseId = (typeof DEPLOY_ALL_PHASE_ORDER)[number];

export const DEPLOY_ALL_FLAG_IDS = [
  "skipPreflight",
  "allowScratchFiles",
  "allowManifestDowngrade",
  "allowEmpty",
] as const;

export type DeployAllFlagId = (typeof DEPLOY_ALL_FLAG_IDS)[number];

export const DEPLOY_ALL_FLAG_CLI: Record<DeployAllFlagId, string> = {
  skipPreflight: "--skip-preflight",
  allowScratchFiles: "--allow-scratch-files",
  allowManifestDowngrade: "--allow-manifest-downgrade",
  allowEmpty: "--allow-empty",
};

export const ISOLATED_DEPLOY_TARGETS = [
  "notifications",
  "products",
  "orders",
  "profiles",
  "submain",
  "sub2main",
] as const;

export type IsolatedDeployTarget = (typeof ISOLATED_DEPLOY_TARGETS)[number];

export interface CatalogOption {
  id: string;
  label: string;
  description: string;
}

export const DEPLOY_ALL_PHASE_OPTIONS: readonly CatalogOption[] = [
  {
    id: "preflight",
    label: "preflight",
    description:
      "يفحص الفرع وبيانات الاعتماد، ثم يشغّل lint وtypecheck وarchitecture وtest ومزامنة قواعد البيانات وبناء الإصدار الثابت وبناء الخدمات — قبل أي كتابة على Git.",
  },
  {
    id: "publish",
    label: "publish",
    description:
      "ينشئ نسخة احتياطية مشفّرة للأسرار، يعمل commit لنشر main، ويدفع إلى GitHub ليبدأ نشر مشروع gova على Vercel.",
  },
  {
    id: "notifications",
    label: "notifications",
    description: "ينشر حساب Vercel المعزول لخدمة الإشعارات (asol-notifications) وينتظر حتى يصبح READY.",
  },
  {
    id: "products",
    label: "products",
    description: "ينشر حساب Vercel المعزول لخدمة المنتجات (asol-products) وينتظر حتى يصبح READY.",
  },
  {
    id: "orders",
    label: "orders",
    description: "ينشر حساب Vercel المعزول لخدمة الطلبات (asol-orders) وينتظر حتى يصبح READY.",
  },
  {
    id: "profiles",
    label: "profiles",
    description: "ينشر حساب Vercel المعزول لخدمة الملفات الشخصية (asol-profiles) وينتظر حتى يصبح READY.",
  },
  {
    id: "submain",
    label: "submain",
    description: "ينشر التطبيق الكامل الثانوي asol-submain عبر CLI وينتظر حتى يصبح READY.",
  },
  {
    id: "sub2main",
    label: "sub2main",
    description: "ينشر التطبيق الكامل الثالث asol-sub2main عبر CLI وينتظر حتى يصبح READY.",
  },
  {
    id: "main",
    label: "main",
    description: "يراقب نشر gova المرتبط بـ GitHub حتى يصل إلى READY على Vercel.",
  },
];

export const DEPLOY_ALL_FLAG_OPTIONS: readonly CatalogOption[] = [
  {
    id: "skipPreflight",
    label: "--skip-preflight",
    description:
      "يتخطى بوابة الفحص الكامل (lint/test/build…). يُسجَّل في رسالة الـ commit. لا تستخدمه إلا عند الحاجة.",
  },
  {
    id: "allowScratchFiles",
    label: "--allow-scratch-files",
    description: "يسمح بنشر ملفات مؤقتة/تجريبية كانت ستُرفض عادة (__probe*، *.log، *.tmp، …).",
  },
  {
    id: "allowManifestDowngrade",
    label: "--allow-manifest-downgrade",
    description: "يسمح بنشر بيان إصدار (releaseId/version) أقل من الموجود حاليًا.",
  },
  {
    id: "allowEmpty",
    label: "--allow-empty",
    description: "يعيد النشر حتى لو لم يتغيّر شيء عن origin/main (إعادة نشر نفس الـ commit).",
  },
];

export const DEPLOY_PUSH_TARGET_OPTIONS: readonly CatalogOption[] = [
  {
    id: "notifications",
    label: "notifications",
    description: "ينشر asol-notifications بعد خطوات الدفع الإلزامية ويتحقق من READY.",
  },
  {
    id: "products",
    label: "products",
    description: "ينشر asol-products بعد خطوات الدفع الإلزامية ويتحقق من READY.",
  },
  {
    id: "orders",
    label: "orders",
    description: "ينشر asol-orders بعد خطوات الدفع الإلزامية ويتحقق من READY.",
  },
  {
    id: "profiles",
    label: "profiles",
    description: "ينشر asol-profiles بعد خطوات الدفع الإلزامية ويتحقق من READY.",
  },
  {
    id: "submain",
    label: "submain",
    description: "ينشر asol-submain بعد خطوات الدفع الإلزامية ويتحقق من READY.",
  },
  {
    id: "sub2main",
    label: "sub2main",
    description: "ينشر asol-sub2main بعد خطوات الدفع الإلزامية ويتحقق من READY.",
  },
];

export const DEPLOY_PUSH_ALWAYS_STEPS: readonly CatalogOption[] = [
  {
    id: "secrets-backup",
    label: "secrets:backup",
    description: "دائمًا: ينشئ/يتحقق من النسخة الاحتياطية المشفّرة للأسرار قبل الدفع.",
  },
  {
    id: "github-push",
    label: "GitHub push → main",
    description: "دائمًا: يعمل commit نشر ويدفع إلى origin/main ويتحقق من المطابقة.",
  },
  {
    id: "main-verify",
    label: "main (gova) READY",
    description: "دائمًا: ينتظر حتى يصبح نشر gova على Vercel في حالة READY.",
  },
];

export const DEPLOY_PUSH_FLAG_OPTIONS: readonly CatalogOption[] = [
  {
    id: "retryFailed",
    label: "--retry-failed",
    description:
      "يستأنف تشغيلًا سابقًا فاشلًا من .deploy-push: يعيد نشر الحسابات التي لم تصل READY فقط، بدون commit/push جديد.",
  },
];

export function isDeployAllPhaseId(value: string): value is DeployAllPhaseId {
  return (DEPLOY_ALL_PHASE_ORDER as readonly string[]).includes(value);
}

export function isDeployAllFlagId(value: string): value is DeployAllFlagId {
  return (DEPLOY_ALL_FLAG_IDS as readonly string[]).includes(value);
}

export function isIsolatedDeployTarget(value: string): value is IsolatedDeployTarget {
  return (ISOLATED_DEPLOY_TARGETS as readonly string[]).includes(value);
}
