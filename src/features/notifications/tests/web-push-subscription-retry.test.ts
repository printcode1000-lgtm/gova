import assert from "node:assert/strict";

import {
  isTransientWebPushServiceError,
  subscribeWithWebPushRetry,
} from "../infrastructure/web-push/web-push-subscription-retry";

function pushAbort(): Error {
  return Object.assign(new Error("Registration failed - push service error"), {
    name: "AbortError",
  });
}

async function main() {
  {
    let attempts = 0;
    const sleeps: number[] = [];
    const result = await subscribeWithWebPushRetry({
      readExisting: async () => null,
      subscribe: async () => {
        attempts += 1;
        if (attempts < 3) throw pushAbort();
        return "subscription";
      },
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
      },
    });
    assert.equal(result, "subscription");
    assert.equal(attempts, 3);
    assert.deepEqual(sleeps, [500, 1_250]);
  }

  {
    let reads = 0;
    let attempts = 0;
    const result = await subscribeWithWebPushRetry({
      readExisting: async () => {
        reads += 1;
        return reads >= 2 ? "late-subscription" : null;
      },
      subscribe: async () => {
        attempts += 1;
        throw pushAbort();
      },
      sleep: async () => undefined,
    });
    assert.equal(result, "late-subscription");
    assert.equal(attempts, 1);
  }

  {
    let attempts = 0;
    const fatal = new TypeError("bad key");
    await assert.rejects(
      subscribeWithWebPushRetry({
        readExisting: async () => null,
        subscribe: async () => {
          attempts += 1;
          throw fatal;
        },
        sleep: async () => undefined,
      }),
      (error) => error === fatal,
    );
    assert.equal(attempts, 1);
  }

  {
    let attempts = 0;
    const finalError = pushAbort();
    await assert.rejects(
      subscribeWithWebPushRetry({
        readExisting: async () => null,
        subscribe: async () => {
          attempts += 1;
          throw finalError;
        },
        sleep: async () => undefined,
      }),
      (error) => error === finalError,
    );
    assert.equal(attempts, 3);
    assert.equal(isTransientWebPushServiceError(finalError), true);
    assert.equal(
      isTransientWebPushServiceError({
        name: "AbortError",
        message: "Registration failed - push service error",
      }),
      true,
    );
    assert.equal(
      isTransientWebPushServiceError(
        Object.assign(new Error("other"), { name: "AbortError" }),
      ),
      false,
    );
  }

  console.log("Web push subscription retry tests passed.");
}

void main();
