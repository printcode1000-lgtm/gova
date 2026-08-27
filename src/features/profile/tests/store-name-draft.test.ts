import assert from "node:assert/strict";

import {
  commitSharedStoreName,
  hydrateSharedStoreName,
  readSharedStoreName,
  resetSharedStoreNameDrafts,
  writeSharedStoreName,
} from "../presentation/hooks/store-name-draft";

resetSharedStoreNameDrafts();

assert.equal(readSharedStoreName("usr_1", "احتياطي"), "احتياطي");

hydrateSharedStoreName("usr_1", "من الخادم");
assert.equal(readSharedStoreName("usr_1", "احتياطي"), "من الخادم");

hydrateSharedStoreName("usr_1", "تجاهل لأن المسودة غير متسخة");
assert.equal(readSharedStoreName("usr_1", "احتياطي"), "تجاهل لأن المسودة غير متسخة");

writeSharedStoreName("usr_1", "من التسجيل");
assert.equal(readSharedStoreName("usr_1", "احتياطي"), "من التسجيل");

hydrateSharedStoreName("usr_1", "لا تستبدل المسودة المتسخة");
assert.equal(readSharedStoreName("usr_1", "احتياطي"), "من التسجيل");

commitSharedStoreName("usr_1", "بعد الحفظ");
assert.equal(readSharedStoreName("usr_1", "احتياطي"), "بعد الحفظ");

hydrateSharedStoreName("usr_1", "من الخادم بعد الحفظ");
assert.equal(readSharedStoreName("usr_1", "احتياطي"), "من الخادم بعد الحفظ");

console.log("Store name draft tests passed.");
