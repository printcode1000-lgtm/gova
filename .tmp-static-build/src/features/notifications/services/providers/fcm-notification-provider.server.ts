import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from "./notification-provider.interface";
import type { RegisteredNotificationToken } from "../../domain/entities";
import type {
  FcmHttpV1Client,
  FcmHttpV1Message,
} from "./fcm-http-v1.server";

const MAX_PARALLEL_SENDS = 25;

function channelId(input: NotificationProviderSendInput): string {
  if (input.payload.priority === "critical") return "asol_urgent_v2";
  if (input.payload.category === "orders") return "asol_orders_v2";
  if (input.payload.category === "chat") return "asol_chat_v2";
  return "asol_general_v2";
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

function buildMessage(
  input: NotificationProviderSendInput,
  token: RegisteredNotificationToken,
): FcmHttpV1Message {
  const sound = "custom_notification";
  const dataOnly = input.payload.metadata?.dataOnly === true;
  return {
    message: {
      token: token.token,
      notification: dataOnly ? undefined : {
        title: input.payload.title ?? "ASOL",
        body: input.payload.body ?? "",
      },
      data: { ...cleanData(input), uid: token.uid },
      android: {
        priority:
          input.payload.priority === "high" || input.payload.priority === "critical"
            ? "HIGH"
            : "NORMAL",
        ttl: input.payload.category === "chat" ? "604800s" : "86400s",
        restricted_package_name: "hgh.asol.app",
        collapse_key: input.payload.dedupeKey.slice(0, 64),
        notification: dataOnly ? undefined : {
          channel_id: channelId(input),
          icon: "ic_stat_asol_notification",
          color: "#006C4C",
          sound,
          tag: input.payload.dedupeKey.slice(0, 64),
          visibility: "PRIVATE",
        },
      },
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
      return {
        provider: this.provider,
        tokenCount: input.tokens.length,
        status: "failed",
        successCount: 0,
        failureCount: input.tokens.length,
        message: "fcmConfigurationFailed",
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
