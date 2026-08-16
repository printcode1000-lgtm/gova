/**
 * A running notification module with deterministic edges.
 *
 * Everything the module talks to on the outside — IndexedDB, the push plugin,
 * the local-notification plugin, the permission manager, the platform, the HTTP
 * client, the grant bridge — is replaced with a fake that records what it was
 * asked to do. Everything *inside* the module is the real thing: the real
 * adapters, the real validation, the real repository, the real badge maths.
 *
 * That is the point. A test that calls the repository by hand proves the
 * repository works; it proves nothing about whether a push that arrives on a
 * backgrounded Android device reaches the notification centre. These tests drive
 * the same entry points the application does and assert on what the fakes saw.
 *
 * Fakes are installed into the module cache *before* the module graph loads, and
 * the graph is purged between scenarios, so each scenario starts with fresh
 * singletons — the in-flight locks and listener registries are module state, and
 * leaking them between tests would hide exactly the concurrency bugs these tests
 * exist to catch.
 */

import { createRequire } from "node:module";
import path from "node:path";

const requireFromHere = createRequire(__filename);
const SRC_ROOT = path.resolve(__dirname, "../../../..");

// ---------------------------------------------------------------------------
// Recorded edges
// ---------------------------------------------------------------------------

export interface InboundPayload {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  tag?: string;
  channelId?: string;
}

export type FakePermissionState = "granted" | "denied" | "prompt" | "blocked" | "unsupported";

/**
 * One record in the fake Android device-local inbox.
 *
 * The real one is an application-private, encrypted file that the native push
 * service writes *before* it posts a notification — so it exists even when no
 * WebView, and usually no process, was ever running. This models exactly that:
 * `deliverNativePush` writes a record without touching a single listener,
 * which is what makes "a push received while the app was dead" testable at all.
 */
export interface NativeInboxRecordFixture {
  recordId: string;
  uid: string;
  notificationId: string;
  dedupeKey: string;
  channelId: string;
  createdAt: string;
  receivedAt: number;
  payload: InboundPayload;
}

export interface HarnessState {
  /** Every AsolDB record, keyed `store:key`. Survives a simulated relaunch. */
  db: Map<string, unknown>;
  platform: "android" | "ios" | "web";
  isNative: boolean;
  permission: FakePermissionState;
  online: boolean;

  /** Notifications the OS is currently showing. */
  deliveredTray: InboundPayload[];

  /**
   * The device-local native inbox. On disk, so it survives a relaunch.
   *
   * Reset only by `resetHarnessCompletely`, exactly like the AsolDB map: a
   * process restart does not erase application-private storage, and a test that
   * pretended otherwise would prove the opposite of what it claims.
   */
  nativeInbox: NativeInboxRecordFixture[];
  /** Set to make the native inbox bridge unavailable, as an old shell is. */
  nativeInboxUnavailable: boolean;
  /** The pending launch tap, as the native tap protocol reports it. */
  nativeTap: { recordId: string; uid: string; notificationId: string } | null;
  /** Records the web layer acknowledged, in order. */
  acknowledgedRecordIds: string[];
  /** Set to make every IndexedDB write fail, as a full or blocked store does. */
  dbWriteError: Error | null;
  nativeInboxClearedCount: number;
  /** What the push plugin will answer `register()` with. */
  registrationToken: string;
  registrationError: Error | null;
  /** Set to make the delivered-inbox plugin unavailable. */
  inboxUnavailable: boolean;
  /** Set to make the native channel bridge reject, as it does when a channel
   * could not be ensured. */
  channelCreationError: Error | null;

  // Recordings
  createdChannels: number;
  registerCalls: number;
  unregisterCalls: number;
  removeAllDeliveredCalls: number;
  localDisplays: Array<{ id: string; title: string; channelId?: string; sound?: string }>;
  serverRegisteredTokens: Array<Record<string, unknown>>;
  serverRemovedTokens: Array<Record<string, unknown>>;
  webPushSubscribed: boolean;
  loggedLines: Array<{ level: string; message: string; details: unknown }>;
}

