import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const schema = readFileSync(path.join(root, "src/core/database/schema.ts"), "utf8");
const localRepository = readFileSync(
  path.join(root, "src/features/notifications/infrastructure/asol-notification-repository.ts"),
  "utf8",
);
const serviceWorker = readFileSync(path.join(root, "public/asol-push-sw.js"), "utf8");

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

const clientNotificationFiles = [
  ...filesBelow(path.join(root, "src/features/notifications")),
  ...filesBelow(path.join(root, "src/features/specialty-chat")),
].filter((file) => /\.(ts|tsx)$/.test(file));
for (const file of clientNotificationFiles) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b/, `${file} bypasses AsolDB.`);
}

const serverChatFiles = filesBelow(path.join(root, "src/features/specialty-chat/services"));
for (const file of serverChatFiles) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /(?:insert|update)\s*\([^)]*(?:message|notification|body|title)/i,
    `${file} appears to persist notification content on the server.`,
  );
}

console.log("Notification local-only storage contract passed.");

