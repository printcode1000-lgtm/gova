import assert from "node:assert/strict";

import {
  parseDeploymentReport,
} from "../lib/run-deployment-npm-script";

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

console.log("run-deployment-npm-script tests passed.");