function freshState(): HarnessState {
  return {
    db: new Map(),
    platform: "android",
    isNative: true,
    permission: "granted",
    online: true,
    deliveredTray: [],
    nativeInbox: [],
    nativeInboxUnavailable: false,
    nativeTap: null,
    acknowledgedRecordIds: [],
    dbWriteError: null,
    nativeInboxClearedCount: 0,
    registrationToken: "fcm-token-aaaaaaaaaaaaaaaaaaaaaaaa:APA91bTESTTESTTESTTESTTEST",
    registrationError: null,
    inboxUnavailable: false,
    channelCreationError: null,
    createdChannels: 0,
    registerCalls: 0,
    unregisterCalls: 0,
    removeAllDeliveredCalls: 0,
    localDisplays: [],
    serverRegisteredTokens: [],
    serverRemovedTokens: [],
    webPushSubscribed: false,
    loggedLines: [],
  };
}

/** The one mutable state object every fake reads. */
export const harnessState: HarnessState = freshState();

/**
 * Keep the stored records, drop everything else. Models a process restart.
 *
 * Both durable stores survive: IndexedDB, and the device-local native inbox —
 * which is an application-private file and is precisely the thing that has to
 * outlive a process death for any of this to work. The pending tap survives
 * too: the real pointer is synchronously committed to app-private preferences
 * from the launch Intent, so it outlives both Activity and process recreation.
 */
export function resetHarnessKeepingStorage(): void {
  const db = harnessState.db;
  const nativeInbox = harnessState.nativeInbox;
  const nativeTap = harnessState.nativeTap;
  Object.assign(harnessState, freshState(), { db, nativeInbox, nativeTap });
}

export function resetHarnessCompletely(): void {
  Object.assign(harnessState, freshState());
}

// ---------------------------------------------------------------------------
// Push plugin fake
// ---------------------------------------------------------------------------

type Listener<T> = (payload: T) => void;

class FakePushPlugin {
  readonly received = new Set<Listener<InboundPayload>>();
  readonly actions = new Set<Listener<InboundPayload>>();

  isSupported(): boolean {
    return harnessState.isNative && harnessState.platform !== "web";
  }

  async checkPermission() {
    return {
      kind: "notifications",
      state: harnessState.permission,
      granted: harnessState.permission === "granted",
      requiresSettings: harnessState.permission === "blocked",
    };
  }

  async register() {
    harnessState.registerCalls += 1;
    if (harnessState.registrationError) throw harnessState.registrationError;
    return {
      value: harnessState.registrationToken,
      platform: harnessState.platform,
      provider: harnessState.platform === "ios" ? "apns" : "fcm",
    };
  }

  async unregister(): Promise<void> {
    harnessState.unregisterCalls += 1;
  }

  async getDelivered(): Promise<InboundPayload[]> {
    if (harnessState.inboxUnavailable) throw new Error("plugin unavailable");
    return [...harnessState.deliveredTray];
  }

  async removeAllDelivered(): Promise<void> {
    harnessState.removeAllDeliveredCalls += 1;
    harnessState.deliveredTray = [];
  }

  // ---- the device-local native inbox ---------------------------------------

  readonly taps = new Set<Listener<{ recordId: string; uid: string; notificationId: string }>>();

  async listPendingInbox(uid: string): Promise<NativeInboxRecordFixture[]> {
    if (harnessState.nativeInboxUnavailable) throw new Error("inbox unavailable");
    // Scoped natively, exactly as the store is: another user's record is not
    // merely filtered later, it is never handed over.
    return harnessState.nativeInbox
      .filter((record) => record.uid === uid)
      .sort((left, right) => left.receivedAt - right.receivedAt)
      .map((record) => ({ ...record, payload: { ...record.payload } }));
  }

  async acknowledgeInbox(uid: string, recordIds: readonly string[]): Promise<number> {
    if (harnessState.nativeInboxUnavailable) throw new Error("inbox unavailable");
    const wanted = new Set(recordIds);
    const before = harnessState.nativeInbox.length;
    harnessState.nativeInbox = harnessState.nativeInbox.filter((record) => {
      const remove = record.uid === uid && wanted.has(record.recordId);
      if (remove) harnessState.acknowledgedRecordIds.push(record.recordId);
      return !remove;
    });
    return before - harnessState.nativeInbox.length;
  }

  async clearInbox(): Promise<void> {
    harnessState.nativeInboxClearedCount += 1;
    harnessState.nativeInbox = [];
    harnessState.nativeTap = null;
  }

  async pendingInboxCount(): Promise<number> {
    return harnessState.nativeInbox.length;
  }

