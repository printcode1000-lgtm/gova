import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DuplicateImageUploadError,
  ImageUploadCancelledError,
  ImageUploadQueue,
} from "../services/image-upload-queue";
import {
  buildImageUploadDraftKey,
  imageUploadDraftToFile,
  type ImageUploadDraft,
} from "../services/image-upload-draft-service";
import { StorageProfiles } from "@asol/storage-core";

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
  const firstStates: string[] = [];
  const secondStates: string[] = [];

  const first = queue.enqueue({
    deduplicationKey: "first",
    onStateChange: (state) =>
      firstStates.push(`${state.status}:${state.position}`),
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
    onStateChange: (state) =>
      secondStates.push(`${state.status}:${state.position}`),
    run: async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      order.push("second:start");
      active -= 1;
      return "second";
    },
  });

  await Promise.resolve();
  assert.equal(queue.has("first"), true);
  assert.equal(queue.has("second"), true);
  assert.deepEqual(queue.getSnapshot(), { active: 1, queued: 1 });
  firstGate.resolve();
  assert.equal(await first.promise, "first");
  assert.equal(await second.promise, "second");
  assert.equal(queue.has("first"), false);
  assert.equal(queue.has("second"), false);
  assert.equal(maximumActive, 1);
  assert.deepEqual(order, ["first:start", "first:end", "second:start"]);
  assert.deepEqual(firstStates, ["queued:1", "running:0"]);
  assert.deepEqual(secondStates, ["queued:1", "running:0"]);
}

function testDraftIdentityAndFileRestoration() {
  const base = {
    ownerId: "user-1",
    pageKey: "/profile",
    managerId: "profile-avatar",
    slotIndex: 0,
    storageProfileId: StorageProfiles.Avatar,
  };
  const firstKey = buildImageUploadDraftKey(base);
  assert.notEqual(
    firstKey,
    buildImageUploadDraftKey({ ...base, ownerId: "user-2" }),
  );
  assert.notEqual(
    firstKey,
    buildImageUploadDraftKey({ ...base, slotIndex: 1 }),
  );

  const blob = new Blob([new Uint8Array([1, 2, 3])], {
    type: "image/png",
  });
  const draft: ImageUploadDraft = {
    key: firstKey,
    draftId: "draft-1",
    ...base,
    blob,
    fileName: "avatar.png",
    fileType: "image/png",
    fileSize: blob.size,
    lastModified: 123,
    status: "ready",
    queuePosition: 0,
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:00:00.000Z",
  };
  const file = imageUploadDraftToFile(draft);
  assert.equal(file.name, "avatar.png");
  assert.equal(file.type, "image/png");
  assert.equal(file.size, 3);
  assert.equal(file.lastModified, 123);
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
  testDraftIdentityAndFileRestoration();
  const root = process.cwd();
  const managerSource = readFileSync(
    path.join(
      root,
      "packages/storage-image-manager-core/src/components/StorageImageManager.tsx",
    ),
    "utf8",
  );
  const uiSource = readFileSync(
    path.join(
      root,
      "packages/storage-image-manager-core/src/components/storage-image-manager-ui.tsx",
    ),
    "utf8",
  );
  assert.match(managerSource, /uploadPending:\s*async/);
  assert.match(managerSource, /StorageImageSlotFrame/);
  assert.match(uiSource, /StorageImageSlotFrame[\s\S]*overflow-hidden/);
  assert.match(
    uiSource,
    /storageImageSlotSurfaceClasses\s*=\s*\n\s*"[^"]*h-full w-full[^"]*overflow-hidden/,
  );
  assert.doesNotMatch(
    uiSource,
    /storageImageSlotSurfaceClasses\s*=\s*\n\s*"[^"]*min-h-/,
    "slot height must follow the frame aspect ratio instead of forcing min-height overflow",
  );
  assert.match(managerSource, /aspectRatio=\{parsedConfig\.aspectRatio\}/);
  assert.match(
    uiSource,
    /border-primary\/20 bg-primary\/5 p-0\.5/,
    "every image slot uses the shared outer frame padding and chrome",
  );
  assert.match(uiSource, /storageImageEmptyStateClasses[\s\S]*overflow-hidden/);
  assert.doesNotMatch(
    managerSource,
    /DropdownMenuTrigger asChild>[\s\S]{0,200}<button[^>]+className="absolute inset-0/,
    "the entire empty image card must not open the source picker",
  );
  console.log("Image upload queue tests passed.");
}

void main();
