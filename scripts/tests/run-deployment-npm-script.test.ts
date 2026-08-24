import assert from "node:assert/strict";

import {
  childProcessEnvForDeployment,
  parseDeploymentReport,
} from "@asol/release-core";

const sampleReport = {
  target: "notifications",
  account: "team-1",
  project: "proj-1",
  comment: "deploy(notifications): test",
  state: "READY",
  url: "notifications.example.vercel.app",
  message: "Deployment is READY",
};

const json = JSON.stringify(sampleReport);

assert.deepEqual(
  parseDeploymentReport(`[ASOL_DEPLOY_REPORT] ${json}\n`),
  sampleReport,
);

assert.deepEqual(
  parseDeploymentReport(
    `Debugger attached.\n[ASOL_DEPLOY_REPORT] ${json}\n`,
  ),
  sampleReport,
);

assert.deepEqual(
  parseDeploymentReport(`noise on stderr\n[ASOL_DEPLOY_REPORT] ${json}`),
  sampleReport,
);

const older = { ...sampleReport, state: "ERROR", message: "failed" };
assert.deepEqual(
  parseDeploymentReport(
    `[ASOL_DEPLOY_REPORT] ${JSON.stringify(older)}\n[ASOL_DEPLOY_REPORT] ${json}`,
  ),
  sampleReport,
);

assert.equal(parseDeploymentReport("no report here"), undefined);

const priorEnv = {
  npm_config_phase: process.env.npm_config_phase,
  npm_config_from_phase: process.env.npm_config_from_phase,
  npm_config_revision: process.env.npm_config_revision,
  npm_config_runbook_branches: process.env.npm_config_runbook_branches,
  npm_config_list_phases: process.env.npm_config_list_phases,
};
try {
  process.env.npm_config_phase = "preflight";
  process.env.npm_config_from_phase = "preflight";
  process.env.npm_config_revision = "abc123";
  process.env.npm_config_runbook_branches = "tests";
  process.env.npm_config_list_phases = "true";
  const childEnv = childProcessEnvForDeployment({ ASOL_TEST_OVERLAY: "kept" });
  assert.equal(childEnv.npm_config_phase, undefined);
  assert.equal(childEnv.npm_config_from_phase, undefined);
  assert.equal(childEnv.npm_config_revision, undefined);
  assert.equal(childEnv.npm_config_runbook_branches, undefined);
  assert.equal(childEnv.npm_config_list_phases, undefined);
  assert.equal(childEnv.ASOL_TEST_OVERLAY, "kept");
} finally {
  for (const [key, value] of Object.entries(priorEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log("run-deployment-npm-script tests passed.");
