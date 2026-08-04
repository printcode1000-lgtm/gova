import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  redactSystemLogText,
  sanitizePersistentSystemLog,
} from "../system-log-sanitizer";
import type { PersistentSystemLogInput } from "../entities/persistent-system-log.entity";

const base: PersistentSystemLogInput = {
  level: "error",
  source: "server",
  consoleMethod: "server.error",
  message:
    "Authorization: Bearer abc.def token=secret-value user@example.com 01012345678",
  page: "/api/test?token=page-secret",
  platform: "server",
};

const client = sanitizePersistentSystemLog(base, "untrusted-client");
assert.equal(client.origin, "client");
assert.equal(client.trustLevel, "untrusted-client");
assert.equal(client.source, "client");
assert.equal(client.platform, "web");
assert.equal(client.message.includes("abc.def"), false);
assert.equal(client.message.includes("secret-value"), false);
assert.equal(client.message.includes("user@example.com"), false);
assert.equal(client.message.includes("01012345678"), false);
assert.equal(client.page.includes("page-secret"), false);

const server = sanitizePersistentSystemLog(base, "trusted-server");
assert.equal(server.origin, "cloud");
assert.equal(server.trustLevel, "trusted-server");
assert.equal(server.source, "server");
assert.equal(server.platform, "server");

for (const value of [
  "password='hunter2'",
  "api_key=abcdef",
  "?token=abcdef&next=/home",
  '"sessionToken":"abcdef"',
]) {
  assert.equal(redactSystemLogText(value).includes("abcdef"), false);
  assert.equal(redactSystemLogText(value).includes("hunter2"), false);
}

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const listRoute = read("src/app/api/system-logs/route.ts");
const ingestRoute = read("src/app/api/system-logs/ingest/route.ts");
const apiService = read(
  "src/features/system-logs/services/persistent-system-log-api-service.ts",
);

assert.equal(listRoute.includes("assertSuperAdminRequest(request)"), true);
assert.equal(listRoute.includes('searchParams.get("uid")'), false);
assert.equal(apiService.includes('"x-asol-session-token": sessionToken'), true);
assert.equal(
  ingestRoute.includes('addBatch(inputs, "untrusted-client")'),
  true,
);
assert.equal(ingestRoute.includes("values.length > 25"), true);
assert.equal(ingestRoute.includes("isRateLimited(request)"), true);
assert.equal(ingestRoute.includes("systemLogRateLimited"), true);
assert.equal(listRoute.includes("sessionTokenInvalid"), true);
assert.equal(listRoute.includes("invalidSystemLogLevel"), true);

console.log("System log security tests passed.");