  async getInboxTap() {
    const tap = harnessState.nativeTap;
    if (!tap) return null;
    const record = harnessState.nativeInbox.find(
      (entry) => entry.recordId === tap.recordId,
    );
    return {
      recordId: tap.recordId,
      uid: tap.uid,
      notificationId: tap.notificationId,
      ...(record ? { record } : {}),
    };
  }

  async clearInboxTap(): Promise<void> {
    harnessState.nativeTap = null;
  }

  async ensureInboxTapListener(): Promise<void> {}

  onInboxTap(
    listener: Listener<{ recordId: string; uid: string; notificationId: string }>,
  ): () => void {
    this.taps.add(listener);
    return () => this.taps.delete(listener);
  }

  async createChannels(): Promise<void> {
    // The native bridge rejects when the channel set could not be ensured; the
    // count records only the calls that actually created it.
    if (harnessState.channelCreationError) throw harnessState.channelCreationError;
    harnessState.createdChannels += 1;
  }

  async ensureListeners(): Promise<void> {}

  onReceived(listener: Listener<InboundPayload>): () => void {
    this.received.add(listener);
    return () => this.received.delete(listener);
  }

  onAction(listener: Listener<InboundPayload>): () => void {
    this.actions.add(listener);
    return () => this.actions.delete(listener);
  }

  onToken(): () => void {
    return () => undefined;
  }
}

class FakeLocalPlugin {
  readonly actions = new Set<Listener<InboundPayload>>();

  async ensureListeners(): Promise<void> {}

  async schedule(input: {
    id?: string;
    title?: string;
    body?: string;
    channelId?: string;
    sound?: string;
  }): Promise<void> {
    harnessState.localDisplays.push({
      id: String(input.id ?? ""),
      title: String(input.title ?? ""),
      channelId: input.channelId,
      sound: input.sound,
    });
  }

  onAction(listener: Listener<InboundPayload>): () => void {
    this.actions.add(listener);
    return () => this.actions.delete(listener);
  }
}

const fakePush = new FakePushPlugin();
const fakeLocal = new FakeLocalPlugin();
const fakeTokenListeners = new Set<Listener<{ value: string; platform: string; provider: string }>>();

/**
 * A push arriving while no WebView exists.
 *
 * Nothing is emitted, because nothing could be: the process is dead and there
 * are no listeners. The native service normalizes the payload and writes the
 * record, and that record is all the evidence the next app start will have.
 * This is the scenario the whole design exists for, and it is deliberately
 * expressible without touching a listener or a running module.
 *
 * @returns the record id, which is what a tap points at.
 */
export function deliverNativePush(
  uid: string,
  payload: InboundPayload,
  options: { receivedAt?: number } = {},
): string {
  const data = payload.data ?? {};
  const notificationId = String(data.notificationId ?? payload.id ?? "");
  const dedupeKey = String(data.dedupeKey ?? notificationId);
  const recordId = `rec_${uid}_${notificationId}`;
  const receivedAt = options.receivedAt ?? Date.now();
  const record: NativeInboxRecordFixture = {
    recordId,
    uid,
    notificationId,
    dedupeKey,
    channelId: String(data.androidChannelId ?? "asol_general_v4"),
    createdAt: String(data.createdAt ?? new Date(receivedAt).toISOString()),
    receivedAt,
    // The complete payload, exactly as the sender wrote it. The native record
    // keeps the whole data map rather than a reconstruction, so a background
    // delivery cannot lose a field a foreground delivery keeps.
    payload: { ...payload, data: { ...data, uid } },
  };
  // A redelivery of the same message replaces its record instead of stacking a
  // second copy, because the id is derived from the identity.
  harnessState.nativeInbox = [
    ...harnessState.nativeInbox.filter((entry) => entry.recordId !== recordId),
    record,
  ];
  return recordId;
}

/** The user taps a notification whose record is in the native inbox. */
export function tapNativeNotification(uid: string, recordId: string): void {
  const record = harnessState.nativeInbox.find((entry) => entry.recordId === recordId);
  harnessState.nativeTap = {
    recordId,
    uid,
    // Carried by the launch Intent, so it identifies the notification even
    // after the record itself has been imported and acknowledged.
    notificationId: record?.notificationId ?? "",
  };
}

