import assert from "node:assert/strict";
import {
  photoOptionsSchema,
  pickImagesOptionsSchema,
  shareOptionsSchema,
  localNotificationScheduleSchema,
  clipboardWriteOptionsSchema,
  openBrowserOptionsSchema,
  showToastOptionsSchema,
  startDownloadOptionsSchema,
  pickFilesOptionsSchema,
} from "../../validation";

// 1. Photo options schema
assert.ok(photoOptionsSchema.safeParse({ quality: 80 }).success);
assert.ok(photoOptionsSchema.safeParse({ quality: 150 }).success === false, "Quality > 100 must fail");
assert.ok(photoOptionsSchema.safeParse({ quality: -5 }).success === false, "Quality < 0 must fail");

// 2. Share options schema
assert.ok(shareOptionsSchema.safeParse({ text: "Hello", title: "Greeting" }).success);
assert.ok(shareOptionsSchema.safeParse({}).success === false, "Empty share options must fail");

// 3. Local notification schedule schema
assert.ok(localNotificationScheduleSchema.safeParse({ id: 1, title: "Test", body: "Hello" }).success);
assert.ok(localNotificationScheduleSchema.safeParse({ id: "string" }).success === false, "Non-numeric id must fail");

// 4. Clipboard write schema
assert.ok(clipboardWriteOptionsSchema.safeParse({ string: "Copied text" }).success);
assert.ok(clipboardWriteOptionsSchema.safeParse({}).success === false, "Empty clipboard options must fail");

// 5. Open browser schema
assert.ok(openBrowserOptionsSchema.safeParse({ url: "https://example.com" }).success);
assert.ok(openBrowserOptionsSchema.safeParse({ url: "not-a-url" }).success === false, "Invalid URL must fail");

// 6. Toast schema
assert.ok(showToastOptionsSchema.safeParse({ text: "Success" }).success);
assert.ok(showToastOptionsSchema.safeParse({ text: "" }).success === false, "Empty toast text must fail");

// 7. Background download schema
assert.ok(startDownloadOptionsSchema.safeParse({ url: "https://example.com/file.zip", destinationPath: "downloads/file.zip" }).success);
assert.ok(startDownloadOptionsSchema.safeParse({ url: "ftp://example.com", destinationPath: "file.zip" }).success === false, "FTP URL must fail");

// 8. Files pick schema
assert.ok(pickFilesOptionsSchema.safeParse({ multiple: true }).success);

console.log("✓ All domain validation schema tests passed.");
