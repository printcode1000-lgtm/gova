import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import profiles from "@asol/storage-core/profiles-config";
import { StorageProfiles, buildObjectPath } from "@asol/storage-core";
import { validateImageAttachment } from "@asol/orders-core";

function main() {
  assert.equal(StorageProfiles.SpicialOrder, "spicialOrder");

  const profile = profiles.profiles.find(
    (item) => item.id === StorageProfiles.SpicialOrder,
  );
  assert.ok(profile, "spicialOrder profile is missing");
  assert.equal(profile.maxImageSizeKB, 500);
  assert.equal(profile.outputFormat, "webp");
  assert.equal(profile.provider, "CloudflareR2");
  assert.equal(profile.folder, "images/spicialOrder");
  assert.equal(profile.cloudFolder, "images/content/spicialOrder");
  assert.equal(
    buildObjectPath(profile.folder, "test.webp"),
    "images/spicialOrder/test.webp",
  );
  assert.equal(
    buildObjectPath(profile.cloudFolder, "test.webp"),
    "images/content/spicialOrder/test.webp",
  );
  assert.ok(
    fs.existsSync(
      path.join(process.cwd(), "public/sync_data/sync_file/images/spicialOrder"),
    ),
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
    "marketplace-orders storage: local folder and R2 cloud folder contract verified",
  );
}

main();