/** A tap delivered to an already-running process, through onNewIntent. */
export async function emitNativeTapEvent(): Promise<void> {
  const tap = harnessState.nativeTap;
  if (!tap) return;
  for (const listener of [...fakePush.taps]) listener(tap);
  await flushMicrotasks();
}

/** Deliver a push to a running application. */
export async function emitForegroundPush(payload: InboundPayload): Promise<void> {
  for (const listener of [...fakePush.received]) listener(payload);
  await flushMicrotasks();
}

/** The user taps a notification. */
export async function emitNotificationTap(payload: InboundPayload): Promise<void> {
  for (const listener of [...fakePush.actions]) listener(payload);
  await flushMicrotasks();
}

/** The user taps a notification this device displayed itself. */
export async function emitLocalNotificationTap(payload: InboundPayload): Promise<void> {
  for (const listener of [...fakeLocal.actions]) listener(payload);
  await flushMicrotasks();
}

/** A token the provider rotated on its own, with no registration call. */
export async function emitPushTokenRefresh(value: string): Promise<void> {
  harnessState.registrationToken = value;
  const token = {
    value,
    platform: harnessState.platform,
    provider: harnessState.platform === "ios" ? "apns" : "fcm",
  };
  for (const listener of [...fakeTokenListeners]) listener(token as never);
  await flushMicrotasks();
}

