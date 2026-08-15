import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { notificationsAdapter } from "../adapters/notifications.adapter";
import type {
  LocalNotificationSchedule,
  NotificationActionListener,
  NotificationInboxRecord,
  NotificationInboxTap,
  NotificationListener,
  NotificationTapListener,
  PushToken,
  PushTokenListener,
} from "../domain/notifications/types";
import type { Unsubscribe } from "../domain/listener";
import {
  localNotificationScheduleSchema,
  inboundNotificationPayloadSchema,
} from "../validation/notifications.schema";
import { parseInput, parseInbound } from "../validation/helpers";

const MODULE = "Notifications";

export const notificationsApi = {
  async registerForPushNotifications(): Promise<Result<void, NativeCoreError>> {
    try {
      await notificationsAdapter.register();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async unregisterForPushNotifications(): Promise<Result<void, NativeCoreError>> {
    try {
      await notificationsAdapter.unregister();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async ensureNotificationChannels(): Promise<Result<void, NativeCoreError>> {
    try {
      await notificationsAdapter.ensureChannels();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async scheduleLocalNotification(
    schedule: LocalNotificationSchedule,
  ): Promise<Result<void, NativeCoreError>> {
    const valid = parseInput(localNotificationScheduleSchema, schedule, MODULE);
    if (!valid.ok) return valid;

    try {
      await notificationsAdapter.scheduleLocal(valid.value);
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getDeliveredNotifications(): Promise<
    Result<Array<{ id: number; tag?: string; title?: string; body?: string; data?: Record<string, unknown> }>, NativeCoreError>
  > {
    try {
      const delivered = await notificationsAdapter.getDelivered();
      return ok(delivered as any);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async removeDeliveredNotifications(
    _ids: number[],
  ): Promise<Result<void, NativeCoreError>> {
    try {
      await notificationsAdapter.removeAllDelivered();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async removeAllDeliveredNotifications(): Promise<Result<void, NativeCoreError>> {
    try {
      await notificationsAdapter.removeAllDelivered();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onPushToken(
    listener: PushTokenListener,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      await notificationsAdapter.ensureListeners();
      const unsub = notificationsAdapter.onToken((token: PushToken) => {
        listener(token);
      });
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onPushNotificationReceived(
    listener: NotificationListener,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      await notificationsAdapter.ensureListeners();
      const unsub = notificationsAdapter.onReceived((raw: any) => {
        const parsed = parseInbound(inboundNotificationPayloadSchema, raw, MODULE);
        if (parsed.ok) {
          listener(parsed.value as any);
        }
      });
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onPushNotificationActionPerformed(
    listener: NotificationActionListener,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      await notificationsAdapter.ensureListeners();
      const unsub = notificationsAdapter.onAction((raw: any) => {
        listener(raw);
      });
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async listPendingInbox(
    uid: string,
  ): Promise<Result<NotificationInboxRecord[], NativeCoreError>> {
    try {
      const records = await notificationsAdapter.listPendingInbox(uid);
      return ok(records);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async acknowledgeInbox(
    uid: string,
    recordIds: readonly string[],
  ): Promise<Result<number, NativeCoreError>> {
    try {
      const acked = await notificationsAdapter.acknowledgeInbox(uid, recordIds);
      return ok(acked);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async clearInbox(): Promise<Result<void, NativeCoreError>> {
    try {
      await notificationsAdapter.clearInbox();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getPendingInboxCount(): Promise<Result<number, NativeCoreError>> {
    try {
      const count = await notificationsAdapter.pendingInboxCount();
      return ok(count);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async getPendingInboxTap(): Promise<
    Result<NotificationInboxTap | null, NativeCoreError>
  > {
    try {
      const tap = await notificationsAdapter.getInboxTap();
      return ok(tap);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async clearPendingInboxTap(): Promise<Result<void, NativeCoreError>> {
    try {
      await notificationsAdapter.clearInboxTap();
      return ok(undefined);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async onInboxTap(
    listener: NotificationTapListener,
  ): Promise<Result<Unsubscribe, NativeCoreError>> {
    try {
      await notificationsAdapter.ensureInboxTapListener();
      const unsub = notificationsAdapter.onInboxTap(listener);
      return ok(unsub);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
