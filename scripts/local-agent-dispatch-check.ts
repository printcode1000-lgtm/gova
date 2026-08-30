import { readFileSync } from "node:fs";
import { DISPATCHABLE_WORKFLOWS, knownRequestIds, validateDispatchRequest } from "@asol/local-agent-core";
/**
 * Validate a dispatch request document before it is pushed.
 *
 * Same contract the gateway enforces, run locally, so a malformed request fails
 * on the author's machine instead of consuming a runner slot. With no argument
 * it prints the contract itself, which is the fastest way for an agent to learn
 * what a valid request looks like.
 */

function printContract(): void {
  console.log(
    JSON.stringify(
      {
        usage: "npm run local-agent:dispatch:check -- <request.json>",
        requestShape: {
          version: 1,
          requestId: "8-64 chars of [A-Za-z0-9._-]",
          agentId: "3-48 chars of [A-Za-z0-9._-]",
          workflow: Object.keys(DISPATCHABLE_WORKFLOWS),
          mode: "must match the workflow's mode",
          ref: "main",
          inputs: "workflow-specific string map",
          createdAt: "ISO-8601, at most 30 minutes old",
        },
        workflows: DISPATCHABLE_WORKFLOWS,
      },
      null,
      2,
    ),
  );
}

function main(): void {
  const file = process.argv.slice(2).find((item) => !item.startsWith("--"));
  if (!file) {
    printContract();
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`Cannot read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }
  const validation = validateDispatchRequest(parsed, { knownRequestIds: knownRequestIds() });
  if (!validation.valid) {
    console.error(`Dispatch request is invalid: ${file}`);
    for (const error of validation.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ valid: true, request: validation.request }, null, 2));
}

main();
