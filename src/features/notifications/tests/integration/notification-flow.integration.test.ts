import assert from "node:assert/strict";
import {
  emitForegroundPush,
  emitLocalNotificationTap,
  emitNotificationTap,
  flushMicrotasks,
  harnessState,
  loadNotificationModule,
  pushPayload,
  resetHarnessCompletely,
  resetHarnessKeepingStorage,
} from "./notification-harness";

/**
 * The notification module, driven the way the application drives it.
 *
 * Every scenario goes provider/native input → adapter → validation → use case →
 * repository → badge → notification centre, through the public API only. The
 * assertions are about observable behaviour: what is in the centre, what the
 * badge says, what was displayed, what reached a log.
 *
 * Nothing here calls the repository to *arrange* a state that the flow under
 * test should have produced. Where a starting state is needed it is produced by
 * running the flow that creates it, because a test that arranges its own
 * fixtures cannot fail when the real path stops writing them.
 */

const UID = "user-1";
const PHONE = "+201000000000";

const scenarios: Array<{ name: string; run: () => Promise<void> }> = [];
function scenario(name: string, run: () => Promise<void>): void {
  scenarios.push({ name, run });
}

async function startAndroidSession(): Promise<
  ReturnType<typeof loadNotificationModule>
> {
  const loaded = loadNotificationModule();
  await loaded.notifications.initialize({ uid: UID, phone: PHONE });
  await flushMicrotasks();
  return loaded;
}

// ---------------------------------------------------------------------------
// Foreground
// ---------------------------------------------------------------------------

scenario(
  "android foreground push is stored, counted, and shown exactly once",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    await emitForegroundPush(pushPayload());

    const stored = await notifications.list({ uid: UID });
    assert.equal(
      stored.length,
      1,
      "the push did not reach the notification centre",
    );
    assert.equal(stored[0].route?.href, "/orders/ord_1");
    assert.equal(
      await notifications.getUnreadCount({ uid: UID }),
      1,
      "badge did not count it",
    );
    assert.equal(
      harnessState.localDisplays.length,
      1,
      "Android foreground must produce exactly one local notification",
    );
  },
);

scenario("ios foreground push is stored but never re-presented", async () => {
  resetHarnessCompletely();
  harnessState.platform = "ios";
  const { notifications } = await startAndroidSession();

  await emitForegroundPush(pushPayload());

  assert.equal((await notifications.list({ uid: UID })).length, 1);
  assert.equal(
    harnessState.localDisplays.length,
    0,
    "iOS presents the push itself; a local copy would show it twice",
  );
});

scenario("a data-only delivery is stored but never presented", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();

  await emitForegroundPush(
    pushPayload({
      title: "",
      body: "",
      data: {
        notificationId: "ntf_receipt",
        dedupeKey: "receipt:msg_1",
        meta_dataOnly: "true",
        meta_receiptStatus: "received",
        meta_targetMessageId: "msg_1",
      },
    }),
  );

  assert.equal(
    (await notifications.list({ uid: UID })).length,
    1,
    "the signal was not stored",
  );
  assert.equal(
    harnessState.localDisplays.length,
    0,
    "a data-only signal must not ring",
  );
});

// ---------------------------------------------------------------------------
// Duplicates and exactly-once
// ---------------------------------------------------------------------------

scenario(
  "a re-delivered push does not create a second notification",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    await emitForegroundPush(pushPayload());
    await emitForegroundPush(pushPayload());

    assert.equal((await notifications.list({ uid: UID })).length, 1);
    assert.equal(
      harnessState.localDisplays.length,
      1,
      "a duplicate must not be presented a second time",
    );
  },
);

scenario("concurrent deliveries of different pushes all survive", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();

  // Fired together, deliberately not awaited in turn: this is the read-modify-
  // write race that used to drop every notification but the last.
  await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      emitForegroundPush(
        pushPayload({
          id: `push-${index}`,
          data: {
            notificationId: `ntf_${index}`,
            dedupeKey: `dedupe-${index}`,
          },
        }),
      ),
    ),
  );
  await flushMicrotasks();

  const stored = await notifications.list({ uid: UID });
  assert.equal(
    stored.length,
    12,
    `concurrent writes lost records: kept ${stored.length}/12`,
  );
  assert.equal(
    await notifications.getUnreadCount({ uid: UID }),
    12,
    "badge is wrong after concurrent writes",
  );
});

