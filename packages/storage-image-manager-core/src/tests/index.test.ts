import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
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
import { snapshotImageUploadDraftBlob } from "../services/image-upload-draft-file";
import {
  buildStorageImageCacheKey,
  isRemoteStorageImageUrl,
  resolveLocalFirstStorageImage,
  shouldRetryFailedLocalFirstImage,
} from "../services/local-first-image-cache";

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

async function testDraftBlobOwnsSelectedFileBytes() {
  const source = new File([new Uint8Array([1, 2, 3, 4])], "picker.png", {
    type: "image/png",
    lastModified: 123,
  });
  const blob = await snapshotImageUploadDraftBlob(source);

  Object.defineProperty(source, "arrayBuffer", {
    configurable: true,
    value: async () => {
      throw new DOMException("picker grant expired", "NotReadableError");
    },
  });

  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [1, 2, 3, 4]);
  assert.equal(blob.type, "image/png");
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

async function testRemoteImageFailureNeverReturnsCloudUrl() {
  const remote = "https://cdn.example.com/not-cached.webp";
  const result = await resolveLocalFirstStorageImage(remote);
  assert.equal(result.source, "fallback");
  assert.equal(
    result.fallbackUrl,
    undefined,
    "a remote miss/failure must never hand the original cloud URL back to a renderer",
  );
}

function productionSources(root: string): string[] {
  const output: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "tests" || entry.name === ".next") continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(?:ts|tsx|css)$/.test(entry.name) && !entry.name.includes(".test.")) output.push(full);
    }
  };
  visit(path.join(root, "src"));
  visit(path.join(root, "packages"));
  return output;
}

