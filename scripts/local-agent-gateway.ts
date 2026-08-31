import {
  declareAgent,
  DISPATCHABLE_WORKFLOWS,
  dispatchWorkflow,
  gitSoft,
  hasGithubToken,
  knownRequestIds,
  recordFromRequest,
  recordRequest,
  runCapture,
  validateDispatchRequest,
  workspaceDir,
} from "@asol/local-agent-core";

/**
 * Persistent dispatch gateway for the permanent ChatGPT branch.
 *
 * A cloud agent with Git contents access but without workflow_dispatch access can
 * write a validated request document to `agent-request/chatgpt`. The local runner
 * turns that request into the real workflow dispatch using credentials that never
 * leave the host.
 *
 * The permanent branch is never deleted, and the gateway never creates or
 * publishes another remote ref. Processed request ids are kept in machine-local
 * coordination state; retained request files are therefore harmless on later
 * pushes and are skipped as already processed.
 */

export const REQUEST_DIRECTORY = ".agent-control/requests";
export const PERSISTENT_REQUEST_BRANCH = "agent-request/chatgpt";

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

function candidateRequestId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const value = (parsed as { requestId?: unknown }).requestId;
  return typeof value === "string" ? value : null;
}

async function main(): Promise<void> {
  const root = workspaceDir();
  const branch = requestBranch();
  if (branch !== PERSISTENT_REQUEST_BRANCH) {
    throw new Error(`Gateway only accepts ${PERSISTENT_REQUEST_BRANCH}. Received: ${branch}`);
  }

  const ref = "refs/gova-gateway/chatgpt";
  const fetched = runCapture("git", ["fetch", "--force", "origin", `${branch}:${ref}`], root);
  if (fetched.status !== 0) throw new Error(`Unable to fetch ${branch}: ${fetched.stderr}`);

  try {
    const files = gitSoft(["ls-tree", "-r", "--name-only", ref, "--", REQUEST_DIRECTORY], root)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.endsWith(".json"));

    if (files.length === 0) {
      console.log(JSON.stringify({ branch, processed: [], message: "No request documents; nothing to dispatch." }, null, 2));
      return;
    }
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

      const candidateId = candidateRequestId(parsed);
      if (candidateId && knownRequestIds().has(candidateId)) {
        processed.push({ file, requestId: candidateId, outcome: "already-processed", errors: [] });
        continue;
      }

      const validation = validateDispatchRequest(parsed, { knownRequestIds: knownRequestIds() });
      if (!validation.valid || !validation.request) {
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

    console.log(JSON.stringify({ branch, persistentBranch: true, processed }, null, 2));
    if (failures > 0) process.exitCode = 1;
  } finally {
    gitSoft(["update-ref", "-d", ref], root);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