scenario("concurrent tray imports import each notification once", async () => {
  resetHarnessCompletely();
  harnessState.deliveredTray = Array.from({ length: 5 }, (_, index) =>
    pushPayload({
      id: `tray-${index}`,
      data: {
        notificationId: `tray_${index}`,
        dedupeKey: `tray-dedupe-${index}`,
      },
    }),
  );
  const { notifications } = await startAndroidSession();

  await Promise.all([
    notifications.importDelivered(),
    notifications.importDelivered(),
    notifications.importDelivered(),
  ]);
  await flushMicrotasks();

  const stored = await notifications.list({ uid: UID });
  assert.equal(
    stored.length,
    5,
    `tray import was not exactly-once: ${stored.length} rows`,
  );
});

// ---------------------------------------------------------------------------
// Background, terminated, resume, tap
// ---------------------------------------------------------------------------

scenario(
  "notifications delivered while terminated are imported on next start",
  async () => {
    resetHarnessCompletely();
    harnessState.deliveredTray = [
      pushPayload({
        id: "bg-1",
        data: { notificationId: "bg_1", dedupeKey: "bg-1" },
      }),
      pushPayload({
        id: "bg-2",
        data: { notificationId: "bg_2", dedupeKey: "bg-2" },
      }),
    ];

    const { notifications } = await startAndroidSession();

    const stored = await notifications.list({ uid: UID });
    assert.equal(stored.length, 2, "the tray was not imported at startup");
    assert.equal(
      harnessState.localDisplays.length,
      0,
      "tray notifications were already shown by the OS and must not be shown again",
    );
  },
);

scenario("a resume re-import after a restart does not duplicate", async () => {
  resetHarnessCompletely();
  harnessState.deliveredTray = [
    pushPayload({
      id: "bg-1",
      data: { notificationId: "bg_1", dedupeKey: "bg-1" },
    }),
  ];
  await startAndroidSession();

  // The process restarts; storage survives, module state does not.
  resetHarnessKeepingStorage();
  harnessState.deliveredTray = [
    pushPayload({
      id: "bg-1",
      data: { notificationId: "bg_1", dedupeKey: "bg-1" },
    }),
  ];
  const restarted = await startAndroidSession();
  await restarted.notifications.importDelivered();
  await flushMicrotasks();

  assert.equal(
    (await restarted.notifications.list({ uid: UID })).length,
    1,
    "a restart re-imported the same tray notification",
  );
});

scenario(
  "a cold-start tap stores, marks read, and yields the route",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    await emitNotificationTap(pushPayload());

    const stored = await notifications.list({ uid: UID });
    assert.equal(
      stored.length,
      1,
      "a tapped notification must still be stored",
    );
    assert.ok(stored[0].readAt, "a tapped notification must be marked read");
    assert.equal(
      await notifications.getUnreadCount({ uid: UID }),
      0,
      "badge must not count a notification the user opened",
    );
  },
);

scenario(
  "a tap on a locally displayed notification routes identically",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    await emitLocalNotificationTap(pushPayload());

    const stored = await notifications.list({ uid: UID });
    assert.equal(stored.length, 1);
    assert.ok(stored[0].readAt);
  },
);

scenario(
  "openNotification returns the deep link and marks it read",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();
    await emitForegroundPush(pushPayload());

    const result = await notifications.openNotification({
      uid: UID,
      notificationId: "ntf_1",
    });

    assert.equal(result.route?.href, "/orders/ord_1");
    assert.equal(await notifications.getUnreadCount({ uid: UID }), 0);
  },
);

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

scenario("the centre and its read state survive a relaunch", async () => {
  resetHarnessCompletely();
  const first = await startAndroidSession();
  await emitForegroundPush(pushPayload());
  await first.notifications.markAllRead({ uid: UID });

  resetHarnessKeepingStorage();
  const second = await startAndroidSession();

  const stored = await second.notifications.list({ uid: UID });
  assert.equal(stored.length, 1, "the centre did not survive a relaunch");
  assert.ok(stored[0].readAt, "read state did not survive a relaunch");
  assert.equal(await second.notifications.getUnreadCount({ uid: UID }), 0);
});

