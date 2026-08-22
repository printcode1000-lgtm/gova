import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from "./notification-provider.interface";
import type { RegisteredNotificationToken } from "../../domain/entities";
import {
  BRANDING_ANDROID_NOTIFICATION_COLOR,
  BRANDING_ANDROID_NOTIFICATION_SMALL_ICON,
} from "@asol/branding-core";
import {
  appleSoundFile,
  fcmSoundResource,
  resolveAndroidChannelId,
} from "../../domain/notification-sound";
import type {
  FcmApnsConfig,
  FcmHttpV1Client,
  FcmHttpV1Message,
} from "./fcm-http-v1.server";

const MAX_PARALLEL_SENDS = 25;

function channelId(input: NotificationProviderSendInput): string {
  return resolveAndroidChannelId({
    category: input.payload.category,
    priority: input.payload.priority,
    sound: input.payload.sound,
    source: input.payload.metadata?.source,
  });
}

function cleanData(input: NotificationProviderSendInput): Record<string, string> {
  const data: Record<string, string> = {
    notificationId: input.payload.notificationId,
    dedupeKey: input.payload.dedupeKey,
    title: input.payload.title ?? "ASOL",
    body: input.payload.body ?? "",
    category: input.payload.category,
    priority: input.payload.priority,
    sound: input.payload.sound,
    createdAt: new Date().toISOString(),
    // The channel, on the wire.
    //
    // Android no longer receives an auto-displayed `notification` block, so the
    // channel is not something FCM applies for us any more — the app's own
    // service posts the notification. It resolves the channel with the same
    // rule this uses, but sending the answer as well makes the contract
    // explicit and inspectable instead of two implementations that are merely
    // believed to agree.
    androidChannelId: channelId(input),
  };
  if (input.payload.templateId) data.templateId = input.payload.templateId;
  if (input.payload.route?.href) data.routeHref = input.payload.route.href;
  if (input.payload.route?.label) data.routeLabel = input.payload.route.label;
  if (input.payload.groupKey) data.groupKey = input.payload.groupKey;
  for (const [key, value] of Object.entries(input.payload.metadata ?? {})) {
    if (value !== null && value !== undefined) data[`meta_${key}`] = String(value);
  }
  return data;
}

function isHighPriority(input: NotificationProviderSendInput): boolean {
  return (
    input.payload.priority === "high" || input.payload.priority === "critical"
  );
}

function isSilent(input: NotificationProviderSendInput): boolean {
  return fcmSoundResource(input.payload.sound) === undefined;
}

/**
 * Apple delivery options.
 *
 * FCM ignores the `android` block for Apple tokens, so iOS sound, badge, and
 * priority must be expressed here or they are silently dropped.
 */
function buildApnsConfig(
  input: NotificationProviderSendInput,
  dataOnly: boolean,
): FcmApnsConfig {
  if (dataOnly) {
    return {
      headers: {
        "apns-push-type": "background",
        // A background push must be priority 5; APNs rejects 10.
        "apns-priority": "5",
      },
      payload: { aps: { "content-available": 1 } },
    };
  }

  return {
    headers: {
      "apns-push-type": "alert",
      "apns-priority": isHighPriority(input) ? "10" : "5",
      "apns-collapse-id": input.payload.dedupeKey.slice(0, 64),
      "apns-expiration": String(
        Math.floor(Date.now() / 1000) +
          (input.payload.category === "chat" ? 604_800 : 86_400),
      ),
    },
    payload: {
      aps: {
        alert: {
          title: input.payload.title ?? "ASOL",
          body: input.payload.body ?? "",
        },
        // iOS expects the file name with its extension. Omitted for a silent
        // notification: on Apple, no `sound` key *is* the silent banner.
        ...(appleSoundFile(input.payload.sound)
          ? { sound: appleSoundFile(input.payload.sound) }
          : {}),
        "thread-id": input.payload.groupKey || input.payload.category,
        "interruption-level":
          input.payload.priority === "critical"
            ? "time-sensitive"
            : isSilent(input)
              ? "passive"
              : "active",
      },
    },
  };
}

/**
 * Android delivery is data-only, deliberately.
 *
 * A message carrying a `notification` block is displayed by the Firebase SDK
 * itself whenever the app is backgrounded or dead, and the app's
 * `onMessageReceived` is never called. That is why notifications were being
 * lost: the only code that could have recorded them did not run, and the
 * evidence — a tray entry — is already gone once the user taps it.
 *
 * Removing the `notification` blocks makes Firebase hand every Android message
 * to `AsolPushMessagingService`, which persists the complete payload to the
 * device-local private inbox (encrypted when AndroidKeyStore is available)
 * *before* posting the notification on the
 * existing ASOL channel with the existing custom sound. Nothing about the
 * notification is stored anywhere off the device by this change; the payload
 * still travels as the same `data` map it always did.
 *
 * `channelId` and `fcmSoundResource` are still computed for Android, because
 * they are the contract the native side reproduces — the same domain function
 * answers "which channel" on both sides, and the sound contract test fails the
 * build if they drift.
 */
