import { spawn, type ChildProcess } from "node:child_process";

import type { VercelDeploymentReport } from "@asol/vercel-deploy-core";

const REPORT_MARKER = "[ASOL_DEPLOY_REPORT] ";

/** Strip debugger hooks so nested npm/tsx children do not lose piped stdout. */
export function childProcessEnvForDeployment(
  overlay: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const env = { ...process.env, ...overlay };
  delete env.NODE_OPTIONS;
  delete env.VSCODE_INSPECTOR_OPTIONS;
  delete env.VSCODE_NODE_CWD;
  return env;
}

export function parseDeploymentReport(output: string): VercelDeploymentReport | undefined {
  let searchEnd = output.length;
  while (searchEnd > 0) {
    const markerIndex = output.lastIndexOf(REPORT_MARKER, searchEnd - 1);
    if (markerIndex < 0) return undefined;

    const jsonStart = markerIndex + REPORT_MARKER.length;
    const newlineIndex = output.indexOf("\n", jsonStart);
    const jsonText = output
      .slice(jsonStart, newlineIndex >= 0 ? newlineIndex : undefined)
      .trim();

    try {
      return JSON.parse(jsonText) as VercelDeploymentReport;
    } catch {
      searchEnd = markerIndex;
    }
  }
  return undefined;
}

export class DeploymentNpmScriptError extends Error {
  constructor(message: string, readonly report?: VercelDeploymentReport) {
    super(message);
  }
}

export async function runDeploymentNpmScript(
  script: string,
  options: {
    logPrefix: string;
    env?: Record<string, string>;
    captureReport?: boolean;
  },
): Promise<VercelDeploymentReport | undefined> {
  const npmCli = process.env.npm_execpath;
  const command = npmCli
    ? process.execPath
    : process.platform === "win32"
      ? "npm.cmd"
      : "npm";
  const args = npmCli ? [npmCli, "run", script] : ["run", script];
  const capture = options.captureReport === true;
  const logPrefix = options.logPrefix;

  console.log(`\n[${logPrefix}] Starting ${script}...`);

  const child: ChildProcess = spawn(command, args, {
    cwd: process.cwd(),
    env: childProcessEnvForDeployment(options.env),
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: false,
    windowsHide: true,
  });

  if (!capture) {
    return new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (code === 0) {
          console.log(`[${logPrefix}] Completed ${script}.`);
          resolve(undefined);
          return;
        }
        reject(
          new DeploymentNpmScriptError(
            `${script} failed${signal ? ` with signal ${signal}` : ` with exit code ${code ?? "unknown"}`}.`,
          ),
        );
      });
    });
  }

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;
  let exitSignal: NodeJS.Signals | null = null;
  let stdoutClosed = !child.stdout;
  let stderrClosed = !child.stderr;

  return new Promise((resolve, reject) => {
    const tryFinalize = (): void => {
      if (exitCode === null || !stdoutClosed || !stderrClosed) return;

      const combined = stdout + stderr;
      const report = parseDeploymentReport(combined);
      if (exitCode === 0 && report?.state === "READY") {
        console.log(`[${logPrefix}] Completed ${script}.`);
        resolve(report);
        return;
      }

      reject(
        new DeploymentNpmScriptError(
          `${script} failed${exitSignal ? ` with signal ${exitSignal}` : ` with exit code ${exitCode}`}${!report ? "; no verified Vercel report was returned" : report.state !== "READY" ? `; deployment state is ${report.state}` : ""}.`,
          report,
        ),
      );
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stdout?.once("end", () => {
      stdoutClosed = true;
      tryFinalize();
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.stderr?.once("end", () => {
      stderrClosed = true;
      tryFinalize();
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      exitCode = code ?? 1;
      exitSignal = signal;
      tryFinalize();
    });
  });
}
