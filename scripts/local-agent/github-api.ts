import { readFileSync } from "node:fs";
import path from "node:path";

import { workspaceDir } from "./paths";

/**
 * Read and dispatch access to the repository's GitHub Actions surface.
 *
 * The token is resolved from the machine, never from a GitHub secret: the
 * runners execute as the machine user precisely so local credentials stay local
 * and never have to travel through workflow inputs or logs. Token values are
 * never returned, printed, or logged — only whether one was found.
 */

export const REPOSITORY_OWNER = "printcode1000-lgtm";
export const REPOSITORY_NAME = "gova";
const API_ROOT = `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`;

const TOKEN_ENV_NAMES = ["GOVA_LOCAL_DISPATCH_TOKEN", "GITHUB_ADMIN_TOKEN", "GOVA_RUNNER_STATUS_TOKEN"] as const;

function tokenFromEnvFile(): string | null {
  for (const fileName of [".env.local", ".env"]) {
    let contents: string;
    try {
      contents = readFileSync(path.join(workspaceDir(), fileName), "utf8");
    } catch {
      continue;
    }
    for (const name of TOKEN_ENV_NAMES) {
      const match = new RegExp(`^${name}=(.+)$`, "m").exec(contents);
      const value = match?.[1]?.trim().replace(/^["']|["']$/g, "");
      if (value) return value;
    }
  }
  return null;
}

export function resolveGithubToken(): string | null {
  for (const name of TOKEN_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return tokenFromEnvFile();
}

export function hasGithubToken(): boolean {
  return resolveGithubToken() !== null;
}

async function request(
  method: "GET" | "POST",
  url: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; json: unknown; error?: string }> {
  const token = resolveGithubToken();
  if (!token) return { ok: false, status: 0, json: null, error: "No local GitHub token available." };
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gova-local-agent-control-plane",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return { ok: true, status: 204, json: null };
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const message =
      json && typeof json === "object" && "message" in json ? String((json as { message: unknown }).message) : "";
    return { ok: false, status: response.status, json, error: `${response.status} ${response.statusText} ${message}`.trim() };
  }
  return { ok: true, status: response.status, json };
}

export interface RunnerSummary {
  name: string;
  status: string;
  busy: boolean;
  labels: string[];
}

export async function listRunners(): Promise<{ runners: RunnerSummary[]; error: string | null }> {
  const result = await request("GET", `${API_ROOT}/actions/runners?per_page=100`);
  if (!result.ok) return { runners: [], error: result.error ?? "unknown error" };
  const payload = result.json as { runners?: unknown };
  if (!Array.isArray(payload?.runners)) return { runners: [], error: "unexpected payload" };
  return {
    runners: payload.runners.map((entry) => {
      const runner = entry as { name?: string; status?: string; busy?: boolean; labels?: Array<{ name?: string }> };
      return {
        name: runner.name ?? "",
        status: runner.status ?? "",
        busy: Boolean(runner.busy),
        labels: (runner.labels ?? []).map((label) => label.name ?? "").filter(Boolean),
      };
    }),
    error: null,
  };
}

export interface RunSummary {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  headSha: string;
  event: string;
  createdAt: string;
  url: string;
}

export async function listRuns(perPage = 10): Promise<{ runs: RunSummary[]; error: string | null }> {
  const result = await request("GET", `${API_ROOT}/actions/runs?per_page=${perPage}`);
  if (!result.ok) return { runs: [], error: result.error ?? "unknown error" };
  const payload = result.json as { workflow_runs?: unknown };
  if (!Array.isArray(payload?.workflow_runs)) return { runs: [], error: "unexpected payload" };
  return {
    runs: payload.workflow_runs.map((entry) => {
      const run = entry as Record<string, unknown>;
      return {
        id: Number(run.id ?? 0),
        name: String(run.name ?? ""),
        status: String(run.status ?? ""),
        conclusion: run.conclusion === null || run.conclusion === undefined ? null : String(run.conclusion),
        headSha: String(run.head_sha ?? ""),
        event: String(run.event ?? ""),
        createdAt: String(run.created_at ?? ""),
        url: String(run.html_url ?? ""),
      };
    }),
    error: null,
  };
}

/** Trigger a real `workflow_dispatch` for one workflow file. */
export async function dispatchWorkflow(
  workflowFile: string,
  ref: string,
  inputs: Record<string, string>,
): Promise<{ ok: boolean; error: string | null }> {
  const result = await request("POST", `${API_ROOT}/actions/workflows/${workflowFile}/dispatches`, { ref, inputs });
  return { ok: result.ok, error: result.ok ? null : (result.error ?? "unknown error") };
}

export async function workflowExists(workflowFile: string): Promise<boolean> {
  const result = await request("GET", `${API_ROOT}/actions/workflows/${workflowFile}`);
  return result.ok;
}
