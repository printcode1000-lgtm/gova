"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import { BOTTOM_NAV_CLEARANCE } from "@/shared/layouts/bottom-nav-layout";
import { useSession } from "@/features/auth/ui";
import {
  conversationMessages,
  findLocalChatConversation,
  useNotifications,
} from "@/features/notifications/ui";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/utils";
import { specialtyChatClient } from "../application/specialty-chat-client";
import { SPECIALTY_CHAT_KINDS } from "../domain/types";
import { uiAttributes } from "@asol/ui-registry-core";
import {
  chatMessageDayKey,
  formatChatMessageDay,
  formatChatMessageTime,
} from "./chat-thread-format";

export function ChatThreadPageContent({ conversationKey }: { conversationKey: string }) {
  const { locale, isRTL } = useTranslation();
  const { session } = useSession();
  const {
    notifications,
    isLoading,
    markManyRead,
    refresh,
  } = useNotifications();
  const conversation = React.useMemo(
    () => findLocalChatConversation(notifications, conversationKey),
    [conversationKey, notifications],
  );
  const messages = React.useMemo(
    () => (conversation ? conversationMessages(conversation) : []),
    [conversation],
  );
  const unreadIds = React.useMemo(
    () =>
      conversation?.items
        .filter((item) => !item.readAt && item.metadata?.outgoing !== true)
        .map((item) => item.id) ?? [],
    [conversation],
  );
  const unreadSignature = unreadIds.join("|");
  const markManyReadRef = React.useRef(markManyRead);
  const markedSignatureRef = React.useRef("");
  const endRef = React.useRef<HTMLDivElement>(null);
  const [reply, setReply] = React.useState("");
  const [replying, setReplying] = React.useState(false);
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    markManyReadRef.current = markManyRead;
  }, [markManyRead]);

  React.useEffect(() => {
    if (!unreadSignature || markedSignatureRef.current === unreadSignature) return;
    markedSignatureRef.current = unreadSignature;
    void markManyReadRef.current(unreadIds);
  }, [unreadIds, unreadSignature]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);

  const replySource = React.useMemo(
    () =>
      [...(conversation?.items ?? [])].find(
        (item) =>
          String(item.metadata?.capability ?? "") &&
          (item.metadata?.specialtyChatKind === SPECIALTY_CHAT_KINDS.Request ||
            item.metadata?.specialtyChatKind === SPECIALTY_CHAT_KINDS.ProductRequest ||
            item.metadata?.specialtyChatKind === SPECIALTY_CHAT_KINDS.ProfileRequest ||
            item.metadata?.specialtyChatKind === SPECIALTY_CHAT_KINDS.Message),
      ),
    [conversation],
  );
  const capability = String(replySource?.metadata?.capability ?? "");
  const canReply = Boolean(
    session?.sessionToken &&
      conversation?.kind === "conversation" &&
      conversation.requestId &&
      conversation.peerUid &&
      capability,
  );

  const sendReply = async () => {
    if (!session?.sessionToken || !conversation || !canReply || !reply.trim()) return;
    setReplying(true);
    setStatus("");
    try {
      await specialtyChatClient.sendMessage(session, {
        messageId: `msg_${crypto.randomUUID().replace(/-/g, "")}`,
        requestId: conversation.requestId,
        peerUid: conversation.peerUid,
        capability,
        message: reply.trim(),
      });
      setReply("");
      await refresh();
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "specialtyChatRecipientUnavailable"
          ? locale === "ar"
            ? "تعذر الوصول إلى جهاز الطرف الآخر حاليًا. لم تُحفظ الرسالة كمرسلة."
            : "The other device is unavailable. The message was not saved as sent."
          : locale === "ar"
            ? "تعذر إرسال الرسالة. حاول مرة أخرى."
            : "Unable to send the message. Try again.",
      );
    } finally {
      setReplying(false);
    }
  };

  if (isLoading) {
    return (
      <main id="specialty-chat.chat-thread-page-content.main" className="flex min-h-[60vh] items-center justify-center">
        <Loader2 id="specialty-chat.chat-thread-page-content.loader2" className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!conversation) {
    return (
      <main {...uiAttributes({ uid: "chat-conversation-missing-TXa01l", id: "chat-conversation-missing", kind: "region", simulation: { kind: "state", id: "chat-conversation-missing" } })} className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <MessageCircle id="specialty-chat.chat-thread-page-content.message-circle" className="h-12 w-12 text-muted-foreground" />
        <h1 id="specialty-chat.chat-thread-page-content.h1" className="mt-4 text-xl font-bold">
          {locale === "ar" ? "المحادثة غير موجودة على هذا الجهاز" : "Conversation not found on this device"}
        </h1>
        <Link id="specialty-chat.chat-thread-page-content.link" href="/notifications?filter=chat" className="mt-5 rounded-xl bg-primary px-5 py-2.5 font-semibold text-on-primary">
          {locale === "ar" ? "العودة إلى المحادثات" : "Back to chats"}
        </Link>
      </main>
    );
  }

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
      : locale === "ar"
        ? "محادثة خاصة"
        : "Private conversation";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <main id="specialty-chat.chat-thread-page-content.main.2" className="mx-auto w-full max-w-3xl px-3 pb-40 pt-3 sm:px-5">
      <header id="specialty-chat.chat-thread-page-content.header" className="sticky top-0 z-20 -mx-3 flex items-center gap-3 border-b border-outline-variant bg-surface/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <Link id="specialty-chat.chat-thread-page-content.link.2" href="/notifications?filter=chat" aria-label={locale === "ar" ? "العودة" : "Back"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span id="specialty-chat.chat-thread-page-content.span" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <MessageCircle id="specialty-chat.chat-thread-page-content.message-circle.2" className="h-5 w-5" />
        </span>
        <span id="specialty-chat.chat-thread-page-content.span.2" className="min-w-0">
          <strong className="block truncate text-on-surface">{title}</strong>
          {specialty ? <span id="specialty-chat.chat-thread-page-content.span.3" className="block truncate text-xs text-muted-foreground">{specialty}</span> : null}
        </span>
      </header>

      <section id="specialty-chat.chat-thread-page-content.section" className="space-y-2 py-4" aria-label={title}>
        {messages.map((message, index) => {
          const outgoing = message.metadata?.outgoing === true;
          const showDay = index === 0 || chatMessageDayKey(messages[index - 1].createdAt) !== chatMessageDayKey(message.createdAt);
          const read = Boolean(message.metadata?.remoteReadAt);
          const received = Boolean(message.metadata?.remoteReceivedAt);
          return (
            <React.Fragment key={message.id}>
              {showDay ? (
                <div className="flex justify-center py-2">
                  <time className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
                    {formatChatMessageDay(message.createdAt, locale)}
                  </time>
                </div>
              ) : null}
              <article className={cn("flex", outgoing ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[86%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[75%]",
                    outgoing
                      ? "rounded-ee-md bg-primary text-on-primary"
                      : "rounded-es-md border border-outline-variant bg-surface-container text-on-surface",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                  <span className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", outgoing ? "text-on-primary/75" : "text-muted-foreground")}>
                    {formatChatMessageTime(message.createdAt, locale)}
                    {outgoing ? (
                      read || received ? (
                        <CheckCheck className={cn("h-3.5 w-3.5", read && "text-cyan-200")} />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )
                    ) : null}
                  </span>
                </div>
              </article>
            </React.Fragment>
          );
        })}
        <div id="specialty-chat.chat-thread-page-content.div" ref={endRef} />
      </section>

      <div id="specialty-chat.chat-thread-page-content.div.2"
        className="fixed inset-x-0 z-40 px-3 sm:px-5"
        style={{ bottom: BOTTOM_NAV_CLEARANCE }}
      >
        <div id="specialty-chat.chat-thread-page-content.div.3" className="mx-auto max-w-3xl rounded-2xl border border-outline-variant bg-surface/95 p-2 shadow-xl backdrop-blur">
          {status ? <p id="specialty-chat.chat-thread-page-content.p" className="mb-2 rounded-xl bg-error/10 px-3 py-2 text-xs font-semibold text-error" role="status">{status}</p> : null}
          {canReply ? (
            <div id="specialty-chat.chat-thread-page-content.div.4" className="flex items-end gap-2">
              <textarea id="specialty-chat.chat-thread-page-content.textarea"
                value={reply}
                onChange={(event) => setReply(event.target.value.slice(0, 800))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendReply();
                  }
                }}
                rows={1}
                placeholder={locale === "ar" ? "اكتب رسالة..." : "Write a message..."}
                className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button {...uiAttributes({ uid: "chat-reply-j1I7FI", id: "chat-reply", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "chat-reply" } })}
                type="button"
                disabled={replying || !reply.trim()}
                onClick={() => void sendReply()}
                aria-label={locale === "ar" ? "إرسال" : "Send"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary disabled:opacity-50"
              >
                {replying ? <Loader2 id="specialty-chat.chat-thread-page-content.loader2.2" className="h-5 w-5 animate-spin" /> : <Send id="specialty-chat.chat-thread-page-content.send" className="h-5 w-5" />}
              </button>
            </div>
          ) : (
            <p id="specialty-chat.chat-thread-page-content.p.2" className="px-3 py-2 text-center text-sm text-muted-foreground">
              {conversation.kind === "broadcast"
                ? locale === "ar"
                  ? "ستظهر محادثة مستقلة هنا عند وصول رد من أحد مقدمي الخدمة."
                  : "A separate conversation will appear when a provider replies."
                : locale === "ar"
                  ? "لا تتوفر صلاحية الرد لهذه المحادثة."
                  : "Reply permission is unavailable for this conversation."}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
