"use client";

import type {
  CustomNotificationInput,
  NotificationEntity,
  NotificationEvent,
  NotificationLocale,
  TemplateNotificationInput,
} from "../domain/entities";
import { EventNotificationMapper } from "./event-notification-mapper";
import { NotificationBuilder } from "./notification-builder";
import { notificationSender } from "./notification-sender";
import { notificationApiService } from "../services/notification-api-service";

type Listener = (notification: NotificationEntity) => void;

export class NotificationBus {
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly builder = new NotificationBuilder(),
    private readonly mapper = new EventNotificationMapper(),
  ) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async publishTemplate(input: TemplateNotificationInput): Promise<NotificationEntity> {
    return this.publishBuilt(this.builder.fromTemplate(input));
  }

  async publishCustom(input: CustomNotificationInput): Promise<NotificationEntity> {
    return this.publishBuilt(this.builder.custom(input));
  }

  async publishEvent(event: NotificationEvent, locale: NotificationLocale = "ar") {
    const input = this.mapper.toTemplateInput(event, locale);
    if (!input) return null;
    return this.publishTemplate(input);
  }

  async publishEventToUsers(
    event: Omit<NotificationEvent, "uid" | "dedupeKey"> & {
      uids: string[];
      dedupeKey: string;
    },
    locale: NotificationLocale = "ar",
  ) {
    const mapped = this.mapper.toTemplateInput(
      {
        ...event,
        uid: event.uids[0] ?? "",
        dedupeKey: event.dedupeKey,
      },
      locale,
    );
    return notificationApiService.sendToUsers({
      uids: event.uids,
      templateId: mapped?.templateId,
      locale,
      dedupeKey: event.dedupeKey,
      variables: event.variables,
      metadata: {
        ...(event.metadata ?? {}),
        eventName: event.name,
      },
    });
  }

  private async publishBuilt(notification: NotificationEntity) {
    const saved = await notificationSender.send(notification);
    this.listeners.forEach((listener) => listener(saved));
    return saved;
  }
}

export const notificationBus = new NotificationBus();
