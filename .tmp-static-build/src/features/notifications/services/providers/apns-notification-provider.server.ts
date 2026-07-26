import "server-only";

import { sign } from "node:crypto";
import { connect } from "node:http2";
import { getApnsServerConfig } from "@/core/config/server-env";
import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from "./notification-provider.interface";
import type { RegisteredNotificationToken } from "../../domain/entities";

interface ApnsResult {
  success: boolean;
  invalid: boolean;
}

const MAX_PARALLEL_SENDS = 25;

let cachedJwt: { value: string; createdAt: number; keyId: string; teamId: string } | null = null;

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function authorizationToken(config: NonNullable<ReturnType<typeof getApnsServerConfig>>): string {
  const now = Math.floor(Date.now() / 1000);
  if (
    cachedJwt &&
    cachedJwt.keyId === config.keyId &&
    cachedJwt.teamId === config.teamId &&
    now - cachedJwt.createdAt < 50 * 60
  ) {
    return cachedJwt.value;
  }
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const claims = base64Url(JSON.stringify({ iss: config.teamId, iat: now }));
  const unsigned = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: config.privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  const value = `${unsigned}.${signature}`;
  cachedJwt = { value, createdAt: now, keyId: config.keyId, teamId: config.teamId };
  return value;
}

function customData(input: NotificationProviderSendInput, token: RegisteredNotificationToken) {
  const data: Record<string, string> = {
    uid: token.uid,
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

async function sendOne(
  input: NotificationProviderSendInput,
  token: RegisteredNotificationToken,
  config: NonNullable<ReturnType<typeof getApnsServerConfig>>,
): Promise<ApnsResult> {
  const dataOnly = input.payload.metadata?.dataOnly === true;
  const host = config.production ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
  const client = connect(host);
  return new Promise((resolve) => {
    let status = 0;
    let settled = false;
    const finish = (result: ApnsResult) => {
      if (settled) return;
      settled = true;
      client.close();
      resolve(result);
    };
    client.on("error", () => finish({ success: false, invalid: false }));
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${encodeURIComponent(token.token)}`,
      authorization: `bearer ${authorizationToken(config)}`,
      "apns-topic": config.bundleId,
      "apns-push-type": dataOnly ? "background" : "alert",
      "apns-priority": dataOnly ? "5" : "10",
      "apns-expiration": String(
        Math.floor(Date.now() / 1000) + (input.payload.category === "chat" ? 604800 : 86400),
      ),
      "apns-collapse-id": input.payload.dedupeKey.slice(0, 64),
    });
    request.setEncoding("utf8");
    request.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    request.on("data", () => undefined);
    request.on("end", () => {
      finish({ success: status === 200, invalid: status === 400 || status === 410 });
    });
    request.on("error", () => {
      finish({ success: false, invalid: false });
    });
    request.setTimeout(15_000, () => {
      request.close();
      finish({ success: false, invalid: false });
    });
    const aps = dataOnly
      ? { "content-available": 1 }
      : {
          alert: { title: input.payload.title ?? "ASOL", body: input.payload.body ?? "" },
          sound: "default",
          badge: 1,
          "thread-id": input.payload.groupKey ?? input.payload.category,
        };
    request.end(JSON.stringify({ aps, ...customData(input, token) }));
  });
}

export class ApnsNotificationProvider implements NotificationProvider {
  readonly provider = "apns";

  async send(input: NotificationProviderSendInput): Promise<NotificationProviderSendResult> {
    const config = getApnsServerConfig();
    if (!config) {
      return {
        provider: this.provider,
        tokenCount: input.tokens.length,
        status: "failed",
        successCount: 0,
        failureCount: input.tokens.length,
        message: "apnsNotConfigured",
      };
    }
    const results: ApnsResult[] = [];
    for (let offset = 0; offset < input.tokens.length; offset += MAX_PARALLEL_SENDS) {
      results.push(
        ...(await Promise.all(
          input.tokens.slice(offset, offset + MAX_PARALLEL_SENDS).map((token) => sendOne(input, token, config)),
        )),
      );
    }
    const successCount = results.filter((result) => result.success).length;
    const failureCount = results.length - successCount;
    return {
      provider: this.provider,
      tokenCount: input.tokens.length,
      status: successCount === input.tokens.length ? "sent" : successCount > 0 ? "partial" : "failed",
      successCount,
      failureCount,
      invalidTokenIds: input.tokens.filter((_, index) => results[index]?.invalid).map((token) => token.id),
      message: failureCount > 0 ? `${failureCount} APNs deliveries failed.` : undefined,
    };
  }
}
