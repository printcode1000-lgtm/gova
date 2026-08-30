import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  collectGithubCiPolicyErrors,
  docsWorkflowViolations,
  deploymentWorkflowViolations,
  DOCS_WORKFLOW_PATH_FILTERS,
  FORBIDDEN_CI_PATHS,
  localAgentWorkflowViolations,
  verifyGithubCiPolicy,
} from "../github-ci-policy";
import { blockingMainRules } from "../github-main-policy";

const live = verifyGithubCiPolicy();
assert.deepEqual(live, [], live.join("\n"));

const docsSource = readFileSync(path.join(process.cwd(), ".github", "workflows", "docs.yml"), "utf8");
const deploySource = readFileSync(path.join(process.cwd(), ".github", "workflows", "deploy-main.yml"), "utf8");
const localAgentSource = readFileSync(path.join(process.cwd(), ".github", "workflows", "local-agent-main.yml"), "utf8");
const localAgentWorkspaceSource = readFileSync(
  path.join(process.cwd(), ".github", "workflows", "local-agent-workspace.yml"),
  "utf8",
);
assert.equal(docsWorkflowViolations(docsSource).length, 0, docsWorkflowViolations(docsSource).join("\n"));
assert.equal(deploymentWorkflowViolations(deploySource).length, 0, deploymentWorkflowViolations(deploySource).join("\n"));
assert.equal(localAgentWorkflowViolations(localAgentSource).length, 0, localAgentWorkflowViolations(localAgentSource).join("\n"));
assert.equal(
  localAgentWorkflowViolations(localAgentWorkspaceSource).length,
  0,
  localAgentWorkflowViolations(localAgentWorkspaceSource).join("\n"),
);
assert.ok(
  localAgentWorkflowViolations(
    localAgentSource.replace("runs-on: [self-hosted, Linux, X64, gova]", "runs-on: ubuntu-latest"),
  ).some((error) => error.includes("self-hosted")),
);
assert.ok(
  localAgentWorkflowViolations(localAgentSource.replace("contents: write", "contents: read")).some((error) =>
    error.includes("contents: write"),
  ),
);
assert.ok(
  localAgentWorkflowViolations(`${localAgentSource}\n      GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}\n`).some((error) =>
    error.includes("secrets"),
  ),
);
assert.ok(
  localAgentWorkflowViolations(`${localAgentSource}\n      - run: cat .env.local\n`).some((error) =>
    error.includes("not allowed"),
  ),
);
assert.ok(
  docsWorkflowViolations(docsSource.replace("runs-on: [self-hosted, Linux, X64, gova]", "runs-on: ubuntu-latest")).some(
    (error) => error.includes("self-hosted"),
  ),
);
assert.ok(
  deploymentWorkflowViolations(
    deploySource.replace("runs-on: [self-hosted, Linux, X64, gova]", "runs-on: ubuntu-latest"),
  ).some((error) => error.includes("self-hosted")),
);
assert.ok(deploymentWorkflowViolations(deploySource.replace("id-token: write", "id-token: read")).some((error) => error.includes("id-token: write")));
assert.ok(deploymentWorkflowViolations(`${deploySource}\n      - run: npm test\n`).some((error) => error.includes("shell commands")));
assert.ok(
  deploymentWorkflowViolations(deploySource.replaceAll("github.sha", "github.ref")).some((error) =>
    error.includes("github.sha"),
  ),
);

assert.ok(
  docsWorkflowViolations(docsSource.replaceAll("fetch-depth: 0", "fetch-depth: 1")).some((error) =>
    error.includes("fetch-depth: 0"),
  ),
);
assert.ok(
  docsWorkflowViolations(
    docsSource.replaceAll(
      "DOCS_CI_BASE_REF: ${{ github.event.pull_request.base.sha || github.event.before }}",
      "DOCS_CI_BASE_REF: HEAD~1",
    ),
  ).some((error) => error.includes("DOCS_CI_BASE_REF")),
);
assert.ok(
  docsWorkflowViolations(docsSource.replaceAll("npm run docs:diff -- --against-head", "npm run docs:check")).some(
    (error) => error.includes("docs:diff -- --against-head"),
  ),
);

assert.ok(
  docsWorkflowViolations(`
name: native-core
on:
  push:
    branches:
      - main
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: npm test
`).some((error) => error.includes("push to main") || error.includes("pull_request")),
);

