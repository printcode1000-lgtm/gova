import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ALLOWED_WORKFLOW_FILES,
  deploymentWorkflowViolations,
  docsWorkflowViolations,
  localAgentBootstrapWorkflowViolations,
  verifyGithubCiPolicy,
} from "../github-ci-policy";

const root = process.cwd();
const live = verifyGithubCiPolicy();
assert.deepEqual(live, [], live.join("\n"));
assert.deepEqual([...ALLOWED_WORKFLOW_FILES], ["deploy-main.yml", "docs.yml", "local-agent-bootstrap.yml"]);

const docs = readFileSync(path.join(root, ".github/workflows/docs.yml"), "utf8");
const deploy = readFileSync(path.join(root, ".github/workflows/deploy-main.yml"), "utf8");
const bootstrap = readFileSync(path.join(root, ".github/workflows/local-agent-bootstrap.yml"), "utf8");

assert.deepEqual(docsWorkflowViolations(docs), []);
assert.deepEqual(deploymentWorkflowViolations(deploy), []);
assert.deepEqual(localAgentBootstrapWorkflowViolations(bootstrap), []);

assert.ok(localAgentBootstrapWorkflowViolations(bootstrap.replace("contents: read", "contents: write")).some((e) => e.includes("read-only")));
assert.ok(localAgentBootstrapWorkflowViolations(bootstrap.replace("runs-on: [self-hosted, Linux, X64, gova]", "runs-on: ubuntu-latest")).some((e) => e.includes("self-hosted")));
assert.ok(localAgentBootstrapWorkflowViolations(`${bootstrap}\n      - run: npm ci\n`).some((e) => e.includes("npm ci") || e.includes("forbidden")));
assert.ok(localAgentBootstrapWorkflowViolations(`${bootstrap}\n      TOKEN: \${{ secrets.GITHUB_TOKEN }}\n`).some((e) => e.includes("secrets")));
assert.ok(localAgentBootstrapWorkflowViolations(bootstrap.replace("workflow_dispatch:", "push:")).some((e) => e.includes("manual") || e.includes("push")));
assert.ok(deploymentWorkflowViolations(deploy.replace("id-token: write", "id-token: read")).some((e) => e.includes("id-token: write")));
assert.ok(
  deploymentWorkflowViolations(
    deploy.replace(
      "startsWith(github.event.head_commit.message, 'deploy(push):')",
      "startsWith(github.event.head_commit.message, 'other:')",
    ),
  ).some((e) => e.includes("release-owned commit prefix")),
);
assert.ok(docsWorkflowViolations(`${docs}\n      - run: npm run lint\n`).some((e) => e.includes("npm run lint") || e.includes("not allowed")));

console.log("GitHub CI policy tests passed for docs + deploy + persistent local-agent bootstrap.");
