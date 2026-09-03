import assert from "node:assert/strict";
import { mkdtempSync, existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { clearStaleReleaseGitIndexLock } from "../index";

const root = mkdtempSync(path.join(tmpdir(), "release-git-guards-"));
const lock = path.join(root, ".git", "index.lock");
mkdirSync(path.dirname(lock), { recursive: true });
writeFileSync(lock, "locked");
assert.throws(
  () => clearStaleReleaseGitIndexLock({ cwd: root, command: "test", staleAgeMs: 60_000 }),
  /index\.lock is active/,
  "A fresh lock must never be removed.",
);
assert.ok(existsSync(lock));
utimesSync(lock, new Date(Date.now() - 120_000), new Date(Date.now() - 120_000));
clearStaleReleaseGitIndexLock({ cwd: root, command: "test", staleAgeMs: 1 });
assert.ok(!existsSync(lock), "An abandoned lock must be removed.");
rmSync(root, { recursive: true, force: true });
console.log("release-core Git guards: fresh locks fail closed; abandoned locks are recovered.");
