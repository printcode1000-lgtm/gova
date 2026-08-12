import type {
  NotificationLocale,
  NotificationRoute,
  RegisteredNotificationToken,
  SendNotificationToUsersInput,
} from "../../domain/entities";
import type {
  NotificationCategory,
  NotificationPriority,
  NotificationSound,
} from "../../domain/enums";

export interface NotificationProviderPayload {
  notificationId: string;
  locale: NotificationLocale;
  templateId?: string;
  title?: string;
  body?: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  route?: NotificationRoute;
  groupKey?: string;
  sound: NotificationSound;
  dedupeKey: string;
  variables?: SendNotificationToUsersInput["variables"];
  metadata?: SendNotificationToUsersInput["metadata"];
}

export interface NotificationProviderSendInput {
  tokens: RegisteredNotificationToken[];
  payload: NotificationProviderPayload;
}

export interface NotificationProviderSendResult {
  provider: string;
  tokenCount: number;
  status: "sent" | "partial" | "queued" | "failed";
  successCount?: number;
  failureCount?: number;
  invalidTokenIds?: string[];
  message?: string;
}

export interface NotificationProvider {
  readonly provider: string;
  send(
    input: NotificationProviderSendInput,
  ): Promise<NotificationProviderSendResult>;
}
