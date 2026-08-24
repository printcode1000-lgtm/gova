import assert from "node:assert/strict";

import { NotificationBroadcastService } from "../services/notification-broadcast-service.server";
import { configureNotificationAdminAuthorization } from "../server/notification-admin-authorization";
import { verifyNotificationGrant } from "@asol/notifications-core/server";
import { registerNotificationsCorePorts } from "../notifications-core-ports";

registerNotificationsCorePorts();

const identity = {
  uid: "super-admin-test",
  phone: "+201000000000",
};
configureNotificationAdminAuthorization(
  (candidate) => candidate.uid === identity.uid && candidate.phone === identity.phone,
);

const service = new NotificationBroadcastService({
  execute: async () => [
    {
      uid: identity.uid,
      phoneMasked: "+20***0000",
      tokenCount: 1,
      platforms: ["android"],
      providers: ["fcm"],
    },
  ],
} as never);

async function main() {
  const result = await service.sendTest({
    identity,
    requestId: "orders-contract",
    scenarioId: "orders",
    title: "اختبار طلب",
    body: "اختبار النغمة المخصصة",
    routeHref: "/notifications",
  });

  assert.equal(result.requested, 1);
  assert.equal(result.results[0]?.uid, identity.uid);
  assert.equal(result.channelId, "asol_orders_v4");
  assert.equal(result.notificationGrants?.length, 1);

  const grant = verifyNotificationGrant(result.notificationGrants?.[0] ?? "");
  assert.deepEqual(grant.send.uids, [identity.uid]);
  assert.equal(grant.send.category, "orders");
  assert.equal(grant.send.priority, "high");
  assert.equal(grant.send.sound, "default");
  assert.equal(grant.send.metadata?.notificationTest, true);
  assert.equal(grant.send.metadata?.notificationTestScenario, "orders");

  await assert.rejects(
    service.sendTest({
      identity,
      scenarioId: "not-a-scenario" as "orders",
      title: "invalid",
      body: "invalid",
    }),
    /notificationTestScenarioInvalid/,
  );
  console.log("Notification test service tests passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
