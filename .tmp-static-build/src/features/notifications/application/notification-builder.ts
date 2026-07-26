import {
  DEFAULT_NOTIFICATION_CHANNELS,
  DEFAULT_NOTIFICATION_PRIORITY,
  DEFAULT_NOTIFICATION_SOUND,
  DEFAULT_NOTIFICATION_TARGETS,
} from "../domain/defaults";
import {
  NotificationContentSources,
  NotificationDeliveryStatuses,
  NotificationSyncStates,
  NotificationTypes,
} from "../domain/enums";
import type {
  CustomNotificationInput,
  NotificationEntity,
  NotificationTemplate,
  TemplateNotificationInput,
} from "../domain/entities";
import { createNotificationId } from "../shared/create-notification-id";
import { NotificationTemplateLoader } from "./notification-template-loader";

function interpolate(text: string, variables: Record<string, string | number | boolean | null> = {}) {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const value = variables[key.trim()];
    return value === null || value === undefined ? "" : String(value);
  });
}

function interpolateRoute(
  route: NotificationTemplate["deepLink"],
  variables: Record<string, string | number | boolean | null> = {},
) {
  if (!route) return undefined;
  return {
    href: interpolate(route.href, variables),
    label: route.label ? interpolate(route.label, variables) : undefined,
  };
}

export class NotificationBuilder {
  constructor(private readonly templateLoader = new NotificationTemplateLoader()) {}

  fromTemplate(input: TemplateNotificationInput): NotificationEntity {
    const template = this.templateLoader.getTemplate(input.locale, input.templateId);
    const now = new Date().toISOString();
    const variables = input.variables ?? {};
    return {
      id: input.notificationId ?? createNotificationId(),
      uid: input.uid,
      type: input.eventName ? NotificationTypes.Event : NotificationTypes.Template,
      source: input.eventName
        ? NotificationContentSources.Event
        : NotificationContentSources.Template,
      templateId: input.templateId,
      eventName: input.eventName,
      title: interpolate(template.title, variables),
      body: interpolate(template.body, variables),
      category: template.category,
      priority: input.priority ?? template.priority ?? DEFAULT_NOTIFICATION_PRIORITY,
      channels: input.channels ?? template.channels ?? DEFAULT_NOTIFICATION_CHANNELS,
      targets: input.targets ?? template.targets ?? DEFAULT_NOTIFICATION_TARGETS,
      route: input.route ?? interpolateRoute(template.deepLink, variables),
      groupKey: template.groupKey,
      dedupeKey: input.dedupeKey,
      sound: template.sound ?? DEFAULT_NOTIFICATION_SOUND,
      status: NotificationDeliveryStatuses.Pending,
      syncState: NotificationSyncStates.Pending,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };
  }

  custom(input: CustomNotificationInput): NotificationEntity {
    const now = new Date().toISOString();
    return {
      id: input.notificationId ?? createNotificationId(),
      uid: input.uid,
      type: NotificationTypes.Custom,
      source: NotificationContentSources.Custom,
      title: input.title,
      body: input.body,
      category: input.category,
      priority: input.priority ?? DEFAULT_NOTIFICATION_PRIORITY,
      channels: input.channels ?? DEFAULT_NOTIFICATION_CHANNELS,
      targets: input.targets ?? DEFAULT_NOTIFICATION_TARGETS,
      route: input.route,
      groupKey: input.groupKey,
      dedupeKey: input.dedupeKey,
      sound: input.sound ?? DEFAULT_NOTIFICATION_SOUND,
      status: NotificationDeliveryStatuses.Pending,
      syncState: NotificationSyncStates.Pending,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };
  }
}
