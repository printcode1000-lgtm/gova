"use client";

import type {
  AccountDevicesResult,
  BroadcastNotificationInput,
  BroadcastNotificationResult,
  BroadcastRecipientsResult,
  AuthenticatedNotificationTestInput,
  CustomNotificationInput,
  DeviceToken,
  NotificationDeliveryPreference,
  NotificationEntity,
  NotificationEvent,
  NotificationTestResult,
  SelfTestNotificationResult,
  TemplateNotificationInput,
} from "@asol/notifications-core";
import { NotificationTargets } from "@asol/notifications-core";
import { NotificationError, NotificationErrorCodes } from "../../domain/notification-error";
import { notificationLog } from "../../domain/notification-redaction";
import {
  assertDedupeKey,
  assertExtensionRegistration,
  assertLocale,
  assertMetadata,
  assertNotificationId,
  assertPhone,
  assertRetryKind,
  assertString,
  assertUid,
  type RetryOperationKind,
} from "../../domain/notification-validation";
import { notificationBadgeService } from "../badge-service";
import { notificationBus } from "../notification-bus";
import { notificationDeviceTokenService } from "../device-token-service";
import { notificationLifecycleService } from "../notification-lifecycle-service";
import { nativeInboxService } from "../native-inbox-service";
import { notificationPermissionService } from "../permission-service";
import { notificationReceiver } from "../notification-receiver";
import { notificationSender } from "../notification-sender";
import { notificationSyncService } from "../notification-sync-service";
import { asolNotificationRepository } from "../../infrastructure/asol-notification-repository";
import { notificationApiService } from "../../infrastructure/http/notification-api-service";
import { SingleFlight } from "../../infrastructure/concurrency/keyed-mutex";
import {
  registerNotificationCenterExtension,
  replayQueuedOperationWithExtensions,
  runNotificationCenterReadHandlers,
  runNotificationCenterReconcilers,
  type NotificationCenterExtension,
} from "./notification-center-extension";
import type {
  NotificationCenterSnapshot,
  NotificationDiagnostics,
  NotificationPermissionState,
  NotificationReceiveOutcome,
  OpenNotificationResult,
  ReceiveHandlers,
} from "./notification-public-types";

/**
 * The notification module's whole behaviour, as one object.
 *
 * Every method is a use case, not a service call: callers say what they want
 * done, and the facade decides which application service, adapter, and storage
 * call that takes. Nothing outside the module reaches past it, so the internals
 * can be re-shaped without touching a consumer.
 *
 * Two rules hold at this boundary:
 *
 * - **Nothing is trusted.** Every argument is validated before it reaches an
 *   application service. A caller inside this codebase gets a thrown
 *   `NotificationError`; a payload from a provider or a plugin is sanitized
 *   further in, where dropping a field is better than dropping the message.
 * - **Nothing leaks out.** Only domain types cross this line. No Capacitor,
 *   Firebase, APNs, Web Push, IndexedDB, or repository type, and no secret —
 *   diagnostics and errors are built from redacted values only.
 */
export class NotificationsFacade {
  private readonly flights = new SingleFlight();

  // ---- lifecycle -----------------------------------------------------------

