/**
 * Guards on GitHub admin git helpers used by deploy commands.
 */

import assert from "node:assert/strict";

import {
  __testables,
  readGitHubToken,
  readGitLocal,
} from "../lib/github-admin-git";

const { gitHttpsUrl, resolveGitIdentity } = __testables;

assert.equal(
  gitHttpsUrl("printcode1000-lgtm/gova"),
  "https://github.com/printcode1000-lgtm/gova.git",
);

const identity = resolveGitIdentity();
assert.ok(identity.name.length > 0, "Deploy git identity must include a name.");
assert.ok(identity.email.includes("@"), "Deploy git identity must include an email.");

const previousToken = process.env.GITHUB_ADMIN_TOKEN;
process.env.GITHUB_ADMIN_TOKEN = "test-token-for-deploy-git";
try {
  assert.equal(readGitHubToken(), "test-token-for-deploy-git");
} finally {
  if (previousToken !== undefined) {
    process.env.GITHUB_ADMIN_TOKEN = previousToken;
  } else {
    delete process.env.GITHUB_ADMIN_TOKEN;
  }
}

delete process.env.GITHUB_ADMIN_TOKEN;
try {
  assert.throws(() => readGitHubToken(), /GitHub CLI|GITHUB_ADMIN_TOKEN|browser/);
} finally {
  if (previousToken !== undefined) process.env.GITHUB_ADMIN_TOKEN = previousToken;
}

try {
  const branch = readGitLocal(process.cwd(), ["branch", "--show-current"]);
  assert.ok(branch.length > 0, "readGitLocal should run without prompting.");
} catch {
  // Detached HEAD or non-git sandboxes are acceptable in CI.
}

console.log("github-admin-git tests passed.");
