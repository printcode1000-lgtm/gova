import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  collectGithubCiPolicyErrors,
  docsWorkflowViolations,
  FORBIDDEN_CI_PATHS,
  verifyGithubCiPolicy,
} from "../github-ci-policy";

const live = verifyGithubCiPolicy();
assert.deepEqual(live, [], live.join("\n"));

const docsSource = readFileSync(path.join(process.cwd(), ".github", "workflows", "docs.yml"), "utf8");
assert.equal(docsWorkflowViolations(docsSource).length, 0);

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
`).includes("Docs workflow must declare paths: docs/** so it never runs for non-docs changes."),
);

const pullRequest = docsWorkflowViolations(`
name: docs
on:
  push:
    branches:
      - main
    paths:
      - "docs/**"
  pull_request:
    branches:
      - main
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run docs:check
`);
assert.ok(pullRequest.some((error) => error.includes("pull_request")));

const codeCi = docsWorkflowViolations(`
name: docs
on:
  push:
    branches:
      - main
    paths:
      - "docs/**"
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
      - run: npm run docs:check
`);
assert.ok(codeCi.some((error) => error.includes("npm run lint")));

const dispatch = docsWorkflowViolations(`
name: docs
on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - "docs/**"
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run docs:check
`);
assert.ok(dispatch.some((error) => error.includes("workflow_dispatch")));

const pathsIgnore = docsWorkflowViolations(`
name: docs
on:
  push:
    branches:
      - main
    paths:
      - "docs/**"
    paths-ignore:
      - "src/**"
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - run: npm run docs:check
`);
assert.ok(pathsIgnore.some((error) => error.includes("paths-ignore")));

for (const relative of FORBIDDEN_CI_PATHS) {
  assert.equal(existsSync(path.join(process.cwd(), relative)), false, relative);
}

const fixtureRoot = mkdtempSync(path.join(os.tmpdir(), "github-ci-policy-"));
try {
  mkdirSync(path.join(fixtureRoot, ".github", "workflows"), { recursive: true });
  writeFileSync(path.join(fixtureRoot, ".github", "workflows", "docs.yml"), docsSource);
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
    extraWorkflow.some((error) => error.includes("Only docs.yml may exist")),
    extraWorkflow.join("\n"),
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("GitHub CI policy tests passed.");