  /**
   * Attach this device to the running session.
   *
   * The order here is the durability contract, and it is not interchangeable:
   *
   * 1. install the live listeners and the Android channels;
   * 2. drain the **device-local native inbox** — every push that arrived while
   *    the WebView could not run — into IndexedDB, acknowledging each record
   *    only after it is stored;
   * 3. sweep the Android tray, as a secondary net for notifications posted by
   *    a build that predates the inbox;
   * 4. honour a pending tap, which by now refers to a notification that is
   *    already in the centre.
   *
   * The handlers this installs already have persistence done by the time they
   * run, so a consumer only decides what to do about it — navigate, refresh —
   * and can never be the reason a notification was not stored.
   */
  async initialize(input: {
    uid: string;
    phone: string;
    handlers?: ReceiveHandlers;
  }): Promise<void> {
    const uid = assertUid(input.uid);
    const phone = assertPhone(input.phone);
    const handlers = input.handlers ?? {};

    await notificationDeviceTokenService.initialize(uid, phone, {
      onReceived: async (notification) => {
        const outcome = await notificationReceiver.receiveForeground(notification);
        if (outcome.stored) await handlers.onReceived?.(outcome.notification);
        // The native service persisted this message before handing it to the
        // WebView, so its record is still pending. Retiring it here keeps a busy
        // foreground session from accumulating records it has already stored.
        void nativeInboxService.importPending(uid).catch((error) => {
          notificationLog.warn("Foreground native inbox reconciliation failed", error);
        });
        return outcome.stored;
      },
      onBatchReceived: async (batchUid, notifications) => {
        const results = await notificationReceiver.receiveBatch(batchUid, notifications);
        const stored = results.filter((result) => result.stored).map((result) => result.notification);
        for (const notification of stored) await handlers.onReceived?.(notification);
        return stored;
      },
      onAction: async (notification) => {
        // Store first: a tap on a notification that arrived while the app was
        // terminated is the only delivery of it this device will ever see.
        const outcome = await notificationReceiver.receiveForeground(notification);
        const target = outcome.notification;
        await notificationLifecycleService.markRead(target.uid, target.id);
        await handlers.onOpened?.(target);
      },
    });

    // Taps arriving while this session is live run the identical protocol as a
    // cold-start tap: import everything, then mark only the tapped one read.
    await nativeInboxService.onTap(() => {
      void this.consumeNotificationTap({ uid, handlers });
    });

    await this.importNativeInbox(uid);
    // Secondary compatibility net for notifications posted by a shell that
    // predates the durable inbox. New inbox-owned tray entries are excluded by
    // the native bridge, so this cannot reconstruct a lossy duplicate.
    await notificationDeviceTokenService.syncDeliveredNotifications();
    await this.consumeNotificationTap({ uid, handlers });
  }

  /**
   * Drain the device-local native inbox into IndexedDB.
   *
   * Errors are contained: an unavailable bridge, an old shell, or a platform
   * without an inbox must not stop a session from starting. What must never
   * happen is a record being acknowledged without being stored, and that
   * ordering lives in the inbox service.
   */
  private async importNativeInbox(uid: string): Promise<void> {
    try {
      await nativeInboxService.importPending(uid);
    } catch (error) {
      notificationLog.error("The device-local notification inbox could not be imported.", error);
    }
  }

  /**
   * Honour a pending notification tap for this session.
   *
   * A tap that belongs to a different account is left alone — it waits for its
   * own user rather than being applied to whoever is signed in now.
   */
  private async consumeNotificationTap(input: {
    uid: string;
    handlers: ReceiveHandlers;
  }): Promise<void> {
    try {
      const opened = await nativeInboxService.consumePendingTap(input.uid);
      if (opened) await input.handlers.onOpened?.(opened);
    } catch (error) {
      notificationLog.error("A tapped notification could not be opened.", error);
    }
  }

  // ---- device registration -------------------------------------------------

  registerDevice(input: { uid: string; phone: string }): Promise<DeviceToken | null> {
    return notificationDeviceTokenService.register(
      assertUid(input.uid),
      assertPhone(input.phone),
    );
  }

  /** Opt this device in on whichever transport the platform supports. */
  enableDevice(input: { uid: string; phone: string }): Promise<void> {
    return notificationDeviceTokenService.enable(
      assertUid(input.uid),
      assertPhone(input.phone),
    );
  }

  unregisterDevice(input: { uid: string; phone: string }): Promise<void> {
    return notificationDeviceTokenService.unregister(
      assertUid(input.uid),
      assertPhone(input.phone),
    );
  }

  /** Re-send every token for this device after the UI language changed. */
  refreshDeviceLocale(input: { uid: string; phone: string }): Promise<void> {
    return notificationDeviceTokenService.refreshLocale(
      assertUid(input.uid),
      assertPhone(input.phone),
    );
  }

  listDevices(input: { uid: string }): Promise<DeviceToken[]> {
    return notificationDeviceTokenService.list(assertUid(input.uid));
  }

  /**
   * Every device registered on the account, not just this one.
   *
   * `listDevices` reads this device's own store and can only ever describe the
   * browser or handset it runs on; this one asks the server, which is the only
   * place the account's other registrations exist.
   */
  listAccountDevices(input: {
    sessionToken: string;
  }): Promise<AccountDevicesResult> {
    return notificationApiService.listAccountDevices(input.sessionToken);
  }

  /** Drop one device's registration by id — including one this device is not. */
  async revokeAccountDevice(input: {
    sessionToken: string;
    deviceId: string;
  }): Promise<void> {
    await notificationApiService.revokeAccountDevice(
      input.sessionToken,
      assertString(input.deviceId, "deviceId", 200),
    );
  }