function testRemoteImageRenderingBypassIsClosed(root: string) {
  const nextImageImporters = productionSources(root)
    .filter((file) => /from\s+["']next\/image["']/.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(root, file).split(path.sep).join("/"))
    .sort();
  assert.deepEqual(nextImageImporters, [
    "packages/product-card-core/src/presentation/ProductCard.tsx",
    "packages/seller-card-core/src/presentation/SellerCard.tsx",
    "src/shared/brand/AppIcon.tsx",
    "src/shared/ui/local-first-image.tsx",
  ]);

  for (const relative of nextImageImporters) {
    if (relative === "src/shared/brand/AppIcon.tsx") continue;
    const source = readFileSync(path.join(root, relative), "utf8");
    assert.match(
      source,
      /LOCAL_FIRST_IMAGE_PLACEHOLDER|useLocalFirstStorageImageSource/,
      `${relative} renders images without the mandatory local-first resolver`,
    );
    assert.doesNotMatch(
      source,
      /cached(?:Image|Avatar)?\.src\s*\?\?\s*(?:card\.|sourceUrl)/,
      `${relative} can fall back from the local cache to a raw cloud URL`,
    );
  }

  const cacheSource = readFileSync(
    path.join(root, "packages/storage-image-manager-core/src/services/local-first-image-cache.ts"),
    "utf8",
  );
  assert.doesNotMatch(cacheSource, /source:\s*["']fallback["'][^}]*fallbackUrl:\s*sourceUrl/);

  const hookSource = readFileSync(
    path.join(root, "packages/storage-image-manager-core/src/hooks/use-local-first-storage-image-source.ts"),
    "utf8",
  );
  assert.doesNotMatch(hookSource, /fallbackUrl\s*\?\?\s*sourceUrl/);

  const directImg = productionSources(root)
    .filter((file) => /<img(?:\s|>)/.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(root, file).split(path.sep).join("/"));
  assert.deepEqual(
    directImg,
    ["packages/storage-image-manager-core/src/components/StorageImageManager.tsx"],
    "raw <img> is forbidden except the sealed manager's already-local blob/data preview",
  );
  const managerPreviewSource = readFileSync(path.join(root, directImg[0]!), "utf8");
  assert.match(managerPreviewSource, /<img[\s\S]{0,160}src=\{previewUrl\}/);
  assert.doesNotMatch(managerPreviewSource, /<img[\s\S]{0,160}src=\{(?:imageUrl|uploadedImage\?\.url)/);
}

function testLocalFirstImagePlaceholderEvents(root: string) {
  const source = readFileSync(
    path.join(root, "src/shared/ui/local-first-image.tsx"),
    "utf8",
  );
  assert.match(
    source,
    /resolvedSrc === LOCAL_FIRST_IMAGE_PLACEHOLDER/,
    "the local-first placeholder must not be reported as the loaded remote image",
  );
  assert.match(
    source,
    /onSourceUnavailable\?\.\(\)/,
    "terminal local-first resolution must notify image consumers",
  );
}

function testLocalFirstImageRenderRecoveryPolicy() {
  assert.equal(
    shouldRetryFailedLocalFirstImage({
      remote: true,
      isResolving: false,
      cacheSource: "asoldb",
      retryAttempt: 0,
    }),
    true,
  );
  assert.equal(
    shouldRetryFailedLocalFirstImage({
      remote: true,
      isResolving: false,
      cacheSource: "network",
      retryAttempt: 1,
    }),
    false,
    "render recovery is bounded to one retry",
  );
  assert.equal(
    shouldRetryFailedLocalFirstImage({
      remote: true,
      isResolving: false,
      cacheSource: "fallback",
      retryAttempt: 0,
    }),
    false,
    "the local placeholder is terminal and must not create a retry loop",
  );
  assert.equal(
    shouldRetryFailedLocalFirstImage({
      remote: false,
      isResolving: false,
      cacheSource: "local",
      retryAttempt: 0,
    }),
    false,
  );
}


/**
 * AsolDB image caching is required; a filesystem image provider is forbidden.
 *
 * These two are easy to confuse and were confused once already. `local-first`
 * in this package means *client cache lookup first* — memory, then the AsolDB
 * `imageCache`, then the network — and it is the reason a cached image renders
 * without a second download, revalidates with `If-None-Match`, and survives an
 * offline moment on stale bytes. It has nothing to do with where the server
 * stores objects, which is Cloudflare R2 in every runtime.
 *
 * Removing server-side filesystem image storage must never be read as
 * permission to remove this cache.
 */
function testAsolDbCacheIsRequiredAndFilesystemStorageIsNot(root: string) {
  const cacheSource = readFileSync(
    path.join(root, "packages/storage-image-manager-core/src/services/local-first-image-cache.ts"),
    "utf8",
  );

  // The pipeline: memory, then AsolDB, then the network — in that order.
  assert.match(cacheSource, /asoldb/i, "the AsolDB tier must remain in the resolution pipeline");
  assert.match(cacheSource, /etag|If-None-Match/i, "conditional revalidation must remain");

  const browserCacheEntry = path.join(root, "packages/data-core/src/browser/image-cache/image-cache.ts");
  assert.ok(
    readFileSync(browserCacheEntry, "utf8").length > 0,
    "the AsolDB image-cache store must exist: it is the durable half of the render path",
  );

  const draftService = readFileSync(
    path.join(root, "packages/storage-image-manager-core/src/services/image-upload-draft-service.ts"),
    "utf8",
  );
  assert.ok(
    draftService.length > 0,
    "imageUploadDrafts persistence must exist: a selected image survives navigation before it is uploaded",
  );

  // The server side, asserted from the same place so the two cannot be conflated.
  const resolver = readFileSync(
    path.join(root, "packages/storage-core/src/server/providers/provider-resolver.ts"),
    "utf8",
  );
  assert.doesNotMatch(
    resolver,
    /LocalStorageProvider/,
    "there is no filesystem image provider: every runtime resolves the profile's R2 account",
  );
  assert.doesNotMatch(
    resolver,
    /sync_file/,
    "no server upload path may write beneath the removed local image tree",
  );
}

function testLocalFirstImageCacheIdentity() {
  assert.equal(isRemoteStorageImageUrl("https://cdn.example.com/a.webp"), true);
  assert.equal(isRemoteStorageImageUrl("http://localhost/a.webp"), true);
  assert.equal(isRemoteStorageImageUrl("/sync_data/a.webp"), false);
  assert.equal(isRemoteStorageImageUrl("blob:abc"), false);
  assert.equal(isRemoteStorageImageUrl("data:image/png;base64,AA=="), false);

  const url = "https://cdn.example.com/a.webp#fragment";
  assert.equal(
    buildStorageImageCacheKey(url),
    buildStorageImageCacheKey("https://cdn.example.com/a.webp"),
    "URL fragments are not object identity and must not duplicate cached bytes",
  );
  assert.notEqual(
    buildStorageImageCacheKey(url, "image-key-a"),
    buildStorageImageCacheKey(url, "image-key-b"),
    "stable storage identities must isolate replacements that reuse a URL",
  );
}

async function main() {
  await testSequentialUploads();
  await testFailureDoesNotStopQueue();
  await testQueuedCancellationAndDeduplication();
  testDraftIdentityAndFileRestoration();
  await testDraftBlobOwnsSelectedFileBytes();
  testLocalFirstImageCacheIdentity();
  testLocalFirstImageRenderRecoveryPolicy();
  await testRemoteImageFailureNeverReturnsCloudUrl();
  const root = process.cwd();
  testLocalFirstImagePlaceholderEvents(root);
  testRemoteImageRenderingBypassIsClosed(root);
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
  assert.match(managerSource, /const stagedFile = imageUploadDraftToFile\(draft\)/);
  assert.match(managerSource, /uploadFileCandidate = imageUploadDraftToFile\(draft\)/);
  assert.doesNotMatch(managerSource, /fileToDataUrl\(normalizedFile\)/);
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
  testAsolDbCacheIsRequiredAndFilesystemStorageIsNot(root);
  console.log("Image upload queue tests passed.");
}

void main();