scenario(
  "a dismissed notification is not restored by a re-delivery",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();
    await emitForegroundPush(pushPayload());
    await notifications.dismiss({ uid: UID, notificationId: "ntf_1" });

    await emitForegroundPush(pushPayload());

    assert.equal(
      (await notifications.list({ uid: UID })).length,
      0,
      "a deleted notification came back",
    );
  },
);

scenario(
  "a notification for a different user never appears in this centre",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();
    await emitForegroundPush(pushPayload());

    assert.equal((await notifications.list({ uid: "someone-else" })).length, 0);
    assert.equal((await notifications.list({ uid: UID })).length, 1);
  },
);

// ---------------------------------------------------------------------------
// Malformed and hostile input
// ---------------------------------------------------------------------------

scenario(
  "an unsafe deep link is dropped, and the notification is still stored",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    for (const href of [
      "//evil.test/steal",
      "https://evil.test",
      "javascript:alert(1)",
      "/\\evil.test",
      "/orders/../../admin",
    ]) {
      await emitForegroundPush(
        pushPayload({
          id: `unsafe-${href}`,
          data: {
            notificationId: `ntf_${href}`,
            dedupeKey: `dedupe-${href}`,
            routeHref: href,
          },
        }),
      );
    }

    const stored = await notifications.list({ uid: UID });
    assert.equal(
      stored.length,
      5,
      "notifications with a bad route must still be stored",
    );
    for (const item of stored) {
      assert.equal(
        item.route,
        undefined,
        `unsafe route survived: ${String(item.route?.href)}`,
      );
    }
  },
);

scenario(
  "a prototype-polluting metadata key never reaches storage",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    await emitForegroundPush(
      pushPayload({
        data: {
          notificationId: "ntf_proto",
          dedupeKey: "proto",
          meta___proto__: '{"polluted":true}',
          meta_constructor: "x",
          meta_safe: "kept",
        },
      }),
    );

    const stored = await notifications.list({ uid: UID });
    assert.equal(stored.length, 1);
    assert.equal(stored[0].metadata?.safe, "kept");
    assert.equal(
      ({} as Record<string, unknown>).polluted,
      undefined,
      "Object.prototype was polluted",
    );
    assert.ok(
      !Object.prototype.hasOwnProperty.call(
        stored[0].metadata ?? {},
        "__proto__",
      ),
      "a forbidden metadata key was stored",
    );
  },
);

scenario(
  "an unsupported enum value falls back instead of being stored raw",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    await emitForegroundPush(
      pushPayload({
        data: {
          notificationId: "ntf_enum",
          dedupeKey: "enum",
          category: "not-a-category",
          priority: "ultra",
          sound: "airhorn",
        },
      }),
    );

    const [stored] = await notifications.list({ uid: UID });
    assert.equal(stored.category, "system");
    assert.equal(stored.priority, "normal");
    assert.equal(stored.sound, "default");
  },
);

scenario("an implausible timestamp is replaced, not stored", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();

  await emitForegroundPush(
    pushPayload({
      data: {
        notificationId: "ntf_time",
        dedupeKey: "time",
        createdAt: "not-a-date",
      },
    }),
  );

  const [stored] = await notifications.list({ uid: UID });
  assert.ok(
    !Number.isNaN(Date.parse(stored.createdAt)),
    "an unparseable timestamp reached storage",
  );
});

scenario("an empty ASOL placeholder never reaches the centre", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();

  await emitForegroundPush({
    id: "placeholder",
    title: "ASOL",
    body: "",
    data: {},
  });

  assert.equal((await notifications.list({ uid: UID })).length, 0);
  assert.equal(harnessState.localDisplays.length, 0);
});

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

