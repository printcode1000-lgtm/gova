import assert from "node:assert/strict";

async function main() {
const { createSignedSessionToken, registerSessionSigningSecret } = await import(
  "@asol/auth-core/server"
);
registerSessionSigningSecret(() => "follow-session-test-secret-0123456789abcdef");

// The grant secret moved behind `@asol/notifications-core`'s server-config
// port, registered by `registerAppServerPorts()` from `src/instrumentation.ts`
// at server startup. This test drives the service directly, so it composes the
// port the same way — exactly as it already does for the session secret above.
// Without it every grant is dropped and the follow flow reports
// `notificationGrantNotIssued` on a machine where the secret is present.
const { registerNotificationsCorePorts } = await import(
  "@/features/notifications"
);
registerNotificationsCorePorts();

const { FollowService } = await import("../services/follow-service.server");

const repository = {
  async listFollowerUids() {
    return {
      targetType: "store" as const,
      targetId: "seller-1",
      followerUids: ["buyer-1", "buyer-2", "buyer-1", ""],
    };
  },
};

const service = new FollowService(repository as never);
const token = createSignedSessionToken("seller-1", "+201000000000");
const result = await service.notifyFollowers(
  {
    identity: { uid: "seller-1", phone: "+201000000000" },
    targetType: "store",
    targetId: "seller-1",
    targetOwnerUid: "seller-1",
    title: "New offer",
    body: "Open the store to see the details.",
    requestId: "request-123456",
  },
  token,
);

assert.equal(result.requested, 2);
assert.equal(result.results.every((item) => item.status === "granted"), true);
assert.equal(result.notificationGrants?.length, 1);
assert.equal(typeof result.notificationGrants?.[0], "string");

await assert.rejects(
  () =>
    service.notifyFollowers(
      {
        identity: { uid: "seller-1", phone: "+201000000000" },
        targetType: "store",
        targetId: "another-seller",
        targetOwnerUid: "another-seller",
        title: "Invalid audience",
        body: "This must not be authorised.",
        requestId: "request-654321",
      },
      token,
    ),
  /forbidden/,
);

console.log("Follower notification authorization and grant tests passed.");
}

void main();
