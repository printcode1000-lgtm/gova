import {
  NotificationCategories,
  NotificationPriorities,
  type SendNotificationToUsersInput,
} from "@asol/notifications-core";
import type { RemoteDeployAllSnapshot } from "@asol/vercel-deploy-core/remote-deploy-contracts";

/**
 * Turns a finished production deploy into the two messages the super admin
 * receives: one in-app notification and one email.
 *
 * Pure on purpose. The delivery mechanisms differ completely — a signed
 * notification grant the browser carries, and an SMTP send from the callback —
 * but what they say must not, and a pure builder is the only part of that worth
 * testing.
 */

export const PRODUCTION_DEPLOY_ROUTE = "/super-admin/production-deploy";

const STAGE_LABELS_AR: Readonly<Record<string, string>> = {
  idle: "خامل",
  sandbox: "تهيئة البيئة",
  dependencies: "تثبيت الاعتماديات",
  preflight: "الفحص المسبق",
  publish: "النشر إلى المستودع",
  notifications: "خدمة الإشعارات",
  products: "خدمة المنتجات",
  orders: "خدمة الطلبات",
  profiles: "خدمة الملفات",
  submain: "خدمة submain",
  sub2main: "خدمة sub2main",
  main: "التطبيق الرئيسي",
  complete: "اكتمل",
};

export function productionDeployStageLabel(stage: string): string {
  return STAGE_LABELS_AR[stage] ?? stage;
}

function succeeded(snapshot: RemoteDeployAllSnapshot): boolean {
  return snapshot.status === "succeeded";
}

function commandLabel(snapshot: RemoteDeployAllSnapshot): string {
  return snapshot.command ?? "deploy:all";
}

export function productionDeployNotification(input: {
  snapshot: RemoteDeployAllSnapshot;
  uids: readonly string[];
  logTail?: string;
}): SendNotificationToUsersInput {
  const { snapshot } = input;
  const ok = succeeded(snapshot);
  const failureDetail = [snapshot.error?.slice(-2_400), input.logTail?.slice(-800)]
    .filter((value, index, values): value is string => Boolean(value?.trim()) && values.indexOf(value) === index)
    .join("\n")
    .slice(-2_800);
  return {
    uids: [...input.uids],
    dedupeKey: `production-deploy:${snapshot.requestId ?? "unknown"}:${snapshot.status}`,
    title: ok ? "اكتمل النشر إلى الإنتاج" : "فشل النشر إلى الإنتاج",
    body: ok
      ? `تم تنفيذ ${commandLabel(snapshot)} بالكامل ونجحت جميع المراحل.`
      : `توقف ${commandLabel(snapshot)} عند مرحلة ${productionDeployStageLabel(snapshot.stage)}. التفاصيل:\n${failureDetail || "سبب غير معروف"}`,
    locale: "ar",
    category: NotificationCategories.System,
    priority: ok ? NotificationPriorities.Normal : NotificationPriorities.High,
    route: { href: PRODUCTION_DEPLOY_ROUTE, label: "لوحة النشر" },
    metadata: {
      requestId: snapshot.requestId,
      status: snapshot.status,
      stage: snapshot.stage,
      exitCode: snapshot.exitCode ?? null,
    },
  };
}

export interface ProductionDeployEmail {
  subject: string;
  text: string;
  html: string;
}

export function productionDeployEmail(input: {
  snapshot: RemoteDeployAllSnapshot;
  logTail: string;
}): ProductionDeployEmail {
  const { snapshot } = input;
  const ok = succeeded(snapshot);
  const lines = [
    ok ? "اكتمل النشر إلى الإنتاج بنجاح." : "فشل النشر إلى الإنتاج.",
    "",
    `المعرّف: ${snapshot.requestId ?? "-"}`,
    `الحالة: ${snapshot.status}`,
    `المرحلة: ${productionDeployStageLabel(snapshot.stage)}`,
    `البدء: ${snapshot.startedAt ?? "-"}`,
    `الانتهاء: ${snapshot.finishedAt ?? "-"}`,
    `رمز الخروج: ${snapshot.exitCode ?? "-"}`,
  ];
  if (!ok && snapshot.error) lines.push("", `السبب: ${snapshot.error}`);

  const tail = input.logTail.slice(-8_000);
  const text = [...lines, "", "آخر السجل:", tail].join("\n");
  return {
    subject: ok ? "ASOL — نجح النشر إلى الإنتاج" : "ASOL — فشل النشر إلى الإنتاج",
    text,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">${lines
      .map((line) => `<p style="margin:2px 0">${escapeHtml(line)}</p>`)
      .join("")}<pre dir="ltr" style="font-family:Consolas,monospace;white-space:pre-wrap;background:#f5f5f5;padding:12px">${escapeHtml(
      tail,
    )}</pre></div>`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