scenario("an unknown command fails closed", async () => {
  resetHarnessCompletely();
  const { notifications } = loadNotificationModule();

  await assert.rejects(
    () =>
      (
        notifications.execute as unknown as (
          command: unknown,
        ) => Promise<unknown>
      )({
        type: "deleteEverything",
        payload: {},
      }),
    (error: unknown) =>
      (error as { code?: string }).code === "notifications/unknown-command",
    "an unknown command must be rejected, not ignored",
  );
});

scenario(
  "a malformed command payload is rejected before it reaches storage",
  async () => {
    resetHarnessCompletely();
    const { notifications } = loadNotificationModule();

    await assert.rejects(
      () =>
        notifications.execute({ type: "markAllRead", payload: { uid: "" } }),
      (error: unknown) => typeof (error as { code?: string }).code === "string",
    );
    await assert.rejects(
      () =>
        notifications.execute({
          type: "openNotification",
          payload: { uid: UID, notificationId: "" },
        }),
      (error: unknown) => typeof (error as { code?: string }).code === "string",
    );
  },
);

scenario("execute and the named method are the same use case", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();
  await emitForegroundPush(pushPayload());

  const viaCommand = await notifications.execute({
    type: "list",
    payload: { uid: UID },
  });
  const viaMethod = await notifications.list({ uid: UID });
  assert.deepEqual(viaCommand, viaMethod);
});

// ---------------------------------------------------------------------------
// Permission, platform, and degradation
// ---------------------------------------------------------------------------

scenario(
  "android initialization creates the channels before permission is asked",
  async () => {
    resetHarnessCompletely();
    // The device has never answered the runtime prompt.
    harnessState.permission = "prompt";
    const { notifications } = loadNotificationModule();

    await notifications.initialize({ uid: UID, phone: PHONE });
    await flushMicrotasks();

    assert.ok(
      harnessState.createdChannels > 0,
      "channels must exist before the user is asked; they are what the settings screen lists",
    );
    assert.equal(
      harnessState.registerCalls,
      0,
      "initialization must not register a device that has not opted in",
    );
  },
);

scenario(
  "a denied permission keeps the channels and blocks registration",
  async () => {
    resetHarnessCompletely();
    harnessState.permission = "denied";
    const { notifications } = loadNotificationModule();

    await notifications.initialize({ uid: UID, phone: PHONE });
    await flushMicrotasks();
    const channelsAfterInitialize = harnessState.createdChannels;
    assert.ok(
      channelsAfterInitialize > 0,
      "a refused grant must not stop channel creation",
    );

    const diagnostics = await notifications.getDiagnostics({ uid: UID });
    assert.equal(diagnostics.permission.granted, false);
    assert.equal(diagnostics.permission.state, "denied");
    assert.equal(diagnostics.deviceTokenCount, 0);
    await assert.rejects(() =>
      notifications.registerDevice({ uid: UID, phone: PHONE }),
    );
    assert.equal(
      harnessState.registerCalls,
      0,
      "a denied device must never reach the push provider",
    );
    assert.ok(
      harnessState.createdChannels >= channelsAfterInitialize,
      "the refused registration must still have left the channels in place",
    );
  },
);

scenario("granting permission registers the device as usual", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();

  assert.ok(harnessState.createdChannels > 0);
  const token = await notifications.registerDevice({ uid: UID, phone: PHONE });
  assert.ok(token, "a granted device must register");
  assert.equal(token.provider, "fcm");
  assert.ok(harnessState.registerCalls > 0);
  assert.equal(harnessState.serverRegisteredTokens.length > 0, true);
});

scenario(
  "repeated channel creation is idempotent and never throws",
  async () => {
    resetHarnessCompletely();
    harnessState.permission = "prompt";
    const { notifications } = loadNotificationModule();

    await notifications.initialize({ uid: UID, phone: PHONE });
    await notifications.createChannels();
    await notifications.createChannels();
    await flushMicrotasks();

    // Creating a channel that exists is a no-op on the device, so the only thing
    // worth asserting is that the module keeps asking without failing.
    assert.ok(
      harnessState.createdChannels >= 3,
      "every call must reach the single native creator",
    );
    assert.equal((await notifications.list({ uid: UID })).length, 0);
  },
);

