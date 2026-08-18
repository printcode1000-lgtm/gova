import assert from "node:assert/strict";

import { ApiError } from "@/core/api/api-error";
import {
  isKnownBusinessApiErrorCode,
  looksLikeTechnicalErrorMessage,
  sanitizeApiErrorCodeForClient,
} from "@/core/api/business-api-error-codes";
import { formatUserFacingApiError } from "@/core/api/user-facing-api-error";
import { translate } from "@/lib/i18n";

const t = (key: string) => translate("ar", key);

assert.equal(
  sanitizeApiErrorCodeForClient(
    "SQLITE_UNKNOWN: SQLite error: no such column: fulfillment_snapshot_json",
    500,
  ),
  "internalServerError",
);

assert.equal(sanitizeApiErrorCodeForClient("userNotFound", 400), "userNotFound");
assert.equal(sanitizeApiErrorCodeForClient("Internal Server Error", 500), "internalServerError");
assert.ok(looksLikeTechnicalErrorMessage("SQLITE_UNKNOWN: no such column: foo"));
assert.ok(!looksLikeTechnicalErrorMessage("invalidPassword"));
assert.ok(isKnownBusinessApiErrorCode("forbidden"));

assert.match(
  formatUserFacingApiError(t, new ApiError("internalServerError", 500)),
  /خطأ في الخادم/,
);

assert.match(
  formatUserFacingApiError(
    t,
    new ApiError(
      "SQLITE_UNKNOWN: SQLite error: no such column: fulfillment_snapshot_json",
      500,
    ),
  ),
  /خطأ في الخادم/,
);

assert.match(
  formatUserFacingApiError(t, new ApiError("invalidPassword", 400)),
  /كلمة المرور/,
);

console.log("user-facing-api-error tests passed");
