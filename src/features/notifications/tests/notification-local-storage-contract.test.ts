import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = readFileSync(path.join(root, "packages/data-core/src/core/database/schema.ts"), "utf8");
const localRepository = readFileSync(
  path.join(root, "src/features/notifications/infrastructure/asol-notification-repository.ts"),
  "utf8",
);
const serviceWorker = readFileSync(path.join(root, "public/asol-push-sw.js"), "utf8");
const asolDb = readFileSync(
  path.join(root, "packages/data-core/src/browser/asol-db/index.ts"),
  "utf8",
);

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
}

assert.doesNotMatch(
  schema,
  /sqliteTable\(\s*["'](?:notifications|notification_messages|notification_inbox|specialty_chat_messages|specialty_chat_threads)["']/,
  "Notification content must not have a server SQLite/Turso table.",
);
assert.match(localRepository, /ASOL_DB_STORES\.NOTIFICATIONS/);
assert.match(localRepository, /asolDbSet\(/);
assert.match(serviceWorker, /indexedDB\.open\(ASOL_DB_NAME/);

// The service worker is static and cannot import the AsolDB module. It may
// duplicate the database name, but it must not pin or upgrade the shared schema
// version. Only the three stores it actually transacts against are owned here.
function capture(source: string, pattern: RegExp, label: string): string {
  const match = source.match(pattern);
  assert.ok(match?.[1], `Could not read ${label}.`);
  return match[1];
}

function storeNames(source: string, pattern: RegExp, label: string): string[] {
  const block = capture(source, pattern, label);
  return [...block.matchAll(/['"]([a-zA-Z][a-zA-Z0-9]*)['"]/g)]
    .map((entry) => entry[1])
    .sort();
}

assert.equal(
  capture(serviceWorker, /const ASOL_DB_NAME = '([^']+)'/, "service worker database name"),
  capture(asolDb, /const DB_NAME = '([^']+)'/, "AsolDB database name"),
  "Service worker and AsolDB disagree on the database name.",
);
assert.doesNotMatch(serviceWorker, /ASOL_DB_VERSION/, "The push worker must not own AsolDB schema versioning.");
assert.match(
  serviceWorker,
  /indexedDB\.open\(ASOL_DB_NAME\)/,
  "The push worker must open the installed AsolDB version without upgrading it.",
);
const notificationWorkerStores = storeNames(
  serviceWorker,
  /ASOL_NOTIFICATION_STORES = \[([\s\S]*?)\]/,
  "service worker stores",
);
assert.deepEqual(notificationWorkerStores, ["notificationBadges", "notificationSettings", "notifications"]);
const applicationStores = new Set(
  storeNames(asolDb, /ASOL_DB_STORES = \{([\s\S]*?)\} as const/, "AsolDB stores"),
);
for (const storeName of notificationWorkerStores) {
  assert.ok(applicationStores.has(storeName), `Push worker store ${storeName} is not owned by AsolDB.`);
}

const clientNotificationFiles = [
  ...filesBelow(path.join(root, "src/features/notifications")),
  ...filesBelow(path.join(root, "src/features/specialty-chat")),
].filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of clientNotificationFiles) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b/, `${file} bypasses AsolDB.`);
}

const serverChatFiles = filesBelow(
  path.join(root, "src/features/specialty-chat/server/services"),
);
for (const file of serverChatFiles) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /(?:insert|update)\s*\([^)]*(?:message|notification|body|title)/i,
    `${file} appears to persist notification content on the server.`,
  );
}

console.log("Notification local-only storage contract passed.");
