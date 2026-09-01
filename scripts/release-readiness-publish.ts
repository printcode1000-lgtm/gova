import {
  type ReleaseComponentResult,
  type ReleaseWorkload,
  type VercelDeploymentReport,
  RELEASE_WORKLOADS,
} from "@asol/vercel-deploy-core";

/**
 * Publishing exact-SHA release readiness to the control plane.
 *
 * The GitHub-linked gova build is blocked on this state: `build:vercel` waits
 * for `ready` before it produces a publishable frontend artifact. Every release
 * path that deploys control plus the six workloads for a SHA must publish it
 * through this one door, otherwise the gova build waits until it times out and
 * the release can never publish.
 */

export type ReleaseReadinessCommand = "deploy:all" | "deploy:revision" | "deploy:push";

/** A deployment report becomes the component evidence the release state stores. */
export function releaseComponentFromReport(
  report: VercelDeploymentReport,
): ReleaseComponentResult {
  if (report.state !== "READY") {
    return {
      status: "failed",
      smokeStatus: "failed",
      deploymentId: report.deploymentId,
      url: report.url,
      failure: report.message,
      evidence: `${report.target} deployment was ${report.state}`,
    };
  }
  return {
    status: "passed",
    smokeStatus: "passed",
    deploymentId: report.deploymentId,
    url: report.url,
    evidence: `${report.target} deployment READY: ${report.message}`,
  };
}

export function controlReleaseOrigin(): string {
  const value = process.env.NEXT_PUBLIC_ASOL_CONTROL_URL?.trim().replace(/\/$/, "");
  if (!value) {
    throw new Error("NEXT_PUBLIC_ASOL_CONTROL_URL is required to publish release readiness.");
  }
  return value;
}

function componentByTarget(
  reports: readonly VercelDeploymentReport[],
  target: string,
): ReleaseComponentResult {
  const report = reports.find((candidate) => candidate.target === target);
  if (!report) throw new Error(`Missing Vercel deployment report for ${target}.`);
  if (report.state !== "READY") throw new Error(`${target} is ${report.state}: ${report.message}`);
  return releaseComponentFromReport(report);
}

export async function publishReleaseReadiness(input: {
  readonly revision: string;
  readonly runId: string;
  readonly timestamp: string;
  readonly command: ReleaseReadinessCommand;
  readonly sandboxName: string;
  readonly initiatedByUid: string;
  readonly logTail: string;
  readonly logPrefix: string;
  /** Must contain one READY report for control and for each of the six workloads. */
  readonly reports: readonly VercelDeploymentReport[];
}): Promise<void> {
  const callbackSecret = process.env.ASOL_DEPLOY_CALLBACK_SECRET?.trim();
  if (!callbackSecret) {
    throw new Error("ASOL_DEPLOY_CALLBACK_SECRET is required to publish release readiness.");
  }

  const control = componentByTarget(input.reports, "control");
  const workloads = Object.fromEntries(
    RELEASE_WORKLOADS.map((workload) => [workload, componentByTarget(input.reports, workload)]),
  ) as Record<ReleaseWorkload, ReleaseComponentResult>;

  const now = new Date().toISOString();
  const response = await fetch(
    `${controlReleaseOrigin()}/api/super-admin/production-deploy/callback`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${callbackSecret}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        snapshot: {
          version: 1,
          requestId: input.runId,
          status: "succeeded",
          stage: "complete",
          sandboxName: input.sandboxName,
          initiatedByUid: input.initiatedByUid,
          command: input.command,
          revision: input.revision,
          target: "all",
          startedAt: input.timestamp,
          updatedAt: now,
          finishedAt: now,
          exitCode: 0,
          emailStatus: "sent",
          inAppNotified: true,
        },
        logTail: input.logTail,
        releaseStateMutation: {
          revision: input.revision,
          runId: input.runId,
          operationId: `${input.runId}:ready`,
          source: "cli",
          control,
          workloads,
          readinessEvidence: [
            `${input.command} observed control READY`,
            ...RELEASE_WORKLOADS.map((workload) => `${input.command} observed ${workload} READY`),
          ],
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`control readiness callback failed: HTTP ${response.status} ${await response.text()}`);
  }
  console.log(
    `${input.logPrefix} Durable exact-SHA release readiness published for ${input.revision}.`,
  );
}
