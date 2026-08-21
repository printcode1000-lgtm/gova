import { formatCurrencyMajor, formatDateTime } from "@asol/format-core";
import {
  Bell,
  CircleDot,
  Inbox,
  MessageCircle,
  PackageCheck,
  Tag,
  Wallet,
} from "lucide-react";

import {
  NotificationCategories,
  type NotificationCategory,
} from "@asol/notifications-core";
import type { NotificationEntity } from "@asol/notifications-core";

export type NotificationFilter = "all" | "unread" | NotificationCategory;

export function filters(
  locale: "ar" | "en",
): Array<{ id: NotificationFilter; label: string }> {
  const labels =
    locale === "ar"
      ? ["الكل", "غير المقروء", "الطلبات", "المحادثات", "العروض", "المدفوعات", "النظام"]
      : ["All", "Unread", "Orders", "Chats", "Offers", "Payments", "System"];
  return [
    { id: "all", label: labels[0] },
    { id: "unread", label: labels[1] },
    { id: NotificationCategories.Orders, label: labels[2] },
    { id: NotificationCategories.Chat, label: labels[3] },
    { id: NotificationCategories.Offers, label: labels[4] },
    { id: NotificationCategories.Payment, label: labels[5] },
    { id: NotificationCategories.System, label: labels[6] },
  ];
}

export function categoryIcon(category: NotificationCategory) {
  if (category === NotificationCategories.Orders) return PackageCheck;
  if (category === NotificationCategories.Chat) return MessageCircle;
  if (category === NotificationCategories.Offers) return Tag;
  if (category === NotificationCategories.Payment) return Wallet;
  return Bell;
}

export function filterIcon(filterValue: NotificationFilter) {
  if (filterValue === "all") return Inbox;
  if (filterValue === "unread") return CircleDot;
  return categoryIcon(filterValue);
}

export const FILTER_COLORS: Record<NotificationFilter, string> = {
  all: "#4F46E5",
  unread: "#DB2777",
  [NotificationCategories.Orders]: "#2563EB",
  [NotificationCategories.Chat]: "#16A34A",
  [NotificationCategories.Offers]: "#D97706",
  [NotificationCategories.Payment]: "#0891B2",
  [NotificationCategories.System]: "#7C3AED",
};

export function categoryTone(category: NotificationCategory): string {
  if (category === NotificationCategories.Orders) return "bg-primary-container text-on-primary-container";
  if (category === NotificationCategories.Chat) return "bg-secondary-container text-on-secondary-container";
  if (category === NotificationCategories.Offers) return "bg-tertiary-container text-on-tertiary-container";
  if (category === NotificationCategories.Payment) return "bg-error-container text-on-error-container";
  return "bg-primary-container text-on-primary-container";
}

export function formatDate(value: string, locale: "ar" | "en") {
  return formatDateTime(value, locale);
}

export function amountLabel(notification: NotificationEntity, locale: "ar" | "en") {
  const raw = notification.metadata?.amount;
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(amount)) return "";
  const currency = String(notification.metadata?.currency ?? "EGP");
  return formatCurrencyMajor(amount, { locale, currency, maximumFractionDigits: 2 });
}

export function filterSummary(
  filterValue: NotificationFilter,
  count: number,
  locale: "ar" | "en",
): string {
  const templates: Record<
    NotificationFilter,
    { ar: (n: number) => string; en: (n: number) => string }
  > = {
    all: {
      ar: (n) => (n > 0 ? `${n} إشعار` : "لا توجد إشعارات"),
      en: (n) => (n > 0 ? `${n} notification${n === 1 ? "" : "s"}` : "No notifications"),
    },
    unread: {
      ar: (n) => (n > 0 ? `${n} إشعار غير مقروء` : "لا توجد إشعارات غير مقروءة"),
      en: (n) =>
        n > 0 ? `${n} unread notification${n === 1 ? "" : "s"}` : "No unread notifications",
    },
    [NotificationCategories.Orders]: {
      ar: (n) => (n > 0 ? `${n} تحديث على طلباتك` : "لا توجد تحديثات على طلباتك"),
      en: (n) => (n > 0 ? `${n} order update${n === 1 ? "" : "s"}` : "No order updates"),
    },
    [NotificationCategories.Chat]: {
      ar: (n) => (n > 0 ? `${n} محادثة` : "لا توجد محادثات"),
      en: (n) => (n > 0 ? `${n} conversation${n === 1 ? "" : "s"}` : "No conversations"),
    },
    [NotificationCategories.Offers]: {
      ar: (n) => (n > 0 ? `${n} عرض جديد` : "لا توجد عروض جديدة"),
      en: (n) => (n > 0 ? `${n} new offer${n === 1 ? "" : "s"}` : "No new offers"),
    },
    [NotificationCategories.Payment]: {
      ar: (n) => (n > 0 ? `${n} تحديث على مدفوعاتك` : "لا توجد تحديثات على المدفوعات"),
      en: (n) => (n > 0 ? `${n} payment update${n === 1 ? "" : "s"}` : "No payment updates"),
    },
    [NotificationCategories.System]: {
      ar: (n) => (n > 0 ? `${n} إشعار من النظام` : "لا توجد إشعارات من النظام"),
      en: (n) => (n > 0 ? `${n} system notification${n === 1 ? "" : "s"}` : "No system notifications"),
    },
  };
  return templates[filterValue][locale](count);
}

export function filterFromQuery(value: string | null): NotificationFilter {
  const allowed: NotificationFilter[] = [
    "all",
    "unread",
    NotificationCategories.Orders,
    NotificationCategories.Chat,
    NotificationCategories.Offers,
    NotificationCategories.Payment,
    NotificationCategories.System,
  ];
  return allowed.includes(value as NotificationFilter)
    ? (value as NotificationFilter)
    : value === "chat"
      ? NotificationCategories.Chat
      : "all";
}