  /** Send this account a fixed test push, to prove delivery end to end. */
  sendSelfTest(input: {
    sessionToken: string;
    locale?: "ar" | "en";
  }): Promise<SelfTestNotificationResult> {
    return notificationApiService.sendSelfTest(
      input.sessionToken,
      input.locale === "en" ? "en" : "ar",
    );
  }

  // ---- permission ----------------------------------------------------------

  /**
   * Ask for permission, and register the device when it is granted, so a caller
   * never has to remember the second half.
   */
  async requestPermission(
    input: { uid?: string; phone?: string } = {},
  ): Promise<NotificationPermission | "unsupported"> {
    const uid = input.uid ? assertUid(input.uid) : "";
    const phone = assertPhone(input.phone);
    const permission = await notificationPermissionService.request();
    if (uid && (permission === "granted" || permission === "unsupported")) {
      await notificationDeviceTokenService.register(uid, phone);
    }
    return permission;
  }

  async getPermissionState(): Promise<NotificationPermissionState> {
    const result = await notificationPermissionService.checkResult();
    return {
      granted: result.granted,
      state: result.state,
      canOpenSettings: await notificationPermissionService.canOpenSettings(),
    };
  }

  /** @returns `false` when the platform offers no settings screen to open. */
  openPermissionSettings(): Promise<boolean> {
    return notificationPermissionService.openSettings();
  }

  /** The account-wide master switch — server state, not a local device flag. */
  getPushPreference(identity: {
    uid: string;
    phone: string;
  }): Promise<NotificationDeliveryPreference> {
    return notificationApiService.getPushPreference({
      uid: assertUid(identity.uid),
      phone: assertPhone(identity.phone),
    });
  }

  /**
   * Mutes or unmutes every notification this account would otherwise receive.
   * Never touches a device's registration or token — see
   * `NotificationDeliveryPreference` for why that distinction matters.
   */
  setPushPreference(input: {
    uid: string;
    phone: string;
    pushEnabled: boolean;
  }): Promise<NotificationDeliveryPreference> {
    return notificationApiService.setPushPreference({
      uid: assertUid(input.uid),
      phone: assertPhone(input.phone),
      pushEnabled: input.pushEnabled,
    });
  }

  // ---- creating notifications ----------------------------------------------

  /** Create a notification on this device: stored, counted, and presented. */
  sendLocal(notification: NotificationEntity): Promise<NotificationEntity> {
    return notificationSender.send(notification);
  }

  /** Build from a shipped template and store it on this device. */
  publishTemplate(input: TemplateNotificationInput): Promise<NotificationEntity> {
    assertUid(input.uid);
    assertDedupeKey(input.dedupeKey);
    assertString(input.templateId, "templateId", 128);
    assertLocale(input.locale);
    assertMetadata(input.metadata);
    return notificationBus.publishTemplate(input);
  }

  /** Build from caller-supplied text and store it on this device. */
  publishCustom(input: CustomNotificationInput): Promise<NotificationEntity> {
    assertUid(input.uid);
    assertDedupeKey(input.dedupeKey);
    assertMetadata(input.metadata);
    return notificationBus.publishCustom(input);
  }

  /**
   * Map a business event to a template and store it.
   * @returns `null` when the event has no mapping.
   */
  publishEvent(input: {
    event: NotificationEvent;
    locale?: "ar" | "en";
  }): Promise<NotificationEntity | null> {
    assertUid(input.event?.uid);
    assertDedupeKey(input.event?.dedupeKey);
    assertString(input.event?.name, "event.name", 128);
    assertMetadata(input.event?.metadata);
    return notificationBus.publishEvent(input.event, input.locale ?? "ar");
  }

  /** Fan a notification out to other users through the notifications service. */
  sendPush(input: BroadcastNotificationInput): Promise<BroadcastNotificationResult> {
    assertUid(input.identity?.uid, "identity.uid");
    assertPhone(input.identity?.phone, "identity.phone");
    assertString(input.title, "title", 300);
    assertString(input.body, "body", 4_000);
    return notificationApiService.sendBroadcast(input);
  }

  listPushRecipients(identity: {
    uid: string;
    phone: string;
  }): Promise<BroadcastRecipientsResult> {
    return notificationApiService.getBroadcastRecipients({
      uid: assertUid(identity.uid),
      phone: assertPhone(identity.phone),
    });
  }

