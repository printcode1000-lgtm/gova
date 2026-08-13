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

export interface HarnessState {
  /** Every AsolDB record, keyed `store:key`. Survives a simulated relaunch. */
  db: Map<string, unknown>;
  platform: "android" | "ios" | "web";
  isNative: boolean;
  permission: FakePermissionState;
  online: boolean;

  /** Notifications the OS is currently showing. */
  deliveredTray: InboundPayload[];
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

/** Keep the stored records, drop everything else. Models a process restart. */
export function resetHarnessKeepingStorage(): void {
  const db = harnessState.db;
  Object.assign(harnessState, freshState(), { db });
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

  inject("@/native-platform/notifications", {
    pushNotifications: fakePush,
    localNotifications: fakeLocal,
    DEFAULT_CHANNELS: [],
  });

  inject("@/native-platform", {
    nativePlatform: { app: { onStateChange: async () => () => undefined } },
    getPlatformName: () => harnessState.platform,
    DEFAULT_CHANNELS: [],
  });

  inject("@/native-platform/permissions", {
    PermissionKinds: { Notifications: "notifications" },
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
  fakeLocal.actions.clear();

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
