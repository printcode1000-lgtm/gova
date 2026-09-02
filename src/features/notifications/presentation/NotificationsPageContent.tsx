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
      <main id='features-notifications-presentation-notificationspagecontent-main-1-h8mg64' className="flex min-h-[55vh] items-center justify-center">
        <Loader2 id='features-notifications-presentation-notificationspagecontent-loader2-2-l9jqkz' className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!uid) {
    return (
      <main id='features-notifications-presentation-notificationspagecontent-main-3-tnddrr' className="mx-auto max-w-4xl px-4 py-10 text-center">
        <Bell id='features-notifications-presentation-notificationspagecontent-bell-4-fovxnd' className="mx-auto h-10 w-10 text-on-surface-variant" />
        <h1 id='features-notifications-presentation-notificationspagecontent-heading-5-z00450' className="mt-4 text-2xl font-bold">{copy.title}</h1>
        <p id='features-notifications-presentation-notificationspagecontent-text-6-ruzzeg' className="mt-2 text-sm text-on-surface-variant">{copy.login}</p>
        <Link id='features-notifications-presentation-notificationspagecontent-link-7-lqpune' href="/login" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary">
          {copy.signIn}
        </Link>
      </main>
    );
  }

  return (
    <main id='features-notifications-presentation-notificationspagecontent-main-8-ecgjji' className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-6">
      <header id='features-notifications-presentation-notificationspagecontent-header-9-ciqucb' className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div id='features-notifications-presentation-notificationspagecontent-div-10-6kvwyx'>
          <h1 id='features-notifications-presentation-notificationspagecontent-heading-11-7x7l3i' className="flex items-center gap-2 text-2xl font-bold">
            <Bell id='features-notifications-presentation-notificationspagecontent-bell-12-bvdbuk' className="h-6 w-6 text-primary" aria-hidden="true" />
            {copy.title}
          </h1>
          <p id='features-notifications-presentation-notificationspagecontent-text-13-hymxqr' className="mt-1 text-sm text-on-surface-variant">
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
      <nav id='features-notifications-presentation-notificationspagecontent-nav-14-3jear9'
        className="mb-5 w-full max-w-full overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-low/85 shadow-sm backdrop-blur-xl"
        aria-label={copy.title}
      >
        {/*
          The strip position is derived from the selected tab, so it is
          deliberately not captured for generic snapshot scroll restoration.
        */}
        <div id='features-notifications-presentation-notificationspagecontent-div-15-iyp3eo'
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
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                  {active ? (
                    <>
                      <span
                        className="asol-profile-tab-wave pointer-events-none absolute inset-0 rounded-full"
                        style={{
                          color: `${color}80`,
                          borderColor: `${color}B8`,
                          backgroundColor: `${color}20`,
                        }}
                      />
                      <span
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
                <span
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
        <section id='features-notifications-presentation-notificationspagecontent-section-16-pkzm0e' className="space-y-3">
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
    <section id='features-notifications-presentation-notificationspagecontent-section-17-ehpolf' className="overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-sm">
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
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full", categoryTone(NotificationCategories.Chat))}>
              <MessageCircle className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <strong className="truncate text-sm text-on-surface">{title}</strong>
                <time className="shrink-0 text-[11px] text-on-surface-variant">
                  {formatDate(conversation.latest.createdAt, locale)}
                </time>
              </span>
              {specialty ? <span className="mt-0.5 block truncate text-xs font-semibold text-primary">{specialty}</span> : null}
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm text-on-surface-variant">
                  {outgoing ? (locale === "ar" ? "أنت: " : "You:") : ""}
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
} & { id?: string }) {
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
      <div id="features-notifications-presentation-notificationspagecontent-div-19-aon9dm" className="flex gap-3 p-4">
        <div id="features-notifications-presentation-notificationspagecontent-div-20-bbe0vs" className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", categoryTone(group.category))}>
          <Icon className="h-5 w-5" />
        </div>
        <div id="features-notifications-presentation-notificationspagecontent-div-21-rs1vux" className="min-w-0 flex-1">
          <div id="features-notifications-presentation-notificationspagecontent-div-22-sttzfp" className="flex items-start justify-between gap-3">
            <div id="features-notifications-presentation-notificationspagecontent-div-23-a1q3u5" className="min-w-0">
              {paymentAmount ? <p id="features-notifications-presentation-notificationspagecontent-text-24-kjp5le" className="mb-1 text-xl font-bold text-on-surface">{paymentAmount}</p> : null}
              <h2 id="features-notifications-presentation-notificationspagecontent-heading-25-nr3l4l" className="truncate font-bold text-on-surface">{group.latest.title}</h2>
              <p id="features-notifications-presentation-notificationspagecontent-text-26-qyyu94" className="mt-1 line-clamp-2 text-sm leading-6 text-on-surface-variant">{group.latest.body}</p>
            </div>
            {group.unreadCount > 0 ? (
              <span id="features-notifications-presentation-notificationspagecontent-text-27-sxsyhb" className="shrink-0 rounded-full bg-error px-2 py-1 text-xs font-bold text-on-error">
                {group.unreadCount > 1 ? group.unreadCount : locale === "ar" ? "جديد" : "New"}
              </span>
            ) : null}
          </div>
          <div id="features-notifications-presentation-notificationspagecontent-div-28-esfv8w" className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p id="features-notifications-presentation-notificationspagecontent-text-29-gcxc2r" className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDate(group.latest.createdAt, locale)}
            </p>
            <div id="features-notifications-presentation-notificationspagecontent-div-30-ruu5cy" className="flex flex-wrap gap-2">
              {group.unreadCount > 0 ? (
                <button id="features-notifications-presentation-notificationspagecontent-button-31-vzisw0"
                  type="button"
                  onClick={onRead}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"
                >
                  <CheckCheck className="h-4 w-4" />
                  {locale === "ar" ? "تمت القراءة" : "Mark read"}
                </button>
              ) : null}
              {(group.latest.route?.href || group.category === NotificationCategories.Chat) ? (
                <button id="features-notifications-presentation-notificationspagecontent-button-32-emuqwq"
                  type="button"
                  onClick={onOpen}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  {group.latest.route?.label ?? (locale === "ar" ? "فتح التفاصيل" : "Open details")}
                </button>
              ) : null}
              {canArchive ? (
                <button id="features-notifications-presentation-notificationspagecontent-button-33-unby4r"
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
        <details id="features-notifications-presentation-notificationspagecontent-details-34-jjhkte" className="border-t border-outline-variant/70 bg-surface-container/50">
          <summary id="features-notifications-presentation-notificationspagecontent-summary-35-4fpxtu" className="flex list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-primary">
            <span id="features-notifications-presentation-notificationspagecontent-text-36-kqwpmx">
              {locale === "ar"
                ? `عرض سجل التحديثات (${group.items.length})`
                : `Show update history (${group.items.length})`}
            </span>
            <ChevronDown className="h-4 w-4" />
          </summary>
          <ol id="features-notifications-presentation-notificationspagecontent-ol-37-fahsuv" className="space-y-0 px-4 pb-4">
            {group.items.map((item, index) => (
              <li key={item.id} className="relative border-s border-outline-variant pb-4 ps-4 last:pb-0">
                <span className={cn("absolute -start-1.5 top-1 h-3 w-3 rounded-full", index === 0 ? "bg-primary" : "bg-outline-variant")} />
                <p className="text-sm font-semibold text-on-surface">{item.title}</p>
                <p className="mt-0.5 text-sm text-on-surface-variant">{item.body}</p>
                <time className="mt-1 block text-[11px] text-on-surface-variant">{formatDate(item.createdAt, locale)}</time>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
