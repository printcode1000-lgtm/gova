import assert from "node:assert/strict";
import { NotificationSendService } from "@asol/notifications-core/server";
import { NotificationProviderRegistry } from "@asol/notifications-core/server";
import type {
  NotificationProvider,
  NotificationProviderSendInput,
  NotificationProviderSendResult,
} from "@asol/notifications-core/server";
import type { RegisteredNotificationToken } from "@asol/notifications-core";
import { NotificationPlatforms } from "@asol/notifications-core";
import { moneyVariablesByLocale } from "../shared/notification-money";
import type { ListNotificationTokensQuery } from "@/modules/data-access/domains/notifications/operations/queries/list-notification-tokens.query";
import type { DeleteNotificationTokenCommand } from "@/modules/data-access/domains/notifications/operations/commands/delete-notification-token.command";
import type { GetNotificationPushPreferenceQuery } from "@/modules/data-access/domains/notifications/operations/queries/get-notification-push-preference.query";

function token(
  id: string,
  uid: string,
  locale: "ar" | "en" | undefined,
): RegisteredNotificationToken {
  return {
    id,
    uid,
    platform: NotificationPlatforms.Web,
    provider: "web_push",
    deviceId: `device_${id}`,
    token: `token_${id}`,
    locale,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

class CapturingProvider implements NotificationProvider {
  readonly provider = "web_push";
  readonly calls: NotificationProviderSendInput[] = [];

  constructor(private readonly invalidTokenIds: string[] = []) {}

  async send(
    input: NotificationProviderSendInput,
  ): Promise<NotificationProviderSendResult> {
    this.calls.push(input);
    return {
      provider: this.provider,
      tokenCount: input.tokens.length,
      status: "queued",
      invalidTokenIds: input.tokens
        .filter((item) => this.invalidTokenIds.includes(item.id))
        .map((item) => item.id),
    };
  }
}

function buildService(
  provider: CapturingProvider,
  tokensByUid: Record<string, RegisteredNotificationToken[]>,
  deleted: string[],
  mutedUids: readonly string[] = [],
) {
  const listTokens = {
    byUids: async () => tokensByUid,
  } as unknown as ListNotificationTokensQuery;
  const deleteToken = {
    execute: async (input: { tokenId: string }) => {
      deleted.push(input.tokenId);
    },
  } as unknown as DeleteNotificationTokenCommand;
  const muted = new Set(mutedUids);
  const pushPreference = {
    pushEnabledUids: async (uids: string[]) => uids.filter((uid) => !muted.has(uid)),
  } as unknown as GetNotificationPushPreferenceQuery;
  return new NotificationSendService(
    listTokens,
    new NotificationProviderRegistry([provider]),
    deleteToken,
    undefined,
    pushPreference,
  );
}

async function main() {
  // One send, two languages: each device group gets text in its own language.
  const provider = new CapturingProvider();
  const deleted: string[] = [];
  const service = buildService(
    provider,
    {
      usr_ar: [token("ntok_ar", "usr_ar", "ar")],
      usr_en: [token("ntok_en", "usr_en", "en")],
      usr_legacy: [token("ntok_legacy", "usr_legacy", undefined)],
    },
    deleted,
  );

  const result = await service.sendToUsersLocally({
    uids: ["usr_ar", "usr_en", "usr_legacy"],
    templateId: "shipping.quoteProposed",
    dedupeKey: "shipping-quote:q_1:pending_buyer",
    variables: { orderId: "ord_1" },
    variablesByLocale: moneyVariablesByLocale("amount", 25_000),
  });

  assert.equal(result.requested, 3);
  assert.equal(result.results.length, 3);

  const arabic = provider.calls.find((call) => call.payload.locale === "ar");
  const english = provider.calls.find((call) => call.payload.locale === "en");
  assert.ok(arabic, "Arabic devices must receive their own payload.");
  assert.ok(english, "English devices must receive their own payload.");

  assert.equal(arabic.payload.title, "💸 عرض شحن جديد");
  assert.equal(english.payload.title, "New shipping quote");
  assert.match(arabic.payload.body ?? "", /راجع الطلب/);
  assert.match(english.payload.body ?? "", /Open the order/);
  assert.ok(
    !(english.payload.body ?? "").includes("{{amount}}"),
    "The amount variable must be interpolated.",
  );
  assert.equal(
    arabic.payload.route?.href,
    "/orders/details?orderId=ord_1&role=buyer",
    "The template deep link must interpolate the order id.",
  );

  // A device that never reported a language falls back to the Arabic default.
  // Grouping happens inside one recipient, so each user gets its own call.
  const arabicTokenIds = provider.calls
    .filter((call) => call.payload.locale === "ar")
    .flatMap((call) => call.tokens.map((item) => item.id))
    .sort();
  assert.deepEqual(arabicTokenIds, ["ntok_ar", "ntok_legacy"]);

  // The formatted amounts differ per locale, which is why they cannot live in
  // the template itself.
  const amounts = moneyVariablesByLocale("amount", 25_000);
  assert.notEqual(amounts.ar?.amount, amounts.en?.amount);

  // Tokens the transport rejects are removed in the same request.
  const rejecting = new CapturingProvider(["ntok_dead"]);
  const removed: string[] = [];
  const cleanupService = buildService(
    rejecting,
    { usr_dead: [token("ntok_dead", "usr_dead", "en")] },
    removed,
  );
  await cleanupService.sendToUsersLocally({
    uids: ["usr_dead"],
    title: "Announcement",
    body: "Body",
    dedupeKey: "broadcast:test",
  });
  assert.deepEqual(removed, ["ntok_dead"]);

  // A muted uid gets no provider call at all, even though it holds a live
  // token — the master switch is checked before tokens are even resolved.
  const mutedProvider = new CapturingProvider();
  const mutedService = buildService(
    mutedProvider,
    {
      usr_muted: [token("ntok_muted", "usr_muted", "en")],
      usr_active: [token("ntok_active", "usr_active", "en")],
    },
    [],
    ["usr_muted"],
  );
  const mutedResult = await mutedService.sendToUsersLocally({
    uids: ["usr_muted", "usr_active"],
    title: "Announcement",
    body: "Body",
    dedupeKey: "broadcast:mute-test",
  });
  assert.deepEqual(
    mutedResult.results.find((result) => result.uid === "usr_muted"),
    { uid: "usr_muted", tokenCount: 0, status: "muted" },
  );
  assert.equal(
    mutedResult.results.find((result) => result.uid === "usr_active")?.status,
    "queued",
  );
  assert.equal(
    mutedProvider.calls.flatMap((call) => call.tokens.map((item) => item.id)).includes("ntok_muted"),
    false,
    "A muted uid's token must never reach a provider.",
  );

  console.log("Notification locale routing tests passed.");
}

void main();
