import { CONTROL_BRANCH, SNAPSHOT_FILE, publishControlBranch } from "./local-agent/control-branch";
import { buildCoordinationSnapshot } from "./local-agent/coordination-snapshot";
import { declareAgent } from "./local-agent/agent-registry";
import { DISPATCHABLE_WORKFLOWS, validateDispatchRequest } from "./local-agent/request-contract";
import { dispatchWorkflow, hasGithubToken } from "./local-agent/github-api";
import { gitSoft, runCapture } from "./local-agent/git";
import { knownRequestIds, recordFromRequest, recordRequest } from "./local-agent/request-store";
import { workspaceDir } from "./local-agent/paths";

/**
 * The dispatch gateway.
 *
 * A cloud agent that cannot reach the `workflow_dispatch` API still has git: it
 * pushes a request document on an `agent-request/*` branch, and this job — which
 * runs on the local pool — validates that document and performs the real
 * dispatch using a credential that never leaves this machine.
 *
 *   cloud agent -> git push -> gateway (local runner) -> workflow_dispatch -> local runner
 *
 * The request branch is deleted once processed, so the channel leaves no
 * long-lived refs behind and never touches `main`.
 */

export const REQUEST_DIRECTORY = ".agent-control/requests";

interface ProcessedRequest {
  file: string;
  requestId: string | null;
  outcome: string;
  errors: string[];
}

function requestBranch(): string {
  const explicit = process.env.LOCAL_AGENT_REQUEST_BRANCH?.trim();
  if (explicit) return explicit;
  const refName = process.env.GITHUB_REF_NAME?.trim();
  if (!refName) throw new Error("LOCAL_AGENT_REQUEST_BRANCH or GITHUB_REF_NAME is required.");
  return refName;
}

async function main(): Promise<void> {
  const root = workspaceDir();
  const branch = requestBranch();
  if (!branch.startsWith("agent-request/")) {
    throw new Error(`Gateway only accepts agent-request/* branches. Received: ${branch}`);
  }

  const fetched = runCapture("git", ["fetch", "--force", "origin", `${branch}:refs/gova-gateway/${branch}`], root);
  if (fetched.status !== 0) throw new Error(`Unable to fetch ${branch}: ${fetched.stderr}`);
  const ref = `refs/gova-gateway/${branch}`;

  const files = gitSoft(["ls-tree", "-r", "--name-only", ref, "--", REQUEST_DIRECTORY], root)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.endsWith(".json"));

  if (files.length === 0) throw new Error(`No request documents under ${REQUEST_DIRECTORY} on ${branch}.`);
  if (!hasGithubToken()) throw new Error("No local GitHub token available; the gateway cannot dispatch.");

  const processed: ProcessedRequest[] = [];
  let failures = 0;

  for (const file of files) {
    const raw = gitSoft(["show", `${ref}:${file}`], root);
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      processed.push({ file, requestId: null, outcome: "rejected", errors: ["Request file is not valid JSON."] });
      failures += 1;
      continue;
    }

    const validation = validateDispatchRequest(parsed, { knownRequestIds: knownRequestIds() });
    if (!validation.valid || !validation.request) {
      const candidateId =
        parsed && typeof parsed === "object" && typeof (parsed as { requestId?: unknown }).requestId === "string"
          ? (parsed as { requestId: string }).requestId
          : null;
      if (candidateId && /^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/.test(candidateId) && !knownRequestIds().has(candidateId)) {
        recordRequest({
          requestId: candidateId,
          agentId: "unknown",
          workflow: "unknown",
          mode: "unknown",
          ref: "main",
          inputKeys: [],
          createdAt: new Date().toISOString(),
          outcome: "rejected",
          errors: validation.errors,
          gatewayRunId: process.env.GITHUB_RUN_ID ?? null,
        });
      }
      processed.push({ file, requestId: candidateId, outcome: "rejected", errors: validation.errors });
      failures += 1;
      continue;
    }

    const request = validation.request;
    const contract = DISPATCHABLE_WORKFLOWS[request.workflow];
    const inputs: Record<string, string> = { ...request.inputs };
    if (contract.mode !== "status") inputs.request_id = request.requestId;

    declareAgent({
      agentId: request.agentId,
      origin: "cloud",
      status: "dispatching",
      task: `${request.workflow} via gateway`,
    });

    // Claim the id before dispatching so a replayed push cannot double-execute.
    recordFromRequest(request, "accepted", { gatewayRunId: process.env.GITHUB_RUN_ID ?? null });
    const dispatched = await dispatchWorkflow(contract.file, request.ref, inputs);
    recordFromRequest(request, dispatched.ok ? "dispatched" : "failed", {
      errors: dispatched.error ? [dispatched.error] : [],
      gatewayRunId: process.env.GITHUB_RUN_ID ?? null,
    });
    if (!dispatched.ok) failures += 1;
    processed.push({
      file,
      requestId: request.requestId,
      outcome: dispatched.ok ? "dispatched" : "failed",
      errors: dispatched.error ? [dispatched.error] : [],
    });
  }

  const snapshot = buildCoordinationSnapshot();
  const published = publishControlBranch(
    { [SNAPSHOT_FILE]: `${JSON.stringify(snapshot, null, 2)}\n` },
    `chore(agent-control): gateway snapshot ${snapshot.generatedAt}`,
  );

  gitSoft(["update-ref", "-d", ref], root);
  const deleted = runCapture("git", ["push", "origin", "--delete", branch], root);

  console.log(
    JSON.stringify(
      {
        branch,
        processed,
        controlBranch: { name: CONTROL_BRANCH, published: published.published, error: published.error },
        requestBranchDeleted: deleted.status === 0,
      },
      null,
      2,
    ),
  );

  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