scenario(
  "a device whose channels failed is never registered with the provider",
  async () => {
    resetHarnessCompletely();
    harnessState.channelCreationError = new Error(
      "Notification channels could not be created.",
    );
    const { notifications } = loadNotificationModule();

    // Initialization survives it: the tray import and the live listeners still
    // work, and the failure is reported rather than swallowed.
    await notifications.initialize({ uid: UID, phone: PHONE });
    await flushMicrotasks();
    assert.ok(
      harnessState.loggedLines.some(
        (line) => line.level === "error" && line.message.includes("channels"),
      ),
      "a failed channel creation must be observable in the log",
    );

    // Registration is not: a token for a device with no channels buys pushes
    // Android would present on a fallback channel with the wrong sound.
    await assert.rejects(
      () => notifications.registerDevice({ uid: UID, phone: PHONE }),
      (error: unknown) => {
        assert.equal(
          (error as { code?: string }).code,
          "notifications/delivery-failed",
        );
        return true;
      },
    );
    assert.equal(
      harnessState.registerCalls,
      0,
      "the push provider must not be reached without channels",
    );
    assert.equal(harnessState.serverRegisteredTokens.length, 0);

    // Once the device can create them again, registration proceeds normally.
    harnessState.channelCreationError = null;
    const token = await notifications.registerDevice({
      uid: UID,
      phone: PHONE,
    });
    assert.ok(token, "the retry must register once the channels exist");
    assert.ok(harnessState.createdChannels > 0);
  },
);

scenario("ios never creates android channels", async () => {
  resetHarnessCompletely();
  harnessState.platform = "ios";
  const { notifications } = loadNotificationModule();

  await notifications.initialize({ uid: UID, phone: PHONE });
  await notifications.createChannels();
  await flushMicrotasks();

  assert.equal(
    harnessState.createdChannels,
    0,
    "channels are an Android concept; iOS must be untouched",
  );
  const token = await notifications.registerDevice({ uid: UID, phone: PHONE });
  assert.ok(token, "iOS registration must be unaffected");
  assert.equal(token.platform, "ios");
});

scenario(
  "a revoked permission does not lose already stored notifications",
  async () => {
    resetHarnessCompletely();
    const first = await startAndroidSession();
    await emitForegroundPush(pushPayload());

    harnessState.permission = "blocked";
    const diagnostics = await first.notifications.getDiagnostics({ uid: UID });

    assert.equal(diagnostics.permission.state, "blocked");
    assert.equal((await first.notifications.list({ uid: UID })).length, 1);
  },
);

scenario("web without push support degrades safely", async () => {
  resetHarnessCompletely();
  harnessState.platform = "web";
  harnessState.isNative = false;
  const { notifications } = loadNotificationModule();

  const diagnostics = await notifications.getDiagnostics({ uid: UID });
  assert.equal(diagnostics.platform, "web");
  assert.equal(diagnostics.nativePush, false);
  assert.equal(
    diagnostics.pushSupported,
    false,
    "no service worker here, so no Web Push",
  );

  // Nothing throws; the module simply does nothing it cannot do.
  await notifications.initialize({ uid: UID, phone: PHONE });
  await notifications.importDelivered();
  await notifications.createChannels();
  assert.equal(harnessState.createdChannels, 0);
});

scenario("an unavailable inbox plugin does not break startup", async () => {
  resetHarnessCompletely();
  harnessState.inboxUnavailable = true;
  const { notifications } = await startAndroidSession();

  assert.deepEqual(await notifications.list({ uid: UID }), []);
  await emitForegroundPush(pushPayload());
  assert.equal(
    (await notifications.list({ uid: UID })).length,
    1,
    "a missing inbox plugin must not stop live delivery",
  );
});

scenario(
  "a failed registration surfaces a typed error, not the provider's text",
  async () => {
    resetHarnessCompletely();
    harnessState.registrationError = new Error(
      "FCM rejected Bearer ya29.SECRETSECRETSECRETSECRET",
    );
    const { notifications } = loadNotificationModule();

    await assert.rejects(
      () => notifications.registerDevice({ uid: UID, phone: PHONE }),
      (error: unknown) => {
        const message = (error as Error).message;
        assert.ok(
          !message.includes("SECRET"),
          `provider text leaked: ${message}`,
        );
        assert.equal(
          (error as { code?: string }).code,
          "notifications/delivery-failed",
        );
        return true;
      },
    );
  },
);

