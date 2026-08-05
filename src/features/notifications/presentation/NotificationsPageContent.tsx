"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  MessageCircle,
  PackageCheck,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationCategories } from "../domain/enums";
import type { NotificationCategory } from "../domain/enums";
import type { NotificationEntity } from "../domain/entities";
import { useNotifications } from "./hooks/use-notifications";
import { useSession } from "@/features/auth/components/SessionProvider";
import { specialtyChatClient, SPECIALTY_CHAT_KINDS } from "@/features/specialty-chat";
import { useTranslation } from "@/lib/i18n";

function filters(locale: "ar" | "en"): Array<{ id: "all" | "unread" | NotificationCategory; label: string }> {
  const labels = locale === "ar"
    ? ["الكل", "غير المقروء", "الطلبات", "المحادثات", "العروض", "المدفوعات", "النظام"]
    : ["All", "Unread", "Orders", "Chats", "Offers", "Payments", "System"];
  return [
    { id: "all", label: labels[0] },
    { id: "unread", label: labels[1] },
    { id: NotificationCategories.Orders, label: labels[2] },
    { id: NotificationCategories.Chat, label: labels[3] },
    // Shipping quotes and delivery-plan offers publish under `offers`, so the
    // category needs its own chip to be reachable without scanning "all".
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

function formatDate(value: string, locale: "ar" | "en") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsPageContent() {
  const router = useRouter();
  const { locale } = useTranslation();
  const copy = locale === "ar"
    ? {
        title: "الإشعارات", login: "سجل الدخول لعرض مركز الإشعارات الخاص بك.", signIn: "تسجيل الدخول",
        unread: (count: number) => `${count} إشعار غير مقروء`, noUnread: "لا توجد إشعارات غير مقروءة",
        enable: "تفعيل التنبيهات", markAll: "تحديد الكل كمقروء", emptyTitle: "لا توجد إشعارات",
        emptyText: "ستظهر هنا تنبيهات الطلبات والمحادثات والنظام عند وصولها.",
      }
    : {
        title: "Notifications", login: "Sign in to view your notification center.", signIn: "Sign in",
        unread: (count: number) => `${count} unread notification${count === 1 ? "" : "s"}`, noUnread: "No unread notifications",
        enable: "Enable alerts", markAll: "Mark all as read", emptyTitle: "No notifications",
        emptyText: "Order, chat, and system notifications will appear here when they arrive.",
      };
  const availableFilters = React.useMemo(() => filters(locale), [locale]);
  const {
    uid,
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    dismiss,
  } = useNotifications();
  const [filter, setFilter] = React.useState<(ReturnType<typeof filters>)[number]["id"]>("all");

  const visible = React.useMemo(() => {
    if (filter === "all") return notifications;
    if (filter === "unread") return notifications.filter((item) => !item.readAt);
    return notifications.filter((item) => item.category === filter);
  }, [filter, notifications]);

  const openNotification = async (notification: NotificationEntity) => {
    await markRead(notification.id);
    if (notification.route?.href) router.push(notification.route.href);
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
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.login}
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary"
        >
          {copy.signIn}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? copy.unread(unreadCount) : copy.noUnread}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary"
          >
            <Bell className="h-4 w-4" />
            {copy.enable}
          </Link>
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary/90"
          >
            <CheckCheck className="h-4 w-4" />
            {copy.markAll}
          </button>
        </div>
      </header>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {availableFilters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
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
      </div>

      {visible.length === 0 ? (
        <section className="rounded-xl border border-dashed border-outline-variant p-10 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-bold">{copy.emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.emptyText}
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {visible.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              locale={locale}
              onOpen={() => void openNotification(notification)}
              onDismiss={() => void dismiss(notification.id)}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function NotificationCard({
  notification,
  locale,
  onOpen,
  onDismiss,
}: {
  notification: NotificationEntity;
  locale: "ar" | "en";
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const { session } = useSession();
  const Icon = categoryIcon(notification.category);
  const unread = !notification.readAt;
  const chatKind = String(notification.metadata?.specialtyChatKind ?? "");
  const capability = String(notification.metadata?.capability ?? "");
  const requestId = String(notification.metadata?.requestId ?? "");
  const peerUid = String(notification.metadata?.senderUid ?? notification.metadata?.peerUid ?? "");
  const canReply = Boolean(
    session?.sessionToken &&
      capability &&
      requestId &&
      notification.metadata?.outgoing !== true &&
      (chatKind === SPECIALTY_CHAT_KINDS.Request || chatKind === SPECIALTY_CHAT_KINDS.Message),
  );
  const [reply, setReply] = React.useState("");
  const [replying, setReplying] = React.useState(false);
  const [replyStatus, setReplyStatus] = React.useState("");

  const sendReply = async () => {
    if (!session?.sessionToken || !canReply || !reply.trim()) return;
    setReplying(true);
    setReplyStatus("");
    try {
      const messageId = `msg_${crypto.randomUUID().replace(/-/g, "")}`;
      await specialtyChatClient.sendMessage(session, {
        messageId,
        requestId,
        peerUid,
        capability,
        message: reply.trim(),
      });
      setReply("");
      setReplyStatus(locale === "ar" ? "تم إرسال الرد بصورة خاصة." : "Private reply sent.");
    } catch (error) {
      setReplyStatus(error instanceof Error ? error.message : locale === "ar" ? "تعذر إرسال الرد." : "Unable to send reply.");
    } finally {
      setReplying(false);
    }
  };
  return (
    <article
      className={cn(
        "rounded-xl border bg-surface p-4 shadow-sm transition",
        unread ? "border-primary/50" : "border-outline-variant",
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            unread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-bold text-on-surface">{notification.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {notification.body}
              </p>
              {chatKind === SPECIALTY_CHAT_KINDS.Request ? (
                <p className="mt-2 text-xs font-semibold text-primary">
                  {notification.metadata?.mainCategoryName ? `${notification.metadata.mainCategoryName} ← ` : ""}
                  {String(notification.metadata?.subcategoryName ?? "")}
                  {notification.metadata?.outgoing === true
                    ? locale === "ar"
                      ? ` — أُرسلت إلى ${Number(notification.metadata?.acceptedUsers ?? 0)}، وصلت إلى ${Number(notification.metadata?.remoteReceivedCount ?? 0)}، قرأها ${Number(notification.metadata?.remoteReadCount ?? 0)}`
                      : ` — sent to ${Number(notification.metadata?.acceptedUsers ?? 0)}, received by ${Number(notification.metadata?.remoteReceivedCount ?? 0)}, read by ${Number(notification.metadata?.remoteReadCount ?? 0)}`
                    : ""}
                </p>
              ) : null}
              {notification.metadata?.outgoing === true ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {notification.metadata?.remoteReadAt
                    ? locale === "ar" ? "مقروءة" : "Read"
                    : notification.metadata?.remoteReceivedAt
                      ? locale === "ar" ? "وصلت" : "Received"
                      : locale === "ar" ? "أُرسلت" : "Sent"}
                </p>
              ) : null}
            </div>
            {unread ? (
              <span className="rounded-full bg-error px-2 py-1 text-xs font-bold text-on-error">
                {locale === "ar" ? "جديد" : "New"}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {formatDate(notification.createdAt, locale)}
            </p>
            <div className="flex flex-wrap gap-2">
              {notification.route?.href ? (
                <button
                  type="button"
                  onClick={onOpen}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  {notification.route.label ?? (locale === "ar" ? "فتح" : "Open")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpen}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary"
                >
                  <CheckCheck className="h-4 w-4" />
                  {locale === "ar" ? "تم الاطلاع" : "Mark as read"}
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-error transition hover:border-error"
              >
                <Trash2 className="h-4 w-4" />
                {locale === "ar" ? "حذف" : "Delete"}
              </button>
            </div>
          </div>
          {canReply ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-outline-variant pt-3 sm:flex-row">
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value.slice(0, 800))}
                placeholder={locale === "ar" ? "اكتب ردًا خاصًا..." : "Write a private reply..."}
                className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={replying || !reply.trim()}
                onClick={() => void sendReply()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                {locale === "ar" ? "رد خاص" : "Private reply"}
              </button>
            </div>
          ) : null}
          {replyStatus ? <p className="mt-2 text-xs font-semibold text-primary" role="status">{replyStatus}</p> : null}
        </div>
      </div>
    </article>
  );
}
