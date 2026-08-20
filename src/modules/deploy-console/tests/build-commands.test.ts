import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDeployAllCommands,
  buildDeployPushCommands,
  parseLaunchRequest,
} from "../domain/build-commands";
import {
  DEPLOY_ALL_PHASE_ORDER,
  ISOLATED_DEPLOY_TARGETS,
} from "../domain/catalog";

describe("deploy-console command builder", () => {
  it("runs selected deploy-all phases sequentially as separate --phase commands", () => {
    const built = buildDeployAllCommands({
      phases: ["main", "notifications", "publish"],
      flags: ["skipPreflight"],
    });
    assert.deepEqual(built.commands, [
      "npx tsx scripts/deploy-all.ts --skip-preflight --phase=publish",
      "npx tsx scripts/deploy-all.ts --skip-preflight --phase=notifications",
      "npx tsx scripts/deploy-all.ts --skip-preflight --phase=main",
    ]);
  });

  it("rejects empty deploy-all phase selection", () => {
    assert.throws(
      () => buildDeployAllCommands({ phases: [], flags: [] }),
      /deployConsoleNoPhasesSelected/,
    );
  });

  it("builds deploy-push with none / all / subset targets", () => {
    assert.equal(
      buildDeployPushCommands({ targets: [], retryFailed: false }).commands[0],
      "npx tsx scripts/deploy-push.ts --vercel-target=none",
    );
    assert.equal(
      buildDeployPushCommands({
        targets: [...ISOLATED_DEPLOY_TARGETS],
        retryFailed: true,
      }).commands[0],
      "npx tsx scripts/deploy-push.ts --retry-failed --vercel-target=all",
    );
    assert.equal(
      buildDeployPushCommands({
        targets: ["orders", "submain"],
        retryFailed: false,
      }).commands[0],
      "npx tsx scripts/deploy-push.ts --vercel-target=orders,submain",
    );
  });

  it("parses a valid launch body", () => {
    const request = parseLaunchRequest({
      engine: "deploy-all",
      phases: [...DEPLOY_ALL_PHASE_ORDER],
      flags: ["allowEmpty"],
      revision: "abcdef1",
    });
    assert.equal(request.engine, "deploy-all");
    if (request.engine === "deploy-all") {
      assert.equal(request.flags[0], "allowEmpty");
      assert.equal(request.revision, "abcdef1");
    }
  });
});
