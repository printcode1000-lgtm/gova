import assert from "node:assert/strict";

import {
  detectImageContentType,
  readImageDimensions,
  validateGooglePlayImage,
} from "../images";
import { GOOGLE_PLAY_IMAGE_TYPES } from "../index";

const png = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52,
  0, 0, 2, 0, 0, 0, 2, 0,
]);

const jpeg = Buffer.from([
  0xff, 0xd8,
  0xff, 0xc0, 0, 17, 8,
  0x02, 0xd0,
  0x05, 0x00,
  3, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0,
]);

assert.deepEqual(GOOGLE_PLAY_IMAGE_TYPES.slice(0, 2), [
  "icon",
  "featureGraphic",
]);
assert.equal(detectImageContentType(png), "image/png");
assert.equal(detectImageContentType(jpeg), "image/jpeg");
assert.deepEqual(readImageDimensions(png), { width: 512, height: 512 });
assert.deepEqual(readImageDimensions(jpeg), { width: 1280, height: 720 });
assert.equal(
  validateGooglePlayImage({
    imageType: "icon",
    contentType: "image/png",
    size: 1024 * 1024,
    dimensions: { width: 512, height: 512 },
    bytes: png,
  }).ok,
  true,
);
assert.equal(
  validateGooglePlayImage({
    imageType: "icon",
    contentType: "image/jpeg",
    size: 10,
    dimensions: { width: 512, height: 512 },
    bytes: png,
  }).ok,
  false,
);

console.log("Google Play Store assets core tests passed.");
