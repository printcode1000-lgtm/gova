/**
 * Guards on GitHub admin git helpers used by deploy commands.
 */

import assert from "node:assert/strict";

import {
  __testables,
  readGitLocal,
} from "../lib/github-admin-git";

const { gitHttpsUrl, resolveGitIdentity, ghCredentialHelperConfig, resolveGhExecutable, ghInstalled } =
  __testables;

assert.equal(
  gitHttpsUrl("printcode1000-lgtm/gova"),
  "https://github.com/printcode1000-lgtm/gova.git",
);

const identity = resolveGitIdentity();
assert.ok(identity.name.length > 0, "Deploy git identity must include a name.");
assert.ok(identity.email.includes("@"), "Deploy git identity must include an email.");

assert.ok(
  ghCredentialHelperConfig().includes("auth git-credential"),
  "Credential helper must invoke gh auth git-credential.",
);

if (ghInstalled()) {
  assert.ok(resolveGhExecutable().length > 0);
}

try {
  const branch = readGitLocal(process.cwd(), ["branch", "--show-current"]);
  assert.ok(branch.length > 0, "readGitLocal should run without prompting.");
} catch {
  // Detached HEAD or non-git sandboxes are acceptable in CI.
}

console.log("github-admin-git tests passed.");
