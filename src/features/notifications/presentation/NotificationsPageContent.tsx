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
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationCategories } from "../domain/enums";
import type { NotificationCategory } from "../domain/enums";
import type { NotificationEntity } from "../domain/entities";
import { useNotifications } from "./hooks/use-notifications";
import { useSession } from "@/features/auth/components/SessionProvider";
import { specialtyChatClient, SPECIALTY_CHAT_KINDS } from "@/features/specialty-chat";

const filters: Array<{ id: "all" | "unread" | NotificationCategory; label: string }> = [
  { id: "all", label: "الكل" },
  { id: "unread", label: "غير المقروء" },
  { id: NotificationCategories.Orders, label: "الطلبات" },
  { id: NotificationCategories.Chat, label: "المحادثات" },
  { id: NotificationCategories.System, label: "النظام" },
];

function categoryIcon(category: NotificationCategory) {
  if (category === NotificationCategories.Orders) return PackageCheck;
  if (category === NotificationCategories.Chat) return MessageCircle;
  return Bell;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsPageContent() {
  const router = useRouter();
  const {
    uid,
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    dismiss,
  } = useNotifications();
  const [filter, setFilter] = React.useState<(typeof filters)[number]["id"]>("all");

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
        <h1 className="mt-4 text-2xl font-bold">الإشعارات</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          سجل الدخول لعرض مركز الإشعارات الخاص بك.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary"
        >
          تسجيل الدخول
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : "لا توجد إشعارات غير مقروءة"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary"
          >
            <Bell className="h-4 w-4" />
            تفعيل التنبيهات
          </Link>
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary/90"
          >
            <CheckCheck className="h-4 w-4" />
            تحديد الكل كمقروء
          </button>
        </div>
      </header>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
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
          <h2 className="mt-4 text-lg font-bold">لا توجد إشعارات</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ستظهر هنا تنبيهات الطلبات والمحادثات والنظام عند وصولها.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {visible.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
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
  onOpen,
  onDismiss,
}: {
  notification: NotificationEntity;
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
    session &&
      capability &&
      requestId &&
      notification.metadata?.outgoing !== true &&
      (chatKind === SPECIALTY_CHAT_KINDS.Request || chatKind === SPECIALTY_CHAT_KINDS.Message),
  );
  const [reply, setReply] = React.useState("");
  const [replying, setReplying] = React.useState(false);
  const [replyStatus, setReplyStatus] = React.useState("");

  const sendReply = async () => {
    if (!session || !canReply || !reply.trim()) return;
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
      setReplyStatus("تم إرسال الرد بصورة خاصة.");
    } catch (error) {
      setReplyStatus(error instanceof Error ? error.message : "تعذر إرسال الرد.");
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
                    ? ` — أُرسلت إلى ${Number(notification.metadata?.acceptedUsers ?? 0)}، وصلت إلى ${Number(notification.metadata?.remoteReceivedCount ?? 0)}، قرأها ${Number(notification.metadata?.remoteReadCount ?? 0)}`
                    : ""}
                </p>
              ) : null}
              {notification.metadata?.outgoing === true ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {notification.metadata?.remoteReadAt
                    ? "مقروءة"
                    : notification.metadata?.remoteReceivedAt
                      ? "وصلت"
                      : "أُرسلت"}
                </p>
              ) : null}
            </div>
            {unread ? (
              <span className="rounded-full bg-error px-2 py-1 text-xs font-bold text-on-error">
                جديد
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {formatDate(notification.createdAt)}
            </p>
            <div className="flex flex-wrap gap-2">
              {notification.route?.href ? (
                <button
                  type="button"
                  onClick={onOpen}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  {notification.route.label ?? "فتح"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpen}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold transition hover:border-primary hover:text-primary"
                >
                  <CheckCheck className="h-4 w-4" />
                  تم الاطلاع
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-error transition hover:border-error"
              >
                <Trash2 className="h-4 w-4" />
                حذف
              </button>
            </div>
          </div>
          {canReply ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-outline-variant pt-3 sm:flex-row">
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value.slice(0, 800))}
                placeholder="اكتب ردًا خاصًا..."
                className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={replying || !reply.trim()}
                onClick={() => void sendReply()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                رد خاص
              </button>
            </div>
          ) : null}
          {replyStatus ? <p className="mt-2 text-xs font-semibold text-primary" role="status">{replyStatus}</p> : null}
        </div>
      </div>
    </article>
  );
}