scenario(
  "a token refresh re-registers without duplicating the device",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    await notifications.registerDevice({ uid: UID, phone: PHONE });
    harnessState.registrationToken =
      "fcm-token-bbbbbbbbbbbbbbbbbbbbbbbb:APA91bNEWNEWNEWNEWNEWNEW";
    await notifications.registerDevice({ uid: UID, phone: PHONE });

    const devices = await notifications.listDevices({ uid: UID });
    assert.equal(
      devices.length,
      1,
      "a token refresh must replace the device row, not add one",
    );
    assert.ok(devices[0].token.includes("NEW"));
  },
);

scenario(
  "local token storage keeps one token per user and platform",
  async () => {
    resetHarnessCompletely();
    const { repository } = loadNotificationModule();
    const now = new Date().toISOString();

    await repository.saveDeviceToken({
      id: "android-old",
      uid: UID,
      platform: "android",
      provider: "fcm",
      deviceId: "device-old",
      token: "fcm-token-old-aaaaaaaaaaaaaaaaaaaa",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    await repository.saveDeviceToken({
      id: "android-new",
      uid: UID,
      platform: "android",
      provider: "fcm",
      deviceId: "device-new",
      token: "fcm-token-new-bbbbbbbbbbbbbbbbbbbb",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
    await repository.saveDeviceToken({
      id: "web-current",
      uid: UID,
      platform: "web",
      provider: "web_push",
      deviceId: "browser-current",
      token: "web-token-cccccccccccccccccccccccc",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    const tokens = await repository.listDeviceTokens(UID);
    assert.equal(
      tokens.filter((token) => token.platform === "android").length,
      1,
    );
    assert.equal(
      tokens.find((token) => token.platform === "android")?.id,
      "android-new",
    );
    assert.equal(tokens.filter((token) => token.platform === "web").length, 1);
  },
);

scenario("signing out unregisters the device and clears the tray", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();
  await notifications.registerDevice({ uid: UID, phone: PHONE });

  await notifications.unregisterDevice({ uid: UID, phone: PHONE });

  assert.equal((await notifications.listDevices({ uid: UID })).length, 0);
  assert.equal(harnessState.unregisterCalls, 1);
  assert.equal(harnessState.removeAllDeliveredCalls, 1);
});

// ---------------------------------------------------------------------------
// Extensions and the retry queue
// ---------------------------------------------------------------------------

scenario(
  "an extension reconciles, and a throwing extension cannot break the centre",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();
    await emitForegroundPush(pushPayload());

    let reconciled = 0;
    notifications.registerCenterExtension({
      id: "counting",
      reconcile: () => {
        reconciled += 1;
        return false;
      },
    });
    notifications.registerCenterExtension({
      id: "throwing",
      reconcile: () => {
        throw new Error("extension exploded");
      },
    });

    const snapshot = await notifications.synchronizeNotificationCenter({
      uid: UID,
    });
    assert.equal(
      snapshot.notifications.length,
      1,
      "a throwing extension broke the centre",
    );
    assert.equal(reconciled, 1);
  },
);

scenario("a queued retry replays once and leaves the queue clean", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();

  await notifications.enqueueRetry({
    uid: UID,
    kind: "chat_receipt",
    id: "receipt-1",
    payload: { targetMessageId: "msg_1" },
  });

  let replays = 0;
  notifications.registerCenterExtension({
    id: "replayer",
    replayQueuedOperation: (operation) => {
      if (operation.kind !== "chat_receipt") return false;
      replays += 1;
      return true;
    },
  });

  await notifications.synchronizeNotificationCenter({ uid: UID });
  await notifications.synchronizeNotificationCenter({ uid: UID });

  assert.equal(replays, 1, "a settled retry was replayed twice");
  assert.equal(
    (await notifications.getDiagnostics({ uid: UID })).pendingRetryCount,
    0,
  );
});

scenario("a failing retry stays queued and is not lost", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();
  await notifications.enqueueRetry({
    uid: UID,
    kind: "chat_receipt",
    id: "receipt-2",
    payload: {},
  });

  notifications.registerCenterExtension({
    id: "failing",
    replayQueuedOperation: () => {
      throw new Error("network down");
    },
  });

  await notifications.synchronizeNotificationCenter({ uid: UID });

  assert.equal(
    (await notifications.getDiagnostics({ uid: UID })).pendingRetryCount,
    1,
    "a failed replay must stay queued for the next attempt",
  );
});

scenario(
  "an unclaimed retry is dropped rather than queued forever",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();
    await notifications.enqueueRetry({
      uid: UID,
      kind: "settings",
      id: "orphan",
      payload: {},
    });

    notifications.registerCenterExtension({
      id: "claims-nothing",
      replayQueuedOperation: () => false,
    });
    await notifications.synchronizeNotificationCenter({ uid: UID });

    assert.equal(
      (await notifications.getDiagnostics({ uid: UID })).pendingRetryCount,
      0,
    );
  },
);

// ---------------------------------------------------------------------------
// Secrets
// ---------------------------------------------------------------------------

scenario("diagnostics carry counts, never credentials", async () => {
  resetHarnessCompletely();
  const { notifications } = await startAndroidSession();
  await notifications.registerDevice({ uid: UID, phone: PHONE });

  const diagnostics = await notifications.getDiagnostics({ uid: UID });
  const serialized = JSON.stringify(diagnostics);

  assert.equal(diagnostics.deviceTokenCount, 1);
  assert.ok(
    !serialized.includes(harnessState.registrationToken),
    "the device token appeared in diagnostics",
  );
  assert.ok(
    !/APA91/.test(serialized),
    "an FCM token shape appeared in diagnostics",
  );
});

scenario(
  "a secret in metadata never reaches the notification centre",
  async () => {
    resetHarnessCompletely();
    const { notifications } = await startAndroidSession();

    await emitForegroundPush(
      pushPayload({
        data: {
          notificationId: "ntf_secret",
          dedupeKey: "secret",
          meta_sessionToken:
            "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.SIGNATUREVALUEHERE",
        },
      }),
    );

    const [stored] = await notifications.list({ uid: UID });
    const serialized = JSON.stringify(stored);
    assert.ok(
      !serialized.includes("SIGNATUREVALUEHERE"),
      "a signed token was stored in the notification centre",
    );
  },
);

scenario("a logged provider error is redacted", async () => {
  resetHarnessCompletely();
  harnessState.registrationError = new Error(
    'FCM said {"authorization":"Bearer ya29.LEAKEDLEAKEDLEAKED"}',
  );
  const { notifications } = loadNotificationModule();

  let registrationFailure: unknown;
  try {
    await notifications.registerDevice({ uid: UID, phone: PHONE });
  } catch (error) {
    registrationFailure = error;
  }
  assert.ok(
    registrationFailure instanceof Error,
    "registration unexpectedly succeeded",
  );
  await flushMicrotasks();

  const logged = JSON.stringify(harnessState.loggedLines);
  assert.ok(logged.length > 0, "the failure was not logged at all");
  assert.ok(
    !logged.includes("LEAKED"),
    `a credential reached a log line: ${logged}`,
  );
});

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Written with `process.stdout.write`, not `console`.
 *
 * The harness captures `console.*` so a test can assert that a secret never
 * reached a log line; routing this runner's own output through the same
 * functions would swallow the failure report.
 */
function report(line: string): void {
  process.stdout.write(`${line}\n`);
}

async function main(): Promise<void> {
  let failures = 0;
  for (const { name, run } of scenarios) {
    try {
      await run();
      report(`  ok   ${name}`);
    } catch (error) {
      failures += 1;
      report(`  FAIL ${name}`);
      report(
        `       ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (failures > 0) {
    throw new Error(
      `${failures} of ${scenarios.length} notification scenarios failed.`,
    );
  }
  report(
    `Notification integration flow: ${scenarios.length} scenarios passed.`,
  );
}

void main().catch((error) => {
  report(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
