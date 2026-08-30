import { runCapture, acquireLock, buildCoordinationSnapshot, CONTROL_BRANCH, declareAgent, heartbeat, listAgents, listLocks, listMessages, LockConflictError, normalizeAgentId, postMessage, publishControlBranch, recoverStaleLocks, releaseAgentLocks, releaseLock, SNAPSHOT_FILE } from "@asol/local-agent-core";
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

/**
 * Publish the snapshot, but only when it actually says something new.
 *
 * Every coordination action republishes, so a working session used to produce
 * dozens of commits on `agent-control` — each one a "recent pushes" banner on the
 * repository, and, until vercel.json was corrected, a build that could only fail
 * because that branch holds one JSON file and no package.json.
 *
 * `generatedAt` changes on every call by definition, so it is excluded from the
 * comparison: a new timestamp over identical state is not news. Everything else
 * — agents, locks, operations, messages — is compared verbatim.
 */
function publishSnapshot(): { published: boolean; branch: string; commit: string | null; error: string | null } {
  const snapshot = buildCoordinationSnapshot();
  const body = `${JSON.stringify(snapshot, null, 2)}\n`;

  // The tracking ref is not updated by publishControlBranch, which pushes a raw
  // commit sha rather than a local branch, so comparing against it without a
  // fetch reads whatever was last pulled — which is how the first attempt at
  // this skipped nothing at all.
  runCapture("git", ["fetch", "--quiet", "origin", `${CONTROL_BRANCH}:refs/remotes/origin/${CONTROL_BRANCH}`], process.cwd());
  const previous = runCapture("git", ["show", `refs/remotes/origin/${CONTROL_BRANCH}:${SNAPSHOT_FILE}`], process.cwd());
  if (previous.status === 0) {
    // Compare the state, not the clock. `generatedAt` moves on every call, and so
    // do the derived elapsed times the snapshot computes for display —
    // `heartbeatAgeMs`, `ageMs`, `durationMs`. None of them is news; publishing
    // for them alone is what filled the branch with commits.
    const VOLATILE = /^(generatedAt|.*[Aa]geMs|durationMs|sampledAt)$/;
    const strip = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(strip);
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !VOLATILE.test(key))
            .map(([key, inner]) => [key, strip(inner)]),
        );
      }
      return value;
    };
    const material = (text: string): string => {
      try {
        return JSON.stringify(strip(JSON.parse(text)));
      } catch {
        return text;
      }
    };
    if (material(previous.stdout) === material(body)) {
      return { published: false, branch: CONTROL_BRANCH, commit: null, error: null };
    }
  }

  // Vercel reads vercel.json from the branch it is building, not from main, so
  // main's ignoreCommand cannot protect this branch. Without a vercel.json of its
  // own, `agent-control` — one JSON file, no package.json — was cloned and built
  // on every publish, and could only fail with "No Next.js version detected".
  // Shipping the refusal inside the branch is the only repository-side fix; the
  // Git integration itself lives in the Vercel dashboard.
  const result = publishControlBranch(
    {
      [SNAPSHOT_FILE]: body,
      "vercel.json": `${JSON.stringify(
        {
          $schema: "https://openapi.vercel.sh/vercel.json",
          ignoreCommand: "exit 0",
        },
        null,
        2,
      )}\n`,
    },
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
        const acquired = acquireLock({
          agentId,
          kind: scopeKind,
          scope,
          runId: process.env.GITHUB_RUN_ID ?? null,
          // This process exits as soon as it has printed. A lock tied to its pid
          // would be stale before the next caller could ever see it, which is
          // how a conversational agent ended up with a lock that protected
          // nothing. Detached locks are judged by their TTL.
          processBound: false,
        });
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

/**
 * Report a refusal as one line, not a stack trace.
 *
 * Every rejection here is a contract the caller broke — a body over the limit, an
 * unsupported kind, a scope that is already held — and the caller is usually
 * another agent parsing this output. A raw stack trace buries the one sentence
 * that says what to do differently, which is exactly what happened when a
 * 520-character message came back as an uncaught exception.
 */
try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`coordination refused: ${message}`);
  process.exit(1);
}
