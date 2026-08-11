"use client";

import { useParams } from "next/navigation";
import { ChatThreadPageContent } from "@/features/notifications/presentation/ChatThreadPageContent";

export default function NotificationChatThreadPage() {
  const params = useParams<{ conversationId: string }>();
  return <ChatThreadPageContent conversationKey={params.conversationId} />;
}
