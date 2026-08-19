import assert from "node:assert/strict";

import {
  isRetryableTursoReadError,
  isRetrySafeTursoRead,
  withTursoReadRetry,
} from "../turso-read-retry";

async function main() {
for (const sql of [
  "SELECT * FROM products",
  " PRAGMA table_info(products)",
  "WITH visible AS (SELECT * FROM products) SELECT * FROM visible",
]) {
  assert.equal(isRetrySafeTursoRead(sql), true, sql);
}
for (const sql of [
  "INSERT INTO products(id) VALUES (?)",
  "UPDATE products SET name=?",
  "WITH old AS (SELECT id FROM products) DELETE FROM products WHERE id IN (SELECT id FROM old)",
]) {
  assert.equal(isRetrySafeTursoRead(sql), false, sql);
}

for (const error of [
  { name: "LibsqlError", code: "SERVER_ERROR", message: "SERVER_ERROR: Server returned HTTP status 502" },
  { statusCode: 503 },
  { code: "ECONNRESET" },
  new Error("fetch failed"),
]) {
  assert.equal(isRetryableTursoReadError(error), true);
}
for (const error of [
  { message: "Server returned HTTP status 401" },
  { statusCode: 400 },
  new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed"),
]) {
  assert.equal(isRetryableTursoReadError(error), false);
}

let attempts = 0;
const delays: number[] = [];
const result = await withTursoReadRetry(async () => {
  attempts += 1;
  if (attempts < 3) throw new Error("SERVER_ERROR: Server returned HTTP status 502");
  return "ok";
}, {
  baseDelayMs: 100,
  random: () => 0,
  sleep: async (delayMs) => { delays.push(delayMs); },
});
assert.equal(result, "ok");
assert.equal(attempts, 3);
assert.deepEqual(delays, [100, 200]);

let permanentAttempts = 0;
await assert.rejects(
  withTursoReadRetry(async () => {
    permanentAttempts += 1;
    throw new Error("SQLITE_CONSTRAINT");
  }, { sleep: async () => undefined }),
  /SQLITE_CONSTRAINT/,
);
assert.equal(permanentAttempts, 1);

console.log("Turso read retry tests passed.");
}

void main();
