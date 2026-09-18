/**
 * Behaviour test: the native sender's token resolution.
 *
 * `recipient-tokens` hands a device the push tokens it will send to, so it is a
 * delivery credential. It had no test at all. This runs the real service with
 * in-memory repositories and real signed grants, and pins every refusal and
 * every filter the native path depends on.
 */

import assert from "node:assert/strict";

import { createNotificationGrant } from "@asol/notifications-core/server";

import { registerNotificationsCorePorts } from "../ports/notifications-core-ports";
import { NotificationRecipientTokensService } from "../server/services/notification-recipient-tokens.service.server";

registerNotificationsCorePorts();

type Token = {
  id: string;
  uid: string;
  platform: "android" | "ios" | "web";
  provider: string;
  token: string;
  deviceId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

function token(uid: string, provider: string, platform: Token["platform"]): Token {
  const now = new Date().toISOString();
  return {
    id: `${uid}_${provider}`,
    uid,
    platform,
    provider,
    token: `${provider}-token-${uid}`,
    deviceId: `${platform}:${uid}`,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

const users: Record<string, string> = {
  usr_actor: "+201000000001",
  usr_friend: "+201000000002",
  usr_muted: "+201000000003",
  usr_empty: "+201000000004",
};
const tokens: Record<string, Token[]> = {
  usr_actor: [token("usr_actor", "fcm", "android")],
  // A browser and a raw APNs registration are unreachable from the device.
  usr_friend: [
    token("usr_friend", "fcm", "android"),
    token("usr_friend", "web_push", "web"),
    token("usr_friend", "apns", "ios"),
  ],
  usr_muted: [token("usr_muted", "fcm", "android")],
  usr_empty: [token("usr_empty", "web_push", "web")],
};

const service = new NotificationRecipientTokensService(
  { execute: async (uid: string) => (users[uid] ? { uid, phone: users[uid]! } : null) } as never,
  { byUids: async (uids: string[]) => Object.fromEntries(uids.map((uid) => [uid, tokens[uid] ?? []])) } as never,
  { pushEnabledUids: async (uids: string[]) => uids.filter((uid) => uid !== "usr_muted") } as never,
  { execute: async () => undefined } as never,
);

const grant = (uids: string[], actorUid?: string) =>
  createNotificationGrant(
    { uids, templateId: "order.created", dedupeKey: `probe:${uids.join(",")}` },
    actorUid ? { actorUid } : {},
  );

async function run(): Promise<void> {
  const caller = { uid: "usr_actor", phone: users.usr_actor! };

  // ── a verified grant resolves to FCM tokens only, per recipient ──────────
  const result = await service.resolve({
    ...caller,
    grants: [grant(["usr_friend", "usr_muted", "usr_empty", "usr_unknown"], "usr_actor")],
  });
  assert.equal(result.grants.length, 1);
  const byUid = new Map(result.grants[0]!.recipients.map((r) => [r.uid, r]));
  assert.equal(byUid.get("usr_friend")?.status, "ready");
  assert.deepEqual(
    byUid.get("usr_friend")?.tokens.map((t) => t.provider),
    ["fcm"],
    "Web Push and raw APNs registrations must never reach the native sender.",
  );
  assert.equal(byUid.get("usr_muted")?.status, "muted", "the account mute switch is honoured");
  assert.deepEqual(byUid.get("usr_muted")?.tokens, []);
  assert.equal(byUid.get("usr_empty")?.status, "no_tokens");
  assert.equal(byUid.get("usr_unknown")?.status, "no_tokens");

  // ── the caller must be a real user with that phone ───────────────────────
  await assert.rejects(
    service.resolve({ uid: "usr_actor", phone: "+209999999999", grants: [grant(["usr_friend"], "usr_actor")] }),
    /forbidden/,
    "a caller whose phone does not match is refused",
  );
  await assert.rejects(
    service.resolve({ uid: "usr_ghost", phone: "+201000000009", grants: [] }),
    /forbidden/,
    "an unknown caller is refused",
  );

  // ── a grant issued to someone else cannot be spent by this caller ─────────
  await assert.rejects(
    service.resolve({ ...caller, grants: [grant(["usr_friend"], "usr_friend")] }),
    /forbidden/,
    "a grant whose actor is another user must be refused",
  );

  // ── a forged grant is refused ─────────────────────────────────────────────
  const [encoded, signature] = grant(["usr_friend"], "usr_actor").split(".");
  const payload = JSON.parse(Buffer.from(encoded!, "base64url").toString("utf8"));
  payload.send.uids.push("usr_victim");
  const forged = `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
  await assert.rejects(
    service.resolve({ ...caller, grants: [forged] }),
    /notificationGrantInvalid/,
    "a grant with an added recipient must be rejected",
  );

  // ── junk entries are ignored, and the batch is bounded ────────────────────
  const bounded = await service.resolve({
    ...caller,
    grants: ["", ...Array.from({ length: 150 }, () => grant(["usr_friend"], "usr_actor"))] as string[],
  });
  assert.ok(bounded.grants.length <= 100, "at most MAX_GRANTS_PER_REQUEST grants are resolved");
  assert.ok(bounded.grants.length > 0);

  console.log("Notification recipient tokens service tests passed.");
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