function isAndroidToken(token: RegisteredNotificationToken): boolean {
  return token.platform === "android";
}

function buildMessage(
  input: NotificationProviderSendInput,
  token: RegisteredNotificationToken,
): FcmHttpV1Message {
  const sound = fcmSoundResource(input.payload.sound);
  const dataOnly = input.payload.metadata?.dataOnly === true;
  const android = isAndroidToken(token);
  return {
    message: {
      token: token.token,
      // Apple keeps its alert payload exactly as before. Android gets none, so
      // the application's own service is always the one that receives it.
      notification: dataOnly || android ? undefined : {
        title: input.payload.title ?? "ASOL",
        body: input.payload.body ?? "",
      },
      data: { ...cleanData(input), uid: token.uid },
      android: {
        // A data message has to wake a possibly-dozing app before it can be
        // shown, and only a high-priority message does. Silent internal signals
        // keep normal priority: they have nothing to show and nothing to wake
        // the device for.
        priority: isHighPriority(input) || (android && !dataOnly) ? "HIGH" : "NORMAL",
        ttl: input.payload.category === "chat" ? "604800s" : "86400s",
        restricted_package_name: "hgh.asol.app",
        collapse_key: input.payload.dedupeKey.slice(0, 64),
        notification: dataOnly || android ? undefined : {
          channel_id: channelId(input),
          icon: BRANDING_ANDROID_NOTIFICATION_SMALL_ICON,
          color: BRANDING_ANDROID_NOTIFICATION_COLOR,
          // Only consulted below Android 8; from 8 upward the channel owns the
          // sound. Omitted when silent so old devices stay silent too.
          ...(sound ? { sound } : {}),
          tag: input.payload.dedupeKey.slice(0, 64),
          visibility: "PRIVATE",
        },
      },
      apns: buildApnsConfig(input, dataOnly),
    },
  };
}

function isInvalidToken(code?: string): boolean {
  return code === "UNREGISTERED" || code === "INVALID_ARGUMENT";
}

export class FcmNotificationProvider implements NotificationProvider {
  readonly provider = "fcm";

  constructor(
    private readonly clientFactory?: () => FcmHttpV1Client | Promise<FcmHttpV1Client>,
  ) {}

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    if (input.tokens.length === 0) {
      return { provider: this.provider, tokenCount: 0, status: "failed", message: "noTokens" };
    }

    let client: FcmHttpV1Client;
    try {
      client = this.clientFactory
        ? await this.clientFactory()
        : await (await import("./fcm-http-v1.server")).getFcmHttpV1Client();
    } catch {
      // Firebase Admin is the single push credential for Android and Apple.
      // Tokens are kept: this is a server misconfiguration, not a dead device.
      return {
        provider: this.provider,
        tokenCount: input.tokens.length,
        status: "failed",
        successCount: 0,
        failureCount: input.tokens.length,
        message:
          "firebaseAdminNotConfigured: set FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 " +
          "so Firebase Cloud Messaging can deliver to Android and Apple devices.",
      };
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokenIds: string[] = [];
    for (let offset = 0; offset < input.tokens.length; offset += MAX_PARALLEL_SENDS) {
      const batch = input.tokens.slice(offset, offset + MAX_PARALLEL_SENDS);
      const results = await Promise.all(
        batch.map(async (registeredToken) => {
          try {
            return await client.send(buildMessage(input, registeredToken));
          } catch {
            return { success: false, errorCode: "TRANSPORT_ERROR" } as const;
          }
        }),
      );
      results.forEach((result, index) => {
        if (result.success) {
          successCount += 1;
        } else {
          failureCount += 1;
          if (isInvalidToken(result.errorCode)) {
            const id = batch[index]?.id;
            if (id) invalidTokenIds.push(id);
          }
        }
      });
    }

    const status =
      successCount === input.tokens.length ? "sent" : successCount > 0 ? "partial" : "failed";
    return {
      provider: this.provider,
      tokenCount: input.tokens.length,
      status,
      successCount,
      failureCount,
      invalidTokenIds,
      message: failureCount > 0 ? `${failureCount} FCM deliveries failed.` : undefined,
    };
  }
}
