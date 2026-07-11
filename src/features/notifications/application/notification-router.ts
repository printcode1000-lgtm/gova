import {
  NotificationChannels,
  NotificationPriorities,
  NotificationTargets,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationTarget,
} from "../domain/enums";

export class NotificationRouter {
  resolveChannels(channels: NotificationChannel[], priority: NotificationPriority) {
    if (priority === NotificationPriorities.Critical) {
      return Array.from(
        new Set([
          NotificationChannels.InApp,
          NotificationChannels.WebPush,
          NotificationChannels.AndroidPush,
          NotificationChannels.IosPush,
          ...channels,
        ]),
      );
    }
    return channels;
  }

  resolveTargets(targets: NotificationTarget[], priority: NotificationPriority) {
    if (priority === NotificationPriorities.Critical && !targets.includes(NotificationTargets.Popup)) {
      return [...targets, NotificationTargets.Popup];
    }
    return targets;
  }
}

export const notificationRouter = new NotificationRouter();
