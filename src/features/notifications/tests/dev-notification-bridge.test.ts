import assert from "node:assert/strict";

import { getNotificationsPublicUrl } from "@/core/config/public-env";

assert.equal(
  getNotificationsPublicUrl(),
  null,
  "Without a configured URL and without window, the bridge must not guess an origin.",
);

console.log("Dev notification bridge contract passed.");
