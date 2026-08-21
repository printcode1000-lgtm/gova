import type { NotificationEntity } from "@asol/notifications-core";

import {
  flushMicrotasks,
  loadNotificationModule,
} from "./notification-harness";

export const UID = "user-1";
export const PHONE = "+201000000000";

export type NotificationFlowScenario = {
  name: string;
  run: () => Promise<void>;
};

export async function startAndroidSession(): Promise<
  ReturnType<typeof loadNotificationModule>
> {
  const loaded = loadNotificationModule();
  await loaded.notifications.initialize({ uid: UID, phone: PHONE });
  await flushMicrotasks();
  return loaded;
}

export async function startAndroidSessionCapturingOpens(uid = UID): Promise<{
  loaded: ReturnType<typeof loadNotificationModule>;
  opened: NotificationEntity[];
}> {
  const loaded = loadNotificationModule();
  const opened: NotificationEntity[] = [];
  await loaded.notifications.initialize({
    uid,
    phone: PHONE,
    handlers: { onOpened: (notification) => { opened.push(notification); } },
  });
  await flushMicrotasks();
  return { loaded, opened };
}
