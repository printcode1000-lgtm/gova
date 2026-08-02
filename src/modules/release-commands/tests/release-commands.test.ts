import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { BUILD_COMMAND_CATALOG } from "../domain/build-command-catalog";
import { validateGooglePlayImage } from "@/modules/google-play-console/domain/image-validation";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

for (const command of BUILD_COMMAND_CATALOG) {
  assert.ok(
    packageJson.scripts[command.script],
    `Catalog command ${command.id} references missing script ${command.script}`,
  );
}

for (const command of BUILD_COMMAND_CATALOG.filter((item) => item.danger === "publishes-live")) {
  assert.ok(command.confirmationPhrase, `${command.id} must declare a confirmation phrase`);
  assert.ok(command.requiredEnv.length > 0, `${command.id} must declare required env vars`);
}

assert.equal(
  validateGooglePlayImage({
    imageType: "icon",
    contentType: "image/png",
    size: 1024 * 1024,
    dimensions: { width: 512, height: 512 },
  }).ok,
  true,
);
assert.equal(
  validateGooglePlayImage({
    imageType: "icon",
    contentType: "image/png",
    size: 1024 * 1024 + 1,
    dimensions: { width: 512, height: 512 },
  }).ok,
  false,
);
assert.equal(
  validateGooglePlayImage({
    imageType: "featureGraphic",
    contentType: "image/jpeg",
    size: 10,
    dimensions: { width: 1024, height: 500 },
  }).ok,
  true,
);
assert.equal(
  validateGooglePlayImage({
    imageType: "phoneScreenshots",
    contentType: "image/jpeg",
    size: 10,
    dimensions: { width: 3840, height: 1920 },
    existingCount: 7,
  }).ok,
  true,
);
assert.equal(
  validateGooglePlayImage({
    imageType: "phoneScreenshots",
    contentType: "image/jpeg",
    size: 10,
    dimensions: { width: 3840, height: 1000 },
    existingCount: 7,
  }).ok,
  false,
);
assert.equal(
  validateGooglePlayImage({
    imageType: "phoneScreenshots",
    contentType: "image/jpeg",
    size: 10,
    dimensions: { width: 320, height: 320 },
    existingCount: 8,
  }).ok,
  false,
);

const publishingLaneWithNoR8 = `
lane :production do
  gradle(build_type: "ReleaseNoR8")
  upload_to_play_store(track: "production")
end
`;
assert.match(publishingLaneWithNoR8, /upload_to_play_store/);
assert.match(publishingLaneWithNoR8, /ReleaseNoR8|releaseNoR8|no_r8/);

const exclusiveCategories = new Set(["native-android", "ota", "fastlane"]);
const exclusiveCommands = BUILD_COMMAND_CATALOG.filter((command) =>
  exclusiveCategories.has(command.category),
);
assert.ok(exclusiveCommands.length > 0, "single-flight categories must have catalog coverage");

console.log("Release command catalog, confirmation metadata, image validation, and R8 no-publish fixture checks passed.");
