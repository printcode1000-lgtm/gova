import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Expected production identity for `npm run release:check`.
 *
 * The marker must come from the target git revision, never from a later local
 * `build:static` / Android copy of `public/asol-web-manifest.json`. Those files
 * are rewritten on every static export; comparing them to production after a
 * verification-only rebuild falsely fails a main-phase retry.
 */

export const RELEASE_WEB_MANIFEST_GIT_PATH = "public/asol-web-manifest.json";
const DEPLOY_ALL_STATE = path.join(process.cwd(), ".deploy-all", "run-state.json");

export interface DeployedReleaseMarker {
  readonly createdAt: string;
  readonly releaseId?: string;
  readonly revision: string;
}

export function parseDeployedReleaseMarker(
  source: string,
  revision: string,
): DeployedReleaseMarker {
  let parsed: { createdAt?: unknown; releaseId?: unknown };
  try {
    parsed = JSON.parse(source) as { createdAt?: unknown; releaseId?: unknown };
  } catch {
    throw new Error(
      `Target revision ${revision} does not contain a JSON web manifest at ${RELEASE_WEB_MANIFEST_GIT_PATH}.`,
    );
  }
  if (typeof parsed.createdAt !== "string" || parsed.createdAt.trim() === "") {
    throw new Error(
      `Target revision ${revision} is missing createdAt in ${RELEASE_WEB_MANIFEST_GIT_PATH}.`,
    );
  }
  return {
    createdAt: parsed.createdAt,
    releaseId: typeof parsed.releaseId === "string" ? parsed.releaseId : undefined,
    revision,
  };
}

export function resolveExpectedReleaseRevision(
  env: NodeJS.ProcessEnv = process.env,
  statePath = DEPLOY_ALL_STATE,
): string {
  const fromEnv = env.ASOL_RELEASE_REVISION?.trim();
  if (fromEnv) return fromEnv;
  if (existsSync(statePath)) {
    let state: { revision?: unknown };
    try {
      state = JSON.parse(readFileSync(statePath, "utf8")) as { revision?: unknown };
    } catch (error) {
      throw new Error(
        `Deploy run state at ${statePath} is not JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (typeof state.revision === "string" && state.revision.trim()) {
      return state.revision.trim();
    }
  }
  return "HEAD";
}

export function readCommittedWebManifest(
  revision: string,
  gitShow: (rev: string, gitPath: string) => string = defaultGitShow,
): string {
  return gitShow(revision, RELEASE_WEB_MANIFEST_GIT_PATH);
}

export function expectedDeployedReleaseMarker(
  env: NodeJS.ProcessEnv = process.env,
  gitShow: (rev: string, gitPath: string) => string = defaultGitShow,
  statePath = DEPLOY_ALL_STATE,
): DeployedReleaseMarker {
  const revision = resolveExpectedReleaseRevision(env, statePath);
  return parseDeployedReleaseMarker(readCommittedWebManifest(revision, gitShow), revision);
}

function defaultGitShow(revision: string, gitPath: string): string {
  const result = spawnSync("git", ["show", `${revision}:${gitPath}`], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim() || `exit ${result.status}`;
    throw new Error(
      `Cannot read ${gitPath} from git revision ${revision}: ${detail}`,
    );
  }
  return result.stdout;
}
