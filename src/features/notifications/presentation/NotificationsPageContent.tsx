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
} from "lucide-react";
import { cn } from "@/shared/utils";
import {
  NotificationCategories,
  NotificationPriorities,
} from "@asol/notifications-core";
import type { NotificationEntity } from "@asol/notifications-core";
import { useNotifications } from "./hooks/use-notifications";
import { useTranslation } from "@/shared/i18n";
import {
  buildActivityGroups,
  buildLocalChatConversations,
  type LocalChatConversation,
  type NotificationActivityGroup,
} from "./notification-center-model";
import {
  FILTER_COLORS,
  amountLabel,
  categoryIcon,
  categoryTone,
  filterIcon,
  filters,
  filterSummary,
  formatDate,
  type NotificationFilter,
} from "./notifications-page-model";
import { useNotificationsFilter } from "./hooks/use-notifications-filter";
import { NotificationsEmptyState } from "./NotificationsEmptyState";
import { uiAttributes } from "@asol/ui-registry-core";

export function NotificationsPageContent() {
  const router = useRouter();
  const { locale } = useTranslation();
  const copy =
    locale === "ar"
      ? {
          title: "الإشعارات",
          login: "سجل الدخول لعرض مركز الإشعارات الخاص بك.",
          signIn: "تسجيل الدخول",
          emptyTitle: "لا توجد عناصر في هذا التبويب",
          emptyText: "ستظهر العناصر هنا عند وصولها.",
        }
      : {
          title: "Notifications",
          login: "Sign in to view your notification center.",
          signIn: "Sign in",
          emptyTitle: "Nothing in this tab",
          emptyText: "Items will appear here when they arrive.",
        };
  const availableFilters = React.useMemo(() => filters(locale), [locale]);
  const {
    uid,
    notifications,
    isLoading,
    markManyRead,
    dismiss,
  } = useNotifications();
  const { filter, tabsScrollRef, filterButtonRefs, selectFilter } =
    useNotificationsFilter(uid);
  const [focusId, setFocusId] = React.useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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

  if (isLoading) {
    return (
      <main {...uiAttributes({ uid: "notifications.notifications-page-content.main.4-nAzmC8", id: "notifications.notifications-page-content.main.4" })} id="notifications.notifications-page-content.main" className="flex min-h-[55vh] items-center justify-center">
        <Loader2 id="notifications.notifications-page-content.loader2" className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!uid) {
    return (
      <main {...uiAttributes({ uid: "notifications.notifications-page-content.main.5-1YGUFU", id: "notifications.notifications-page-content.main.5" })} id="notifications.notifications-page-content.main.2" className="mx-auto max-w-4xl px-4 py-10 text-center">
        <Bell id="notifications.notifications-page-content.bell" className="mx-auto h-10 w-10 text-on-surface-variant" />
        <h1 {...uiAttributes({ uid: "notifications.notifications-page-content.h1.3-kR6WCx", id: "notifications.notifications-page-content.h1.3" })} id="notifications.notifications-page-content.h1" className="mt-4 text-2xl font-bold">{copy.title}</h1>
        <p {...uiAttributes({ uid: "notifications.notifications-page-content.p.3-lwOFc3", id: "notifications.notifications-page-content.p.3" })} id="notifications.notifications-page-content.p" className="mt-2 text-sm text-on-surface-variant">{copy.login}</p>
        <Link id="notifications.notifications-page-content.link" href="/login" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary">
          {copy.signIn}
        </Link>
      </main>
    );
  }

  return (
    <main {...uiAttributes({ uid: "notifications.notifications-page-content.main.6-sFo2Qv", id: "notifications.notifications-page-content.main.6" })} id="notifications.notifications-page-content.main.3" className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-6">
      <header {...uiAttributes({ uid: "notifications.notifications-page-content.header.2-3XJrO5", id: "notifications.notifications-page-content.header.2" })} id="notifications.notifications-page-content.header" className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.3-UCZA9G", id: "notifications.notifications-page-content.div.3" })} id="notifications.notifications-page-content.div">
          <h1 {...uiAttributes({ uid: "notifications.notifications-page-content.h1.4-neQHr5", id: "notifications.notifications-page-content.h1.4" })} id="notifications.notifications-page-content.h1.2" className="flex items-center gap-2 text-2xl font-bold">
            <Bell id="notifications.notifications-page-content.bell.2" className="h-6 w-6 text-primary" aria-hidden="true" />
            {copy.title}
          </h1>
          <p {...uiAttributes({ uid: "notifications.notifications-page-content.p.4-rlPt9d", id: "notifications.notifications-page-content.p.4" })} id="notifications.notifications-page-content.p.2" className="mt-1 text-sm text-on-surface-variant">
            {filterSummary(filter, filteredNotifications.length, locale)}
          </p>
        </div>
      </header>

      {/*
        Same navigation treatment as the profile edit workspace
        (`ProfileEditWorkspaceView`): one coloured square per tab inside a
        tonal, horizontally snapping strip, with the active tab pulsing behind
        its icon.
      */}
      <nav {...uiAttributes({ uid: "notifications.notifications-page-content.nav.2-MxRvK2", id: "notifications.notifications-page-content.nav.2" })} id="notifications.notifications-page-content.nav"
        className="mb-5 w-full max-w-full overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low/85 shadow-sm backdrop-blur-xl"
        aria-label={copy.title}
      >
        {/*
          The strip position is derived from the selected tab, so it is
          deliberately not captured for generic snapshot scroll restoration.
        */}
        <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.4-ZSp5KJ", id: "notifications.notifications-page-content.div.4" })} id="notifications.notifications-page-content.div.2"
          ref={tabsScrollRef}
          data-snapshot-id="notifications-filter-tabs-scroll"
          className="flex snap-x snap-mandatory items-stretch gap-1.5 overflow-x-auto overscroll-x-contain px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {availableFilters.map((item) => {
            const Icon = filterIcon(item.id);
            const color = FILTER_COLORS[item.id];
            const active = filter === item.id;
            return (
              <button key={item.id}
                {...uiAttributes({ uid: "notification-filter-bvMK2l", id: "notification-filter", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "notification-filter" } })}
                ref={(node) => {
                  filterButtonRefs.current[item.id] = node;
                }}
                type="button"
                onClick={() => selectFilter(item.id)}
                aria-pressed={active}
                aria-current={active ? "true" : undefined}
                className="group relative flex h-16 w-16 shrink-0 snap-center snap-always flex-col items-center justify-center gap-0 rounded-xl border text-center shadow-sm transition-all duration-200 active:scale-95"
                style={{
                  paddingInline: "0.0625rem",
                  paddingBlock: "0.0625rem",
                  background: active
                    ? `linear-gradient(135deg, ${color}26, ${color}10)`
                    : `linear-gradient(135deg, ${color}14, ${color}06)`,
                  borderColor: active ? `${color}AA` : `${color}55`,
                }}
              >
                <span {...uiAttributes({ uid: "notifications.notifications-page-content.span-2fhChX", id: "notifications.notifications-page-content.span" })} className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                  {active ? (
                    <>
                      <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.2-9TphEI", id: "notifications.notifications-page-content.span.2" })}
                        className="asol-profile-tab-wave pointer-events-none absolute inset-0 rounded-full"
                        style={{
                          color: `${color}80`,
                          borderColor: `${color}B8`,
                          backgroundColor: `${color}20`,
                        }}
                      />
                      <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.3-6sWf9c", id: "notifications.notifications-page-content.span.3" })}
                        className="asol-profile-tab-wave asol-profile-tab-wave--delayed pointer-events-none absolute inset-0 rounded-full"
                        style={{
                          color: `${color}66`,
                          borderColor: `${color}9E`,
                          backgroundColor: `${color}18`,
                        }}
                      />
                    </>
                  ) : null}
                  <Icon
                    aria-hidden="true"
                    className="relative z-10 shrink-0 transition-transform duration-300"
                    style={{
                      color,
                      width: "2rem",
                      height: "2rem",
                      filter: active
                        ? `drop-shadow(0 0 0.35rem ${color}55)`
                        : undefined,
                    }}
                  />
                </span>
                <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.4-5UKozj", id: "notifications.notifications-page-content.span.4" })}
                  className="line-clamp-2 block w-full text-center font-semibold tracking-tight text-on-surface-variant"
                  style={{ fontSize: "0.5rem", lineHeight: "0.6rem" }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {filteredNotifications.length === 0 ? (
        <NotificationsEmptyState title={copy.emptyTitle} text={copy.emptyText} />
      ) : filter === NotificationCategories.Chat ? (
        <ChatConversationList conversations={conversations} locale={locale} />
      ) : (
        <section {...uiAttributes({ uid: "notifications.notifications-page-content.section.3-1h8sG4", id: "notifications.notifications-page-content.section.3" })} id="notifications.notifications-page-content.section" className="space-y-3">
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
                  router.push(`/notifications/chat?conversationId=${encodeURIComponent(group.key)}`);
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

function ChatConversationList({
  conversations,
  locale,
}: {
  conversations: LocalChatConversation[];
  locale: "ar" | "en";
}) {
  return (
    <section {...uiAttributes({ uid: "notifications.notifications-page-content.section.4-U689OE", id: "notifications.notifications-page-content.section.4" })} id="notifications.notifications-page-content.section.2" className="overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-sm">
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
            href={`/notifications/chat?conversationId=${encodeURIComponent(conversation.key)}`}
            className={cn(
              "flex min-w-0 items-center gap-3 p-4 transition",
              index > 0 && "border-t border-outline-variant/70",
            )}
          >
            <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.5-kzucJ5", id: "notifications.notifications-page-content.span.5" })} className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", categoryTone(NotificationCategories.Chat))}>
              <MessageCircle className="h-6 w-6" />
            </span>
            <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.6-0TJ8XA", id: "notifications.notifications-page-content.span.6" })} className="min-w-0 flex-1">
              <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.7-PX2cRu", id: "notifications.notifications-page-content.span.7" })} className="flex items-center justify-between gap-3">
                <strong className="truncate text-sm text-on-surface">{title}</strong>
                <time className="shrink-0 text-[11px] text-on-surface-variant">
                  {formatDate(conversation.latest.createdAt, locale)}
                </time>
              </span>
              {specialty ? <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.8-0y4mDr", id: "notifications.notifications-page-content.span.8" })} className="mt-0.5 block truncate text-xs font-semibold text-primary">{specialty}</span> : null}
              <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.9-i50MEL", id: "notifications.notifications-page-content.span.9" })} className="mt-1 flex items-center justify-between gap-2">
                <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.10-9ZViso", id: "notifications.notifications-page-content.span.10" })} className="truncate text-sm text-on-surface-variant">
                  {outgoing ? (locale === "ar" ? "أنت: " : "You:") : ""}
                  {conversation.latest.body}
                </span>
                {conversation.unreadCount > 0 ? (
                  <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.11-O87hYM", id: "notifications.notifications-page-content.span.11" })} className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-[11px] font-bold text-on-error">
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
} & { id?: string }) {
  const Icon = categoryIcon(group.category);
  const paymentAmount = amountLabel(group.latest, locale);
  const isCritical = group.latest.priority === NotificationPriorities.Critical;
  const canArchive = group.category !== NotificationCategories.Payment;
  return (
    <article {...uiAttributes({ uid: "notifications.notifications-page-content.article-q3UpqI", id: "notifications.notifications-page-content.article" })}
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
      <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.5-99MW5p", id: "notifications.notifications-page-content.div.5" })} className="flex gap-3 p-4">
        <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.6-KuG40j", id: "notifications.notifications-page-content.div.6" })} className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", categoryTone(group.category))}>
          <Icon className="h-5 w-5" />
        </div>
        <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.7-9KVV18", id: "notifications.notifications-page-content.div.7" })} className="min-w-0 flex-1">
          <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.8-7URT2W", id: "notifications.notifications-page-content.div.8" })} className="flex items-start justify-between gap-3">
            <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.9-58uTYt", id: "notifications.notifications-page-content.div.9" })} className="min-w-0">
              {paymentAmount ? <p {...uiAttributes({ uid: "notifications.notifications-page-content.p.5-9SdvWl", id: "notifications.notifications-page-content.p.5" })} className="mb-1 text-xl font-bold text-on-surface">{paymentAmount}</p> : null}
              <h2 {...uiAttributes({ uid: "notifications.notifications-page-content.h2-RQsr0B", id: "notifications.notifications-page-content.h2" })} className="truncate font-bold text-on-surface">{group.latest.title}</h2>
              <p {...uiAttributes({ uid: "notifications.notifications-page-content.p.6-1GF8cu", id: "notifications.notifications-page-content.p.6" })} className="mt-1 line-clamp-2 text-sm leading-6 text-on-surface-variant">{group.latest.body}</p>
            </div>
            {group.unreadCount > 0 ? (
              <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.12-9LgVMM", id: "notifications.notifications-page-content.span.12" })} className="shrink-0 rounded-full bg-error px-2 py-1 text-xs font-bold text-on-error">
                {group.unreadCount > 1 ? group.unreadCount : locale === "ar" ? "جديد" : "New"}
              </span>
            ) : null}
          </div>
          <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.10-hTd6VT", id: "notifications.notifications-page-content.div.10" })} className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p {...uiAttributes({ uid: "notifications.notifications-page-content.p.7-ESrV2C", id: "notifications.notifications-page-content.p.7" })} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDate(group.latest.createdAt, locale)}
            </p>
            <div {...uiAttributes({ uid: "notifications.notifications-page-content.div.11-mD5Mdx", id: "notifications.notifications-page-content.div.11" })} className="flex flex-wrap gap-2">
              {group.unreadCount > 0 ? (
                <button {...uiAttributes({ uid: "notification-read-15IATb", id: "notification-read", kind: "item", interaction: { type: "toggle" }, simulation: { kind: "list-item", id: "notification-read" } })}
                  type="button"
                  onClick={onRead}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"
                >
                  <CheckCheck className="h-4 w-4" />
                  {locale === "ar" ? "تمت القراءة" : "Mark read"}
                </button>
              ) : null}
              {(group.latest.route?.href || group.category === NotificationCategories.Chat) ? (
                <button {...uiAttributes({ uid: "notification-open-9HZKVZ", id: "notification-open", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "notification-open" } })}
                  type="button"
                  onClick={onOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  {group.latest.route?.label ?? (locale === "ar" ? "فتح التفاصيل" : "Open details")}
                </button>
              ) : null}
              {canArchive ? (
                <button {...uiAttributes({ uid: "notification-dismiss-46S7bK", id: "notification-dismiss", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "notification-dismiss" } })}
                  type="button"
                  onClick={onDismiss}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold text-on-surface-variant"
                >
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
          <summary {...uiAttributes({ uid: "notifications.notifications-page-content.summary-WbqN7M", id: "notifications.notifications-page-content.summary" })} className="flex list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-primary">
            <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.13-GZu6AP", id: "notifications.notifications-page-content.span.13" })}>
              {locale === "ar"
                ? `عرض سجل التحديثات (${group.items.length})`
                : `Show update history (${group.items.length})`}
            </span>
            <ChevronDown className="h-4 w-4" />
          </summary>
          <ol {...uiAttributes({ uid: "notifications.notifications-page-content.ol-RlZO9W", id: "notifications.notifications-page-content.ol" })} className="space-y-0 px-4 pb-4">
            {group.items.map((item, index) => (
              <li key={item.id} {...uiAttributes({ uid: "notifications.notifications-page-content.li-Ne81fP", id: "notifications.notifications-page-content.li" })} className="relative border-s border-outline-variant pb-4 ps-4 last:pb-0">
                <span {...uiAttributes({ uid: "notifications.notifications-page-content.span.14-LzaE4k", id: "notifications.notifications-page-content.span.14" })} className={cn("absolute -start-1.5 top-1 h-3 w-3 rounded-full", index === 0 ? "bg-primary" : "bg-outline-variant")} />
                <p {...uiAttributes({ uid: "notifications.notifications-page-content.p.8-2U9gId", id: "notifications.notifications-page-content.p.8" })} className="text-sm font-semibold text-on-surface">{item.title}</p>
                <p {...uiAttributes({ uid: "notifications.notifications-page-content.p.9-R4ha5C", id: "notifications.notifications-page-content.p.9" })} className="mt-0.5 text-sm text-on-surface-variant">{item.body}</p>
                <time className="mt-1 block text-[11px] text-on-surface-variant">{formatDate(item.createdAt, locale)}</time>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
