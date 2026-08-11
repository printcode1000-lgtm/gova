"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronDown,
  Clock3,
  ExternalLink,
  Loader2,
  MessageCircle,
  PackageCheck,
  Tag,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NotificationCategories,
  NotificationPriorities,
  type NotificationCategory,
} from "../domain/enums";
import type { NotificationEntity } from "../domain/entities";
import { useNotifications } from "./hooks/use-notifications";
import { useTranslation } from "@/lib/i18n";
import {
  buildActivityGroups,
  buildLocalChatConversations,
  type LocalChatConversation,
  type NotificationActivityGroup,
} from "./notification-center-model";

type NotificationFilter = "all" | "unread" | NotificationCategory;

function filters(
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

function categoryIcon(category: NotificationCategory) {
  if (category === NotificationCategories.Orders) return PackageCheck;
  if (category === NotificationCategories.Chat) return MessageCircle;
  if (category === NotificationCategories.Offers) return Tag;
  if (category === NotificationCategories.Payment) return Wallet;
  return Bell;
}

function categoryTone(category: NotificationCategory): string {
  if (category === NotificationCategories.Orders) return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (category === NotificationCategories.Chat) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (category === NotificationCategories.Offers) return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (category === NotificationCategories.Payment) return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
  return "bg-primary/10 text-primary";
}

function formatDate(value: string, locale: "ar" | "en") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function amountLabel(notification: NotificationEntity, locale: "ar" | "en") {
  const raw = notification.metadata?.amount;
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(amount)) return "";
  const currency = String(notification.metadata?.currency ?? "EGP");
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function filterFromQuery(value: string | null): NotificationFilter {
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

export function NotificationsPageContent() {
  const router = useRouter();
  const { locale } = useTranslation();
  const copy =
    locale === "ar"
      ? {
          title: "الإشعارات",
          login: "سجل الدخول لعرض مركز الإشعارات الخاص بك.",
          signIn: "تسجيل الدخول",
          unread: (count: number) => `${count} إشعار غير مقروء`,
          noUnread: "لا توجد إشعارات غير مقروءة",
          enable: "تفعيل التنبيهات",
          markAll: "قراءة الكل",
          emptyTitle: "لا توجد عناصر في هذا التبويب",
          emptyText: "ستظهر العناصر هنا عند وصولها.",
        }
      : {
          title: "Notifications",
          login: "Sign in to view your notification center.",
          signIn: "Sign in",
          unread: (count: number) => `${count} unread notification${count === 1 ? "" : "s"}`,
          noUnread: "No unread notifications",
          enable: "Enable alerts",
          markAll: "Read all",
          emptyTitle: "Nothing in this tab",
          emptyText: "Items will appear here when they arrive.",
        };
  const availableFilters = React.useMemo(() => filters(locale), [locale]);
  const {
    uid,
    notifications,
    unreadCount,
    isLoading,
    markManyRead,
    markAllRead,
    dismiss,
  } = useNotifications();
  const [filter, setFilter] = React.useState<NotificationFilter>("all");
  const [focusId, setFocusId] = React.useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilter(filterFromQuery(params.get("filter")));
    setFocusId(params.get("focus") ?? "");
  }, []);

  const filteredNotifications = React.useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((item) => !item.readAt);
    return notifications.filter((item) => item.category === filter);
  }, [filter, notifications]);

  const groups = React.useMemo(
    () => buildActivityGroups(filteredNotifications),
    [filteredNotifications],
  );
  const conversations = React.useMemo(
    () => buildLocalChatConversations(notifications),
    [notifications],
  );

  React.useEffect(() => {
    if (!focusId || isLoading) return;
    const group = groups.find((candidate) =>
      candidate.items.some(
        (item) =>
          item.id === focusId ||
          String(item.metadata?.requestId ?? "") === focusId,
      ),
    );
    const element = group
      ? document.getElementById(`notification-group-${encodeURIComponent(group.key)}`)
      : null;
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
  }, [focusId, groups, isLoading]);

  const selectFilter = (nextFilter: NotificationFilter) => {
    setFilter(nextFilter);
    const params = new URLSearchParams(window.location.search);
    params.set("filter", nextFilter);
    params.delete("focus");
    router.replace(`/notifications?${params.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return (
      <main className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!uid) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-center">
        <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.login}</p>
        <Link href="/login" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary">
          {copy.signIn}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? copy.unread(unreadCount) : copy.noUnread}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-3 py-2 text-sm font-semibold">
            <Bell className="h-4 w-4" />
            {copy.enable}
          </Link>
          <button type="button" onClick={() => void markAllRead()} disabled={unreadCount === 0} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">
            <CheckCheck className="h-4 w-4" />
            {copy.markAll}
          </button>
        </div>
      </header>

      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label={copy.title}>
        {availableFilters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectFilter(item.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
              filter === item.id
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant text-muted-foreground hover:border-primary hover:text-primary",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {filteredNotifications.length === 0 ? (
        <EmptyState title={copy.emptyTitle} text={copy.emptyText} />
      ) : filter === NotificationCategories.Chat ? (
        <ChatConversationList conversations={conversations} locale={locale} />
      ) : (
        <section className="space-y-3">
          {groups.map((group) => (
            <NotificationGroupCard
              key={group.key}
              group={group}
              locale={locale}
              focused={group.items.some(
                (item) =>
                  item.id === focusId ||
                  String(item.metadata?.requestId ?? "") === focusId,
              )}
              onRead={() => void markManyRead(group.items.map((item) => item.id))}
              onOpen={async () => {
                await markManyRead(group.items.map((item) => item.id));
                if (group.category === NotificationCategories.Chat) {
                  router.push(`/notifications/chat/${encodeURIComponent(group.key)}`);
                } else if (group.latest.route?.href) {
                  router.push(group.latest.route.href);
                }
              }}
              onDismiss={() => void dismiss(group.latest.id)}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-outline-variant p-10 text-center">
      <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </section>
  );
}

function ChatConversationList({
  conversations,
  locale,
}: {
  conversations: LocalChatConversation[];
  locale: "ar" | "en";
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-sm">
      {conversations.map((conversation, index) => {
        const outgoing = conversation.latest.metadata?.outgoing === true;
        const specialty = String(
          conversation.latest.metadata?.subcategoryName ??
            conversation.contextItem?.metadata?.subcategoryName ??
            "",
        );
        const title =
          conversation.kind === "broadcast"
            ? locale === "ar"
              ? "طلب مرسل إلى مقدمي الخدمة"
              : "Request sent to providers"
            : conversation.latest.title ||
              (locale === "ar" ? "محادثة خاصة" : "Private conversation");
        return (
          <Link
            key={conversation.key}
            href={`/notifications/chat/${encodeURIComponent(conversation.key)}`}
            className={cn(
              "flex min-w-0 items-center gap-3 p-4 transition hover:bg-surface-container",
              index > 0 && "border-t border-outline-variant/70",
            )}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <MessageCircle className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <strong className="truncate text-sm text-on-surface">{title}</strong>
                <time className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDate(conversation.latest.createdAt, locale)}
                </time>
              </span>
              {specialty ? <span className="mt-0.5 block truncate text-xs font-semibold text-primary">{specialty}</span> : null}
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm text-muted-foreground">
                  {outgoing ? (locale === "ar" ? "أنت: " : "You: ") : ""}
                  {conversation.latest.body}
                </span>
                {conversation.unreadCount > 0 ? (
                  <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-[11px] font-bold text-on-error">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}

function NotificationGroupCard({
  group,
  locale,
  focused,
  onRead,
  onOpen,
  onDismiss,
}: {
  group: NotificationActivityGroup;
  locale: "ar" | "en";
  focused: boolean;
  onRead: () => void;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const Icon = categoryIcon(group.category);
  const paymentAmount = amountLabel(group.latest, locale);
  const isCritical = group.latest.priority === NotificationPriorities.Critical;
  const canArchive = group.category !== NotificationCategories.Payment;
  return (
    <article
      id={`notification-group-${encodeURIComponent(group.key)}`}
      tabIndex={-1}
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface shadow-sm transition",
        focused
          ? "border-primary ring-2 ring-primary/30"
          : group.unreadCount > 0
            ? "border-primary/50"
            : "border-outline-variant",
        isCritical && "border-error/60",
      )}
    >
      <div className="flex gap-3 p-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", categoryTone(group.category))}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {paymentAmount ? <p className="mb-1 text-xl font-bold text-on-surface">{paymentAmount}</p> : null}
              <h2 className="truncate font-bold text-on-surface">{group.latest.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{group.latest.body}</p>
            </div>
            {group.unreadCount > 0 ? (
              <span className="shrink-0 rounded-full bg-error px-2 py-1 text-xs font-bold text-on-error">
                {group.unreadCount > 1 ? group.unreadCount : locale === "ar" ? "جديد" : "New"}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDate(group.latest.createdAt, locale)}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.unreadCount > 0 ? (
                <button type="button" onClick={onRead} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold">
                  <CheckCheck className="h-4 w-4" />
                  {locale === "ar" ? "تمت القراءة" : "Mark read"}
                </button>
              ) : null}
              {(group.latest.route?.href || group.category === NotificationCategories.Chat) ? (
                <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary">
                  <ExternalLink className="h-4 w-4" />
                  {group.latest.route?.label ?? (locale === "ar" ? "فتح التفاصيل" : "Open details")}
                </button>
              ) : null}
              {canArchive ? (
                <button type="button" onClick={onDismiss} className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <Archive className="h-4 w-4" />
                  {locale === "ar" ? "أرشفة" : "Archive"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {group.items.length > 1 ? (
        <details className="border-t border-outline-variant/70 bg-surface-container/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-primary">
            <span>
              {locale === "ar"
                ? `عرض سجل التحديثات (${group.items.length})`
                : `Show update history (${group.items.length})`}
            </span>
            <ChevronDown className="h-4 w-4" />
          </summary>
          <ol className="space-y-0 px-4 pb-4">
            {group.items.map((item, index) => (
              <li key={item.id} className="relative border-s border-outline-variant pb-4 ps-4 last:pb-0">
                <span className={cn("absolute -start-1.5 top-1 h-3 w-3 rounded-full", index === 0 ? "bg-primary" : "bg-outline-variant")} />
                <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
                <time className="mt-1 block text-[11px] text-muted-foreground">{formatDate(item.createdAt, locale)}</time>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
