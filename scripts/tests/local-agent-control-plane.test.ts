import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ALLOWED_WORKFLOW_FILES,
  DEPLOY_CONTROL_PLANE_IGNORES,
  deploymentWorkflowViolations,
  localAgentGatewayWorkflowViolations,
  localAgentCoordinationWorkflowViolations,
  localAgentInspectWorkflowViolations,
  localAgentWorkflowViolations,
} from "../github-ci-policy";
import { DISPATCHABLE_WORKFLOWS } from "@asol/local-agent-core";

/**
 * The workflow half of the control plane's contract.
 *
 * These assertions read this repository's own `.github/workflows`, so they stay
 * outside `@asol/local-agent-core`: a sealed package must not reach back into
 * the application's files. The package's own behaviour is covered by
 * `npm run test:local-agent-core`.
 */

const repoRoot = process.cwd();
const workflow = (name: string): string => readFileSync(path.join(repoRoot, ".github", "workflows", name), "utf8");

// --- workflow policy ------------------------------------------------------------

assert.deepEqual(
  [...ALLOWED_WORKFLOW_FILES],
  [
    "deploy-main.yml",
    "docs.yml",
    "local-agent-coordination.yml",
    "local-agent-gateway.yml",
    "local-agent-inspect.yml",
    "local-agent-main.yml",
    "local-agent-status.yml",
    "local-agent-workspace.yml",
  ],
  "only permanent workflows are allowed; temporary probes cannot survive",
);

assert.deepEqual(deploymentWorkflowViolations(workflow("deploy-main.yml")), []);
assert.deepEqual(localAgentGatewayWorkflowViolations(workflow("local-agent-gateway.yml")), []);
assert.deepEqual(localAgentCoordinationWorkflowViolations(workflow("local-agent-coordination.yml")), []);
// These three previously expected a violation reading `run command is not
// allowed: |`. That was the policy mistaking a YAML block scalar for a command
// named `|`, and the expectation encoded the bug rather than the contract. The
// workflows are legitimate, so the contract is: no violations.
assert.deepEqual(localAgentInspectWorkflowViolations(workflow("local-agent-inspect.yml")), []);
assert.deepEqual(localAgentWorkflowViolations(workflow("local-agent-main.yml")), []);
assert.deepEqual(localAgentWorkflowViolations(workflow("local-agent-workspace.yml")), []);

// Antigravity/agy is a permanent Local Runner ban. The workflows may document
// that fact in input descriptions, but they must never discover, wrap, export,
// or execute the binaries themselves.
for (const name of ["local-agent-main.yml", "local-agent-workspace.yml"]) {
  const body = workflow(name);
  for (const forbiddenFragment of ["command -v agy", "GOVA_REAL_AGY", "gova-agy-", "exec \"$GOVA_REAL_AGY\""]) {
    assert.equal(
      body.includes(forbiddenFragment),
      false,
      `${name} must not reintroduce Antigravity/agy runner integration: ${forbiddenFragment}`,
    );
  }
}

// A shell block is still held to the forbidden-command list, so loosening the
// block-scalar handling cannot smuggle a build or deploy into a runner job.
assert.match(
  localAgentWorkflowViolations(
    workflow("local-agent-main.yml").replace("        run: |\n", "        run: |\n          npm run build\n"),
  ).join(" "),
  /must not run npm run build/,
  "a forbidden command inside a shell block is still refused",
);

// A control-plane commit must not be able to deploy production.
const deployBody = workflow("deploy-main.yml");
for (const ignored of DEPLOY_CONTROL_PLANE_IGNORES) {
  assert.equal(deployBody.includes(`- "${ignored}"`), true, `deploy-main must ignore ${ignored}`);
}
assert.match(
  deploymentWorkflowViolations(deployBody.replace('      - ".agent-control/**"\n', "")).join(" "),
  /control-plane changes/,
  "dropping a control-plane path filter fails the policy",
);

// Local jobs must not re-materialise a workspace they already have.
assert.match(
  localAgentWorkflowViolations(
    workflow("local-agent-main.yml").replace(
      "    steps:\n",
      "    steps:\n      - uses: actions/checkout@v4\n",
    ),
  ).join(" "),
  /must not check out the repository/,
  "a reintroduced checkout fails the policy",
);

// The gateway is the only local workflow allowed to react to a push, and never on main.
assert.match(
  localAgentGatewayWorkflowViolations(workflow("local-agent-gateway.yml").replace('- "agent-request/**"', "- main")).join(" "),
  /agent-request/,
  "the gateway cannot be repointed at main",
);

assert.equal(Object.keys(DISPATCHABLE_WORKFLOWS).length, 5);
for (const contract of Object.values(DISPATCHABLE_WORKFLOWS)) {
  assert.equal(
    (ALLOWED_WORKFLOW_FILES as readonly string[]).includes(contract.file),
    true,
    `${contract.file} must be a permanent workflow`,
  );
}


console.log("local agent workflow policy: all checks passed.");