/** Let every queued promise settle. Handlers are fired without awaiting. */
export async function flushMicrotasks(rounds = 12): Promise<void> {
  for (let index = 0; index < rounds; index += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  for (let index = 0; index < rounds; index += 1) await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Module-cache injection
// ---------------------------------------------------------------------------

function inject(specifier: string, exports: Record<string, unknown>): void {
  const resolved = requireFromHere.resolve(specifier);
  requireFromHere.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  } as NodeJS.Module;
}

let injected = false;
let logCaptureInstalled = false;

/**
 * Record what the module logs, so a test can assert a secret never reached a
 * log line.
 *
 * Installed once and never removed, which is why the runner in the test file
 * writes its own output with `process.stdout.write` rather than `console`: a
 * captured `console.error` would swallow the failure report itself.
 */
function installLogCapture(): void {
  if (logCaptureInstalled) return;
  logCaptureInstalled = true;
  console.warn = (message: unknown, details?: unknown) => {
    harnessState.loggedLines.push({ level: "warn", message: String(message), details });
  };
  console.error = (message: unknown, details?: unknown) => {
    harnessState.loggedLines.push({ level: "error", message: String(message), details });
  };
  console.log = (message: unknown, details?: unknown) => {
    harnessState.loggedLines.push({ level: "log", message: String(message), details });
  };
}

function installFakes(): void {
  if (injected) return;
  injected = true;

  inject("@/modules/data-access/browser/asol-db", {
    ASOL_DB_STORES: {
      NOTIFICATIONS: "notifications",
      NOTIFICATION_SETTINGS: "notificationSettings",
      NOTIFICATION_BADGES: "notificationBadges",
      NOTIFICATION_DEVICE_TOKENS: "notificationDeviceTokens",
      NOTIFICATION_ANALYTICS: "notificationAnalytics",
      NOTIFICATION_OFFLINE_QUEUE: "notificationOfflineQueue",
      APP_SETTINGS: "appSettings",
    },
    asolDbGet: async (store: string, key: string) => harnessState.db.get(`${store}:${key}`),
    asolDbSet: async (store: string, key: string, value: unknown) => {
      // A store that refuses writes. Real, and the case the acknowledgement
      // ordering exists for: the native record must survive it.
      if (harnessState.dbWriteError) throw harnessState.dbWriteError;
      // Structured-clone semantics: storing keeps a copy, so a later mutation of
      // the caller's object cannot silently change what is "persisted".
      harnessState.db.set(`${store}:${key}`, JSON.parse(JSON.stringify(value)));
    },
    asolDbDelete: async (store: string, key: string) => {
      harnessState.db.delete(`${store}:${key}`);
    },
  });

  inject("@/core/config/runtime-context.client", {
    getClientRuntimeContext: () => ({
      platform: harnessState.platform,
      isNative: harnessState.isNative,
    }),
  });

  inject("@asol/native-core", {
    pushNotifications: fakePush,
    localNotifications: fakeLocal,
    NativeCore: {
      isPushSupported: () => harnessState.platform === "android" || harnessState.platform === "ios",
      registerForPushNotifications: async () => {
        try {
          const token = await fakePush.register();
          setTimeout(() => {
            for (const l of [...fakeTokenListeners]) l(token);
          }, 0);
          return { ok: true, value: undefined };
        } catch (error: any) {
          return {
            ok: false,
            error: {
              message: error?.message || "registration failed",
              code: "notifications/delivery-failed",
            },
          };
        }
      },
      checkPermission: async () => ({
        ok: true,
        value: {
          kind: "notifications",
          state: harnessState.permission,
          granted: harnessState.permission === "granted",
          canRequest: harnessState.permission !== "blocked" && harnessState.permission !== "denied",
        },
      }),
      requestPermission: async () => ({
        ok: true,
        value: {
          kind: "notifications",
          state: harnessState.permission,
          granted: harnessState.permission === "granted",
          canRequest: harnessState.permission !== "blocked" && harnessState.permission !== "denied",
        },
      }),
      ensureNotificationChannels: async () => {
        try {
          await fakePush.createChannels();
          return { ok: true, value: undefined };
        } catch (e: any) {
          return { ok: false, error: e };
        }
      },
      unregisterForPushNotifications: async () => {
        await fakePush.unregister();
        return { ok: true, value: undefined };
      },
      scheduleLocalNotification: async (schedule: any) => {
        await fakeLocal.schedule(schedule);
        return { ok: true, value: undefined };
      },
      listPendingInbox: async (uid: string) => {
        try {
          const records = await fakePush.listPendingInbox(uid);
          return { ok: true, value: records };
        } catch (e: any) {
          return { ok: false, error: { message: e?.message || "inbox unavailable", code: "notifications/unavailable" } };
        }
      },
      acknowledgeInbox: async (uid: string, recordIds: readonly string[]) => {
        try {
          const acked = await fakePush.acknowledgeInbox(uid, recordIds);
          return { ok: true, value: acked };
        } catch (e: any) {
          return { ok: false, error: { message: e?.message || "inbox unavailable", code: "notifications/unavailable" } };
        }
      },
      clearInbox: async () => {
        await fakePush.clearInbox();
        return { ok: true, value: undefined };
      },
      getPendingInboxCount: async () => ({ ok: true, value: await fakePush.pendingInboxCount() }),
      getPendingInboxTap: async () => {
        try {
          const tap = await fakePush.getInboxTap();
          return { ok: true, value: tap };
        } catch (e: any) {
          return { ok: false, error: { message: e?.message || "inbox tap unavailable", code: "notifications/unavailable" } };
        }
      },
      clearPendingInboxTap: async () => {
        await fakePush.clearInboxTap();
        return { ok: true, value: undefined };
      },
      onInboxTap: (listener: any) => {
        const unsub = fakePush.onInboxTap(listener);
        return Promise.resolve({ ok: true, value: unsub });
      },
      onPushToken: (listener: any) => {
        fakeTokenListeners.add(listener);
        return Promise.resolve({ ok: true, value: () => fakeTokenListeners.delete(listener) });
      },
      onPushNotificationReceived: (listener: any) => {
        const unsub = fakePush.onReceived(listener);
        return Promise.resolve({ ok: true, value: unsub });
      },
      onPushNotificationActionPerformed: (listener: any) => {
        const unsub1 = fakePush.onAction(listener);
        const unsub2 = fakeLocal.onAction(listener);
        return Promise.resolve({ ok: true, value: () => { unsub1(); unsub2(); } });
      },
      getDeliveredNotifications: async () => {
        try {
          const delivered = await fakePush.getDelivered();
          return { ok: true, value: delivered };
        } catch (e: any) {
          return { ok: false, error: { message: e?.message || "unavailable", code: "notifications/unavailable" } };
        }
      },
      removeAllDeliveredNotifications: async () => {
        await fakePush.removeAllDelivered();
        return { ok: true, value: undefined };
      },
      onAppStateChange: (listener: any) => {
        return Promise.resolve({ ok: true, value: () => {} });
      },
    },
    getPlatformName: () => harnessState.platform,
    isNativePlatform: () => harnessState.isNative,
    isAndroid: () => harnessState.platform === "android",
    isIos: () => harnessState.platform === "ios",
    DEFAULT_CHANNELS: [],
    DEFAULT_CHANNEL_ID: "asol_general_v4",
    DEFAULT_CHANNEL_SOUND: "custom_notification.mp3",
    PermissionKinds: {
      Camera: "camera",
      Photos: "photos",
      Location: "location",
      Microphone: "microphone",
      SpeechRecognition: "speech-recognition",
      Notifications: "notifications",
    },
    PermissionStates: {
      Granted: "granted",
      Denied: "denied",
      Prompt: "prompt",
      Blocked: "blocked",
      Unsupported: "unsupported",
    },
    permissionManager: {
      check: async () => ({
        kind: "notifications",
        state: harnessState.permission,
        granted: harnessState.permission === "granted",
        requiresSettings: harnessState.permission === "blocked",
      }),
      requestIfNeeded: async () => ({
        kind: "notifications",
        state: harnessState.permission,
        granted: harnessState.permission === "granted",
        requiresSettings: harnessState.permission === "blocked",
      }),
      canOpenSettings: () => harnessState.platform === "android",
      openSettings: async () => harnessState.platform === "android",
    },
  });

  inject("@/lib/preferences/app-preferences-storage", {
    readAppPreferencesFromDb: async () => ({ locale: "ar" }),
  });

  inject("@/core/api", {
    ASOL_API_ROUTES: {
      notifications: {
        deviceToken: "/api/notifications/device-token",
        broadcastRecipients: "/api/notifications/broadcast/recipients",
        broadcastSend: "/api/notifications/broadcast/send",
        testSend: "/api/notifications/test/send",
      },
    },
    asolApi: {
      post: async (route: string, body: Record<string, unknown>) => {
        if (route.includes("device-token")) {
          harnessState.serverRegisteredTokens.push(body);
          return { ...body, id: `ntok_${String(body.uid)}` };
        }
        return { requested: 0, results: [] };
      },
      delete: async (route: string) => {
        harnessState.serverRemovedTokens.push({ route });
        return { deleted: true };
      },
      get: async () => ({
        userCount: 0,
        tokenCount: 0,
        providerCounts: {},
        platformCounts: {},
        recipients: [],
      }),
    },
  });

  inject("@/modules/notification-bridge", {
    deliverNotificationGrants: async () => ({ delivered: 0, recipientResults: [] }),
  });
}

/**
 * Load a fresh notification module graph over the installed fakes.
 *
 * Every module under `src/features/notifications` is purged first, so the
 * singletons — locks, listener sets, single-flight maps — are new. Without this
 * a lock left held by one scenario would silently serialize the next one and the
 * concurrency assertions would pass for the wrong reason.
 */
export function loadNotificationModule(): {
  notifications: typeof import("../../index")["notifications"];
  repository: import("../../infrastructure/asol-notification-repository").AsolNotificationRepository;
} {
  installFakes();

  const modulePrefix = path.join(SRC_ROOT, "features", "notifications");
  for (const key of Object.keys(requireFromHere.cache)) {
    if (key.startsWith(modulePrefix)) delete requireFromHere.cache[key];
  }

  fakePush.received.clear();
  fakePush.actions.clear();
  fakePush.taps.clear();
  fakeLocal.actions.clear();
  fakeTokenListeners.clear();

  const api = requireFromHere("../../index") as typeof import("../../index");
  const repositoryModule = requireFromHere(
    "../../infrastructure/asol-notification-repository",
  ) as typeof import("../../infrastructure/asol-notification-repository");
  const redaction = requireFromHere(
    "../../domain/notification-redaction",
  ) as typeof import("../../domain/notification-redaction");

  void redaction;
  installLogCapture();

  return {
    notifications: api.notifications,
    repository: repositoryModule.asolNotificationRepository,
  };
}

/** A push payload shaped the way the providers actually send one. */
export function pushPayload(
  overrides: Partial<InboundPayload> & { data?: Record<string, unknown> } = {},
): InboundPayload {
  return {
    id: "push-1",
    title: "Order accepted",
    body: "Your order was accepted.",
    ...overrides,
    data: {
      notificationId: "ntf_1",
      dedupeKey: "orders.created:ord_1:buyer:user-1",
      category: "orders",
      priority: "high",
      sound: "default",
      routeHref: "/orders/ord_1",
      ...(overrides.data ?? {}),
    },
  };
}
