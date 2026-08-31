import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  DIRECT_AUTH_BRANCH,
  DIRECT_AUTH_DIRECTORY,
  DIRECT_AUTH_RESULT_DIRECTORY,
  ReplayCache,
  SessionStore,
  hostIdentifier,
  loadOrCreateHostIdentityKey,
  loadOrRotateDiscoveryChallenge,
  processBootstrapDocument,
  readStoredBootstrapGrant,
  rotateDiscoveryChallenge,
  type DirectAuthRequest,
  type DirectBootstrapGrant,
} from "@asol/local-agent-core/direct";

function git(args: string[], env: NodeJS.ProcessEnv = process.env, input?: string): string {
  const result = spawnSync("git", args, { encoding: "utf8", env, input });
  if (result.status !== 0) throw new Error((result.stderr || result.stdout || `git ${args.join(" ")} failed`).trim());
  return result.stdout;
}

function remoteAuthDocuments(): Array<{ path: string; document: unknown }> {
  git(["fetch", "--quiet", "origin", DIRECT_AUTH_BRANCH]);
  const ref = `origin/${DIRECT_AUTH_BRANCH}`;
  const names = git(["ls-tree", "-r", "--name-only", ref, "--", DIRECT_AUTH_DIRECTORY])
    .split("\n")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${DIRECT_AUTH_DIRECTORY}/`) && value.endsWith(".json"));
  const documents: Array<{ path: string; document: unknown }> = [];
  for (const file of names) {
    try {
      documents.push({ path: file, document: JSON.parse(git(["show", `${ref}:${file}`])) });
    } catch (error) {
      console.error(JSON.stringify({ bootstrap: "rejected-json", file, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  return documents.sort((a, b) => {
    const aDoc = a.document as Partial<DirectAuthRequest>;
    const bDoc = b.document as Partial<DirectAuthRequest>;
    const aTime = typeof aDoc.createdAt === "string" ? Date.parse(aDoc.createdAt) : 0;
    const bTime = typeof bDoc.createdAt === "string" ? Date.parse(bDoc.createdAt) : 0;
    if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
    return String(bDoc.requestId ?? b.path).localeCompare(String(aDoc.requestId ?? a.path));
  });
}

function resultPath(requestId: string): string {
  return `${DIRECT_AUTH_RESULT_DIRECTORY}/${requestId}.json`;
}

function remoteGrantMatches(grant: DirectBootstrapGrant): boolean {
  git(["fetch", "--quiet", "origin", DIRECT_AUTH_BRANCH]);
  const shown = spawnSync("git", ["show", `origin/${DIRECT_AUTH_BRANCH}:${resultPath(grant.requestId)}`], { encoding: "utf8" });
  if (shown.status !== 0) return false;
  try {
    const current = JSON.parse(shown.stdout) as DirectBootstrapGrant;
    return current.sessionId === grant.sessionId && current.signature === grant.signature;
  } catch {
    return false;
  }
}

async function publishGrant(grant: DirectBootstrapGrant): Promise<void> {
  if (remoteGrantMatches(grant)) return;
  const body = `${JSON.stringify(grant, null, 2)}\n`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    git(["fetch", "--quiet", "origin", DIRECT_AUTH_BRANCH]);
    const base = git(["rev-parse", `origin/${DIRECT_AUTH_BRANCH}`]).trim();
    const index = path.join(tmpdir(), `gova-direct-grant-${process.pid}-${Date.now()}-${attempt}`);
    const env = {
      ...process.env,
      GIT_INDEX_FILE: index,
      GIT_AUTHOR_NAME: "gova-direct-host",
      GIT_AUTHOR_EMAIL: "gova-direct-host@users.noreply.github.com",
      GIT_COMMITTER_NAME: "gova-direct-host",
      GIT_COMMITTER_EMAIL: "gova-direct-host@users.noreply.github.com",
    };
    try {
      git(["read-tree", `${base}^{tree}`], env);
      const blob = git(["hash-object", "-w", "--stdin"], env, body).trim();
      git(["update-index", "--add", "--cacheinfo", "100644", blob, resultPath(grant.requestId)], env);
      const tree = git(["write-tree"], env).trim();
      const commit = git(["commit-tree", tree, "-p", base, "-m", `Direct grant ${grant.requestId}`], env).trim();
      const pushed = spawnSync("git", ["push", "--quiet", "origin", `${commit}:refs/heads/${DIRECT_AUTH_BRANCH}`], {
        encoding: "utf8",
        env,
      });
      if (pushed.status === 0) return;
      if (attempt === 3) throw new Error((pushed.stderr || pushed.stdout || "grant push failed").trim());
    } finally {
      if (existsSync(index)) rmSync(index, { force: true });
    }
  }
}

export async function runDirectBootstrapCycle(): Promise<number> {
  const hostId = hostIdentifier();
  const identity = loadOrCreateHostIdentityKey();
  const replayCache = new ReplayCache();
  const sessionStore = new SessionStore();
  let granted = 0;

  for (const entry of remoteAuthDocuments()) {
    const requestId = (entry.document as Partial<DirectAuthRequest>)?.requestId;
    if (typeof requestId !== "string") continue;

    const stored = readStoredBootstrapGrant(requestId);
    if (stored && Date.parse(stored.expiresAt) > Date.now()) {
      if (!remoteGrantMatches(stored)) await publishGrant(stored);
      continue;
    }
    if (replayCache.hasConsumed(requestId)) continue;

    const challenge = loadOrRotateDiscoveryChallenge();
    const result = processBootstrapDocument(entry.document, {
      currentChallenge: challenge.challenge,
      hostId,
      replayCache,
      sessionStore,
      hostIdentity: identity,
      allowedAgentIds: ["chatgpt", "chatgpt-sol"],
    });
    if (!result.valid || !result.grant) {
      console.error(JSON.stringify({ bootstrap: "rejected", requestId, errors: result.errors }));
      continue;
    }
    await publishGrant(result.grant);
    rotateDiscoveryChallenge();
    granted += 1;
    console.log(JSON.stringify({ bootstrap: "granted", requestId, sessionId: result.grant.sessionId, expiresAt: result.grant.expiresAt }));
  }
  return granted;
}

async function main(): Promise<void> {
  const once = process.argv.includes("--once");
  const pollArg = process.argv.find((value) => value.startsWith("--poll-ms="));
  const pollMs = Math.max(1000, Number(pollArg?.split("=")[1] ?? 5000));
  do {
    try { await runDirectBootstrapCycle(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); }
    if (once) return;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (true);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