  executeTestScenario(
    input: AuthenticatedNotificationTestInput,
  ): Promise<NotificationTestResult> {
    assertUid(input.identity?.uid, "identity.uid");
    assertString(input.title, "title", 300);
    assertString(input.body, "body", 4_000);
    return notificationApiService.sendTest(input);
  }

  // ---- receiving -----------------------------------------------------------

  /**
   * Persist an inbound notification and count it.
   *
   * `stored` is the acknowledgement signal: it is false for a duplicate, a
   * dismissed identity, or a payload that could not be repaired, and only a
   * true value means a new row exists.
   */
  async receive(notification: unknown): Promise<NotificationReceiveOutcome> {
    const result = await notificationReceiver.receiveForeground(notification);
    return {
      notification: result.notification,
      stored: result.stored,
      ...(result.reason ? { reason: result.reason } : {}),
    };
  }

  /**
   * Import everything that arrived while this WebView was not running.
   *
   * The device-local native inbox first, because it is the reliable source: its
   * records were written before the notification was even displayed. The Android
   * tray sweep runs after it as a secondary net, and the repository's dedupe
   * makes the overlap free.
   *
   * @param input.uid the signed-in user. Omitted, only the tray is swept — a
   * native record is never imported without knowing who it belongs to.
   */
  async importDelivered(input: { uid?: string } = {}): Promise<void> {
    const uid = input?.uid ? assertUid(input.uid) : "";
    if (uid) await this.importNativeInbox(uid);
    await notificationDeviceTokenService.syncDeliveredNotifications();
  }

  createChannels(): Promise<void> {
    return notificationDeviceTokenService.createChannels();
  }

  /**
   * Erase the device-local native inbox.
   *
   * For account deletion and the explicit "clear all local data" action, which
   * must leave nothing of the previous user behind. Signing out deliberately
   * does **not** call this: a pending notification belongs to the user it was
   * addressed to and waits, uid-scoped, for that user to sign in again — it is
   * never handed to the next account.
   */
  clearLocalInbox(): Promise<void> {
    return nativeInboxService.clear();
  }

  // ---- notification centre -------------------------------------------------

  list(input: { uid: string }): Promise<NotificationEntity[]> {
    if (!input?.uid) return Promise.resolve([]);
    return asolNotificationRepository.list(assertUid(input.uid));
  }

  async getUnreadCount(input: { uid: string }): Promise<number> {
    if (!input?.uid) return 0;
    return notificationBadgeService.refresh(assertUid(input.uid));
  }

  /**
   * Bring the centre up to date: replay anything the device could not send, let
   * extensions fold transient cards away, and recount the badge.
   *
   * Coalesced per user. The hook triggers this on mount, on every change event,
   * and when the network returns, which in a burst are one request.
   */
  async synchronizeNotificationCenter(input: {
    uid: string;
  }): Promise<NotificationCenterSnapshot> {
    if (!input?.uid) return { notifications: [], unreadCount: 0 };
    const uid = assertUid(input.uid);
    return this.flights.run(`sync-center:${uid}`, async () => {
      await notificationSyncService.sync(uid, replayQueuedOperationWithExtensions);
      let notifications = await asolNotificationRepository.list(uid);
      if (await runNotificationCenterReconcilers({ uid, notifications })) {
        notifications = await asolNotificationRepository.list(uid);
      }
      const unreadCount = notifications.filter(
        (item) => !item.readAt && item.targets.includes(NotificationTargets.Badge),
      ).length;
      await notificationBadgeService.refresh(uid);
      return { notifications, unreadCount };
    });
  }

  async markRead(input: { uid: string; notificationId: string }): Promise<void> {
    const uid = assertUid(input.uid);
    const notificationId = assertNotificationId(input.notificationId);
    const before = await asolNotificationRepository.list(uid);
    await notificationLifecycleService.markRead(uid, notificationId);
    await runNotificationCenterReadHandlers({
      uid,
      notifications: before.filter((item) => item.id === notificationId),
    });
  }

  async markManyRead(input: {
    uid: string;
    notificationIds: readonly string[];
  }): Promise<void> {
    const uid = assertUid(input.uid);
    if (!Array.isArray(input.notificationIds)) {
      throw new NotificationError(
        NotificationErrorCodes.InvalidField,
        "notificationIds must be an array.",
        { field: "notificationIds" },
      );
    }
    const ids = new Set(input.notificationIds.map((id) => assertNotificationId(id)));
    if (ids.size === 0) return;
    const before = await asolNotificationRepository.list(uid);
    const affected = before.filter((item) => ids.has(item.id) && !item.readAt);
    if (affected.length === 0) return;
    await notificationLifecycleService.markManyRead(
      uid,
      affected.map((item) => item.id),
    );
    await runNotificationCenterReadHandlers({ uid, notifications: affected });
  }

