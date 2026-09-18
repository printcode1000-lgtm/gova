/**
 * Contract test: a notification failure never becomes a silent 500.
 *
 * The preferences route threw `notificationPreferenceInvalid` under a comment
 * saying it was "a mapped business code", and it was not: every unmapped code
 * falls through `businessApiErrorStatus` to `500 internalServerError`, which
 * reports the caller's mistake as a server fault and hides the reason. Device
 * registration and grant verification had the same gap.
 *
 * Every error code thrown on the notification server paths is collected from
 * source and must map to a deliberate status. Only programmer errors that no
 * request can trigger may stay a 500, and they are named here.
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { businessApiErrorStatus } from "@/core/api/business-api-error-status";

const root = process.cwd();

const SOURCES = [
  "src/features/notifications/server",
  "src/features/notifications/server.ts",
  "packages/notifications-core/src",
  "services/notifications/src",
  "src/app/api/notifications",
  "src/features/auth/server/session-request.server.ts",
  "src/features/super-admin/server/services/super-admin-auth.server.ts",
  "packages/auth-core/src/server/session-auth.ts",
  "packages/auth-core/src/server/session-token.ts",
];

/** Internal dispatch errors: no HTTP request can produce them. */
const INTERNAL_ONLY = new Set([
  "notificationServerCommandUnknown",
  "notificationServerCommandInvalid",
]);

function sourceFiles(entry: string): string[] {
  const absolute = path.join(root, entry);
  if (!existsSync(absolute)) return [];
  if (!statSync(absolute).isDirectory()) return [absolute];
  return readdirSync(absolute).flatMap((name) => {
    if (name === "tests" || name === "generated" || name === "node_modules") return [];
    return sourceFiles(path.join(entry, name));
  });
}

const codes = new Map<string, string>();
for (const file of SOURCES.flatMap(sourceFiles)) {
  if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/new Error\(\s*["']([a-zA-Z][a-zA-Z0-9]+)["']\s*\)/g)) {
    codes.set(match[1]!, path.relative(root, file));
  }
}
assert.ok(codes.size >= 20, `expected the notification error surface, found ${codes.size} codes`);

for (const [code, file] of codes) {
  if (INTERNAL_ONLY.has(code)) continue;
  const mapped = businessApiErrorStatus(code);
  assert.notEqual(
    mapped.status,
    500,
    `${code} (thrown in ${file}) maps to 500. Add it to KNOWN_BUSINESS_API_ERROR_CODES ` +
      "or give it an explicit status in business-api-error-status.ts.",
  );
  assert.equal(mapped.code, code, `${code} must reach the client under its own name.`);
}

// The statuses a client branches on.
const expected: Record<string, number> = {
  forbidden: 403,
  sessionTokenInvalid: 400,
  notificationGrantInvalid: 400,
  notificationPreferenceInvalid: 400,
  notificationTokenIdentifierRequired: 400,
  mobilePushCredentialBlobMismatch: 403,
  mobilePushUnlockNotConfigured: 503,
  notificationGrantNotIssued: 503,
};
for (const [code, status] of Object.entries(expected)) {
  assert.equal(businessApiErrorStatus(code).status, status, `${code} must answer ${status}`);
}

console.log("Notification error status contract passed.");
