import { spawnSync } from "node:child_process";

import {
  DIRECT_AUTH_BRANCH,
  DIRECT_AUTH_DIRECTORY,
  ReplayCache,
  SessionStore,
  directAuthResultKey,
  hostIdentifier,
  loadOrCreateHostIdentityKey,
  loadOrRotateDiscoveryChallenge,
  processBootstrapDocument,
  readStoredBootstrapGrant,
  rotateDiscoveryChallenge,
  type DirectAuthRequest,
  type DirectBootstrapGrant,
} from "@asol/local-agent-core/direct";
import {
  createOtaR2Client,
  loadOtaEnvironment,
  putOtaObject,
} from "@asol/ota-core/publishing";

function git(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8" });
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
  return documents;
}

async function publishGrant(grant: DirectBootstrapGrant): Promise<void> {
  loadOtaEnvironment();
  await putOtaObject(
    createOtaR2Client(),
    directAuthResultKey(grant.hostId, grant.requestId),
    `${JSON.stringify(grant, null, 2)}\n`,
    "application/json",
    "no-store",
  );
}

async function cycle(): Promise<number> {
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
      await publishGrant(stored);
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
    try { await cycle(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); }
    if (once) return;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  } while (true);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
