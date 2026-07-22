import assert from "node:assert/strict";
import {
  DuplicateImageUploadError,
  ImageUploadCancelledError,
  ImageUploadQueue,
} from "../services/image-upload-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function testSequentialUploads() {
  const queue = new ImageUploadQueue();
  const firstGate = deferred<void>();
  let active = 0;
  let maximumActive = 0;
  const order: string[] = [];

  const first = queue.enqueue({
    deduplicationKey: "first",
    run: async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push("first:start");
      await firstGate.promise;
      order.push("first:end");
      active -= 1;
      return "first";
    },
  });
  const second = queue.enqueue({
    deduplicationKey: "second",
    run: async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push("second:start");
      active -= 1;
      return "second";
    },
  });

  await Promise.resolve();
  assert.deepEqual(queue.getSnapshot(), { active: 1, queued: 1 });
  firstGate.resolve();
  assert.equal(await first.promise, "first");
  assert.equal(await second.promise, "second");
  assert.equal(maximumActive, 1);
  assert.deepEqual(order, ["first:start", "first:end", "second:start"]);
}

async function testFailureDoesNotStopQueue() {
  const queue = new ImageUploadQueue();
  const failed = queue.enqueue({
    deduplicationKey: "failed",
    run: async () => {
      throw new Error("expected failure");
    },
  });
  const next = queue.enqueue({
    deduplicationKey: "next",
    run: async () => "continued",
  });

  await assert.rejects(failed.promise, /expected failure/);
  assert.equal(await next.promise, "continued");
}

async function testQueuedCancellationAndDeduplication() {
  const queue = new ImageUploadQueue();
  const gate = deferred<void>();
  const active = queue.enqueue({
    deduplicationKey: "active",
    run: async () => gate.promise,
  });
  const queued = queue.enqueue({
    deduplicationKey: "queued",
    run: async () => "must not run",
  });
  const duplicate = queue.enqueue({
    deduplicationKey: "queued",
    run: async () => "duplicate",
  });

  assert.equal(queued.cancel(), true);
  await assert.rejects(queued.promise, ImageUploadCancelledError);
  await assert.rejects(duplicate.promise, DuplicateImageUploadError);
  gate.resolve();
  await active.promise;
  assert.deepEqual(queue.getSnapshot(), { active: 0, queued: 0 });
}

async function main() {
  await testSequentialUploads();
  await testFailureDoesNotStopQueue();
  await testQueuedCancellationAndDeduplication();
  console.log("Image upload queue tests passed.");
}

void main();