const missingPr = docsWorkflowViolations(`
name: docs
on:
  push:
    branches:
      - main
    paths:
${DOCS_WORKFLOW_PATH_FILTERS.map((item) => `      - "${item}"`).join("\n")}
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run docs:ci
`);
assert.ok(missingPr.some((error) => error.includes("pull_request")));

const codeCi = docsWorkflowViolations(`
name: docs
on:
  push:
    branches:
      - main
    paths:
${DOCS_WORKFLOW_PATH_FILTERS.map((item) => `      - "${item}"`).join("\n")}
  pull_request:
    branches:
      - main
    paths:
${DOCS_WORKFLOW_PATH_FILTERS.map((item) => `      - "${item}"`).join("\n")}
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
      - run: npm run docs:ci
`);
assert.ok(codeCi.some((error) => error.includes("npm run lint")));

const extraJob = docsWorkflowViolations(`${docsSource}\n  code:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hidden-code-ci\n`);
assert.ok(extraJob.some((error) => error.includes("exactly these jobs")));
assert.ok(extraJob.some((error) => error.includes("not allowed")));

const alternateAction = docsWorkflowViolations(
  docsSource.replace("actions/checkout@v4", "example/code-check@v1"),
);
assert.ok(alternateAction.some((error) => error.includes("action is not allowed")));

const dispatch = docsWorkflowViolations(`
name: docs
on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
${DOCS_WORKFLOW_PATH_FILTERS.map((item) => `      - "${item}"`).join("\n")}
  pull_request:
    branches:
      - main
    paths:
${DOCS_WORKFLOW_PATH_FILTERS.map((item) => `      - "${item}"`).join("\n")}
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run docs:ci
`);
assert.ok(dispatch.some((error) => error.includes("workflow_dispatch")));

const pathsIgnore = docsWorkflowViolations(`
name: docs
on:
  push:
    branches:
      - main
    paths:
${DOCS_WORKFLOW_PATH_FILTERS.map((item) => `      - "${item}"`).join("\n")}
    paths-ignore:
      - "src/**"
  pull_request:
    branches:
      - main
    paths:
${DOCS_WORKFLOW_PATH_FILTERS.map((item) => `      - "${item}"`).join("\n")}
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run docs:ci
`);
assert.ok(pathsIgnore.some((error) => error.includes("paths-ignore")));

for (const relative of FORBIDDEN_CI_PATHS) {
  assert.equal(existsSync(path.join(process.cwd(), relative)), false, relative);
}

assert.deepEqual(
  blockingMainRules([
    { type: "creation" },
    { type: "deletion" },
    { type: "required_status_checks" },
    { type: "pull_request" },
    {},
  ]),
  [{ type: "required_status_checks" }, { type: "pull_request" }, {}],
  "unknown and update-constraining active rules must block direct-main policy",
);

const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "github-ci-policy-"));
try {
  mkdirSync(path.join(fixtureRoot, ".github", "workflows"), { recursive: true });
  writeFileSync(path.join(fixtureRoot, ".github", "workflows", "docs.yml"), docsSource);
  writeFileSync(path.join(fixtureRoot, ".github", "workflows", "deploy-main.yml"), deploySource);
  writeFileSync(path.join(fixtureRoot, ".github", "workflows", "local-agent-main.yml"), localAgentSource);
  writeFileSync(path.join(fixtureRoot, ".github", "workflows", "local-agent-workspace.yml"), localAgentWorkspaceSource);
  writeFileSync(path.join(fixtureRoot, ".travis.yml"), "language: node_js\n");
  const extraCi = collectGithubCiPolicyErrors(fixtureRoot);
  assert.ok(extraCi.some((error) => error.includes(".travis.yml")), extraCi.join("\n"));
  writeFileSync(
    path.join(fixtureRoot, ".github", "workflows", "lint.yml"),
    `name: lint
on:
  push:
    branches:
      - main
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
`,
  );
  const extraWorkflow = collectGithubCiPolicyErrors(fixtureRoot);
  assert.ok(
    extraWorkflow.some((error) =>
      error.includes("Only deploy-main.yml, docs.yml, local-agent-main.yml, local-agent-workspace.yml may exist"),
    ),
    extraWorkflow.join("\n"),
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("GitHub CI policy tests passed.");