  async markAllRead(input: { uid: string }): Promise<void> {
    const uid = assertUid(input.uid);
    const before = await asolNotificationRepository.list(uid);
    await notificationLifecycleService.markAllRead(uid);
    await runNotificationCenterReadHandlers({
      uid,
      notifications: before.filter((item) => !item.readAt),
    });
  }

  async dismiss(input: { uid: string; notificationId: string }): Promise<void> {
    await notificationLifecycleService.dismiss(
      assertUid(input.uid),
      assertNotificationId(input.notificationId),
    );
  }

  /**
   * Mark a notification opened and hand its deep link back.
   *
   * The module never navigates: routing belongs to the application shell. The
   * route returned has already passed the same safety check every stored route
   * does, so a caller can follow it without re-checking.
   */
  async openNotification(input: {
    uid: string;
    notificationId: string;
  }): Promise<OpenNotificationResult> {
    const uid = assertUid(input.uid);
    const notificationId = assertNotificationId(input.notificationId);
    const items = await asolNotificationRepository.list(uid);
    const target = items.find((item) => item.id === notificationId);
    await this.markRead({ uid, notificationId });
    return { route: target?.route };
  }

  /** Patch the metadata of a stored notification, keeping existing keys. */
  async patchMetadata(input: {
    uid: string;
    notificationId: string;
    metadata: NotificationEntity["metadata"];
  }): Promise<void> {
    const uid = assertUid(input.uid);
    const notificationId = assertNotificationId(input.notificationId);
    const patch = assertMetadata(input.metadata);
    if (!patch) return;
    const items = await asolNotificationRepository.list(uid);
    const current = items.find((item) => item.id === notificationId);
    if (!current) return;
    await asolNotificationRepository.update(uid, notificationId, {
      metadata: assertMetadata({ ...current.metadata, ...patch }),
    });
  }

  /** Queue a call that failed while offline, for the next synchronize. */
  enqueueRetry(input: {
    uid: string;
    kind: RetryOperationKind;
    id: string;
    payload: unknown;
  }): Promise<void> {
    return notificationSyncService.enqueue(
      assertUid(input.uid),
      assertRetryKind(input.kind),
      assertString(input.id, "id", 256),
      input.payload,
    );
  }

  // ---- extension -----------------------------------------------------------

  registerCenterExtension(extension: NotificationCenterExtension): () => void {
    assertExtensionRegistration(extension);
    return registerNotificationCenterExtension(extension);
  }

  // ---- diagnostics ---------------------------------------------------------

  /**
   * One read-only snapshot of everything that decides whether a notification can
   * arrive on this device.
   *
   * Counts and states only. No token, no subscription, no permission object from
   * a plugin — a diagnostics blob is exactly the thing that ends up pasted into
   * a bug report.
   */
  async getDiagnostics(input: { uid?: string } = {}): Promise<NotificationDiagnostics> {
    const uid = input?.uid ? assertUid(input.uid) : "";
    const [permission, deviceEnabled, tokens, stored, pendingNativeInboxCount] =
      await Promise.all([
        this.getPermissionState(),
        notificationDeviceTokenService.isDeviceEnabled(),
        uid ? notificationDeviceTokenService.list(uid) : Promise.resolve([]),
        uid ? asolNotificationRepository.list(uid) : Promise.resolve([]),
        nativeInboxService.pendingCount(),
      ]);
    return {
      platform: notificationDeviceTokenService.getPlatform(),
      pushSupported: notificationDeviceTokenService.isPushSupported(),
      nativePush: notificationDeviceTokenService.isNativePush(),
      deviceEnabled,
      permission,
      deviceTokenCount: tokens.length,
      storedCount: stored.length,
      unreadCount: stored.filter(
        (item) => !item.readAt && item.targets.includes(NotificationTargets.Badge),
      ).length,
      pendingRetryCount: uid ? (await notificationSyncService.listPending(uid)).length : 0,
      pendingNativeInboxCount,
    };
  }
}

export const notificationsFacade = new NotificationsFacade();
