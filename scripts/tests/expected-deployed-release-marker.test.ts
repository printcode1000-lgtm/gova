import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";

import {
  expectedDeployedReleaseMarker,
  parseDeployedReleaseMarker,
  RELEASE_WEB_MANIFEST_GIT_PATH,
  resolveExpectedReleaseRevision,
} from "../expected-deployed-release-marker";

const committed = {
  createdAt: "2026-08-24T21:55:09.762Z",
  releaseId: "0.2.3.0-deployed",
};
const laterLocalStatic = {
  createdAt: "2026-08-25T04:00:00.000Z",
  releaseId: "0.2.3.0-local-rebuild",
};

const gitFiles = new Map<string, string>([
  [`abc123:${RELEASE_WEB_MANIFEST_GIT_PATH}`, JSON.stringify(committed)],
  [`HEAD:${RELEASE_WEB_MANIFEST_GIT_PATH}`, JSON.stringify(committed)],
]);

function gitShow(revision: string, gitPath: string): string {
  const body = gitFiles.get(`${revision}:${gitPath}`);
  if (!body) throw new Error(`missing ${revision}:${gitPath}`);
  return body;
}

assert.equal(resolveExpectedReleaseRevision({ ASOL_RELEASE_REVISION: "abc123" }), "abc123");
assert.equal(
  resolveExpectedReleaseRevision({}, path.join(os.tmpdir(), "asol-no-deploy-state.json")),
  "HEAD",
);

const tmp = mkdtempSync(path.join(os.tmpdir(), "asol-release-marker-"));
try {
  const statePath = path.join(tmp, "run-state.json");
  writeFileSync(statePath, JSON.stringify({ revision: "abc123" }), "utf8");
  assert.equal(resolveExpectedReleaseRevision({}, statePath), "abc123");
  assert.equal(
    resolveExpectedReleaseRevision({ ASOL_RELEASE_REVISION: "env-wins" }, statePath),
    "env-wins",
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const marker = expectedDeployedReleaseMarker(
  { ASOL_RELEASE_REVISION: "abc123" },
  gitShow,
);
assert.equal(marker.createdAt, committed.createdAt);
assert.equal(marker.releaseId, committed.releaseId);
assert.equal(marker.revision, "abc123");
assert.notEqual(
  marker.createdAt,
  laterLocalStatic.createdAt,
  "A later local Static/Android rewrite must not become the expected production marker.",
);

const parsed = parseDeployedReleaseMarker(JSON.stringify(committed), "abc123");
assert.equal(parsed.createdAt, committed.createdAt);

assert.throws(
  () => parseDeployedReleaseMarker("not-json", "abc123"),
  /does not contain a JSON web manifest/,
);
assert.throws(
  () => parseDeployedReleaseMarker(JSON.stringify({ releaseId: "x" }), "abc123"),
  /missing createdAt/,
);

const checkerSource = readFileSync(
  path.join(process.cwd(), "scripts", "check-deployed-release.ts"),
  "utf8",
);
assert.match(
  checkerSource,
  /expectedDeployedReleaseMarker/,
  "release:check must resolve the target-commit marker.",
);
assert.doesNotMatch(
  checkerSource,
  /readFileSync\(.*asol-web-manifest/,
  "release:check must not read the mutable working-tree web manifest as the expected marker.",
);
assert.doesNotMatch(
  checkerSource,
  /path\.join\(process\.cwd\(\),\s*"public"/,
  "release:check must not treat public/ as the expected production identity.",
);

console.log("expected deployed release marker: later local static rebuild is ignored.");
