import assert from "node:assert/strict";
import profiles from "@asol/storage-core/profiles-config";
import { StorageProfiles, buildObjectPath } from "@asol/storage-core";
import { validateImageAttachment } from "@asol/orders-core";

/**
 * Special-order attachments live in one place: the `spicialOrder` prefix in R2.
 *
 * This used to assert both a local folder and a cloud folder, and to require a
 * directory under `public/sync_data/sync_file/images` to exist on disk — so it
 * passed only on a machine that had run the filesystem image provider, and it
 * pinned the two-folder duality it was meant to describe. The R2 prefix is the
 * one an object is actually stored under, and it is asserted literally because
 * changing it orphans every attachment already uploaded.
 */
function main() {
  assert.equal(StorageProfiles.SpicialOrder, "spicialOrder");

  const profile = profiles.profiles.find(
    (item) => item.id === StorageProfiles.SpicialOrder,
  );
  assert.ok(profile, "spicialOrder profile is missing");
  assert.equal(profile.maxImageSizeKB, 500);
  assert.equal(profile.outputFormat, "webp");
  assert.equal(profile.provider, "CloudflareR2");
  assert.equal(profile.folder, "images/content/spicialOrder");
  assert.ok(
    !("cloudFolder" in profile),
    "The profile must declare one folder; a second one is a second object store.",
  );
  assert.equal(
    buildObjectPath(profile.folder, "test.webp"),
    "images/content/spicialOrder/test.webp",
  );
  assert.doesNotThrow(() =>
    validateImageAttachment({
      storageProfileId: "spicialOrder",
      imageKey: "test.webp",
      mimeType: "image/webp",
      fileSize: 512000,
      imageUrl: "/test.webp",
    }),
  );
  assert.throws(
    () =>
      validateImageAttachment({
        storageProfileId: "spicialOrder",
        imageKey: "test.webp",
        mimeType: "image/webp",
        fileSize: 512001,
        imageUrl: "/test.webp",
      }),
    /500 KB/,
  );
  console.log(
    "marketplace-orders storage: R2 object prefix and attachment contract verified",
  );
}

main();
