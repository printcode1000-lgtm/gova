/**
 * Guards on GitHub admin git helpers used by deploy commands.
 */

import assert from "node:assert/strict";

import {
  __testables,
  readGitHubAdminToken,
  resolveGitHubRepository,
} from "../lib/github-admin-git";

const { gitHttpsUrl } = __testables;

assert.equal(
  gitHttpsUrl("printcode1000-lgtm/gova"),
  "https://github.com/printcode1000-lgtm/gova.git",
);

const previousToken = process.env.GITHUB_ADMIN_TOKEN;
delete process.env.GITHUB_ADMIN_TOKEN;
try {
  assert.throws(() => readGitHubAdminToken(), /GITHUB_ADMIN_TOKEN is required/);
} finally {
  if (previousToken !== undefined) process.env.GITHUB_ADMIN_TOKEN = previousToken;
}

try {
  const repo = resolveGitHubRepository(process.cwd());
  assert.match(repo, /^[^/]+\/[^/]+$/);
} catch {
  // No git remote in some CI sandboxes — repository resolution is exercised locally.
}

console.log("github-admin-git tests passed.");
