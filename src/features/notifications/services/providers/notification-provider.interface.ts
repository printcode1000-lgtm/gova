import type {
  NotificationLocale,
  RegisteredNotificationToken,
  SendNotificationToUsersInput,
} from '../../domain/entities';

export interface NotificationProviderPayload {
  locale: NotificationLocale;
  templateId?: string;
  title?: string;
  body?: string;
  dedupeKey: string;
  variables?: SendNotificationToUsersInput['variables'];
  metadata?: SendNotificationToUsersInput['metadata'];
}

export interface NotificationProviderSendInput {
  tokens: RegisteredNotificationToken[];
  payload: NotificationProviderPayload;
}

export interface NotificationProviderSendResult {
  provider: string;
  tokenCount: number;
  status: 'queued' | 'failed';
  message?: string;
}

export interface NotificationProvider {
  readonly provider: string;
  send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult>;
}
