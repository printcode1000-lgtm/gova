"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { ChatThreadPageContent } from "@/features/notifications/presentation/ChatThreadPageContent";

function NotificationChatThreadContent() {
  const conversationKey = useSearchParams().get("conversationId")?.trim() ?? "";
  return <ChatThreadPageContent conversationKey={conversationKey} />;
}

export default function NotificationChatThreadPage() {
  return (
    <Suspense fallback={null}>
      <NotificationChatThreadContent />
    </Suspense>
  );
}
