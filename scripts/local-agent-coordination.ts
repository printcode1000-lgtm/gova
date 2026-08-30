import { acquireLock, buildCoordinationSnapshot, CONTROL_BRANCH, declareAgent, heartbeat, listAgents, listLocks, listMessages, LockConflictError, normalizeAgentId, postMessage, publishControlBranch, recoverStaleLocks, releaseAgentLocks, releaseLock, SNAPSHOT_FILE } from "@asol/local-agent-core";
/**
 * The coordination command surface shared by cloud and local agents.
 *
 * Every action is available two ways: as CLI arguments for a developer at this
 * machine, and as environment variables for the dispatched workflow. Both land
 * in the same coordination directory, which is what makes a cloud agent and a
 * local agent genuinely peers rather than two disconnected systems.
 */

const ACTIONS = [
  "declare",
  "heartbeat",
  "lock",
  "unlock",
  "release-all",
  "recover-stale-locks",
  "message",
  "status",
  "publish",
] as const;

type Action = (typeof ACTIONS)[number];

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return match?.slice(prefix.length);
}

function input(argName: string, envName: string, fallback = ""): string {
  return (argValue(argName) ?? process.env[envName] ?? fallback).trim();
}

function isAction(value: string): value is Action {
  return (ACTIONS as readonly string[]).includes(value);
}

function emit(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function publishSnapshot(): { published: boolean; branch: string; commit: string | null; error: string | null } {
  const snapshot = buildCoordinationSnapshot();
  const result = publishControlBranch(
    { [SNAPSHOT_FILE]: `${JSON.stringify(snapshot, null, 2)}\n` },
    `chore(agent-control): coordination snapshot ${snapshot.generatedAt}`,
  );
  return { published: result.published, branch: CONTROL_BRANCH, commit: result.commit, error: result.error };
}

function main(): void {
  const action = input("action", "LOCAL_AGENT_COORDINATION_ACTION", "status");
  if (!isAction(action)) {
    console.error(`Unsupported coordination action: ${action}. Allowed: ${ACTIONS.join(", ")}.`);
    process.exit(1);
  }

  const agentId = normalizeAgentId(input("agent-id", "LOCAL_AGENT_ID", "agent"));
  const scope = input("scope", "LOCAL_AGENT_SCOPE");
  const scopeKindRaw = input("scope-kind", "LOCAL_AGENT_SCOPE_KIND", "path");
  const scopeKind = scopeKindRaw === "module" || scopeKindRaw === "ref" ? scopeKindRaw : "path";
  const publishRequested = input("publish", "LOCAL_AGENT_COORDINATION_PUBLISH", "0") !== "0";

  let result: Record<string, unknown>;

  switch (action) {
    case "declare": {
      result = {
        action,
        agent: declareAgent({
          agentId,
          origin: input("origin", "LOCAL_AGENT_ORIGIN", "cloud"),
          task: input("task", "LOCAL_AGENT_TASK"),
          scopes: input("scopes", "LOCAL_AGENT_SCOPES")
            .split(/\r?\n|,/)
            .map((item) => item.trim())
            .filter(Boolean),
          branch: input("branch", "LOCAL_AGENT_BRANCH") || null,
          status: input("status", "LOCAL_AGENT_STATUS_LABEL", "active"),
          runId: process.env.GITHUB_RUN_ID ?? null,
        }),
      };
      break;
    }
    case "heartbeat": {
      result = { action, agent: heartbeat(agentId, input("status", "LOCAL_AGENT_STATUS_LABEL") || undefined) };
      break;
    }
    case "lock": {
      if (!scope) {
        console.error("A lock needs --scope (or LOCAL_AGENT_SCOPE).");
        process.exit(1);
      }
      try {
        const acquired = acquireLock({ agentId, kind: scopeKind, scope, runId: process.env.GITHUB_RUN_ID ?? null });
        result = { action, acquired: true, ...acquired };
      } catch (error) {
        if (error instanceof LockConflictError) {
          emit({ action, acquired: false, reason: "conflict", message: error.message, holder: error.holder });
          process.exit(1);
        }
        throw error;
      }
      break;
    }
    case "unlock": {
      if (!scope) {
        console.error("An unlock needs --scope (or LOCAL_AGENT_SCOPE).");
        process.exit(1);
      }
      result = { action, released: releaseLock(agentId, scopeKind, scope) };
      break;
    }
    case "release-all": {
      result = { action, released: releaseAgentLocks(agentId) };
      break;
    }
    case "recover-stale-locks": {
      result = { action, recovered: recoverStaleLocks() };
      break;
    }
    case "message": {
      const body = input("body", "LOCAL_AGENT_MESSAGE_BODY");
      const kind = input("kind", "LOCAL_AGENT_MESSAGE_KIND", "note");
      const to = input("to", "LOCAL_AGENT_MESSAGE_TO", "all");
      result = { action, message: postMessage({ from: agentId, to, kind, body, scope: scope || null }) };
      break;
    }
    case "status": {
      result = {
        action,
        agents: listAgents(),
        locks: listLocks(),
        messages: listMessages({ to: input("to", "LOCAL_AGENT_MESSAGE_TO") || undefined, limit: 50 }),
      };
      break;
    }
    case "publish": {
      result = { action, ...publishSnapshot() };
      break;
    }
  }

  if (publishRequested && action !== "publish") result.publish = publishSnapshot();
  emit(result);
}

main();
