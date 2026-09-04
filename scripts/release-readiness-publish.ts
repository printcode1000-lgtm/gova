import {
  type ReleaseComponentResult,
  type ReleaseWorkload,
  type VercelDeploymentReport,
  RELEASE_WORKLOADS,
} from "@asol/vercel-deploy-core";
import {
  releaseReadinessComponentFromDeployment,
  requiredReadyComponents,
} from "@asol/release-core";

/**
 * Publishing exact-SHA release readiness to the control plane.
 *
 * The GitHub-linked gova build is blocked on this state: `build:vercel` waits
 * for `ready` before it produces a publishable frontend artifact. Every release
 * path that deploys control plus the six workloads for a SHA must publish it
 * through this one door, otherwise the gova build waits until it times out and
 * the release can never publish.
 */

export type ReleaseReadinessCommand = "deploy:all" | "deploy:push";

/** A deployment report becomes the component evidence the release state stores. */
export function releaseComponentFromReport(
  report: VercelDeploymentReport,
): ReleaseComponentResult {
  return releaseReadinessComponentFromDeployment(report);
}

export function controlReleaseOrigin(): string {
  const value = process.env.NEXT_PUBLIC_ASOL_CONTROL_URL?.trim().replace(/\/$/, "");
  if (!value) {
    throw new Error("NEXT_PUBLIC_ASOL_CONTROL_URL is required to publish release readiness.");
  }
  return value;
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

  const components = requiredReadyComponents({ reports: input.reports, targets: ["control", ...RELEASE_WORKLOADS] });
  const control = components.control! as ReleaseComponentResult;
  const workloads = Object.fromEntries(RELEASE_WORKLOADS.map((workload) => [workload, components[workload]!])) as Record<ReleaseWorkload, ReleaseComponentResult>;

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

/**
 * Withdraw a published readiness when the release did not finish.
 *
 * Readiness is what unblocks the gova build. If it stays `ready` for a revision
 * whose release then failed, the frontend build can arrive late and publish
 * against backends the failure path has already rolled back — a frontend on one
 * SHA over backends on another, which is the one state the barrier exists to
 * prevent.
 *
 * That is not hypothetical: a `deploy:push` whose gova deployment never appeared
 * left `ready` standing, and the topology had to be realigned by hand.
 *
 * Marking the revision `failed` makes `build:vercel` fail closed for it forever,
 * so a late build leaves the previous production deployment serving. Best effort
 * on purpose: the release has already failed, and a failure to retract must not
 * replace the real error with this one.
 */
export async function retractReleaseReadiness(input: {
  readonly revision: string;
  readonly runId: string;
  readonly reason: string;
  readonly logPrefix: string;
}): Promise<void> {
  const callbackSecret = process.env.ASOL_DEPLOY_CALLBACK_SECRET?.trim();
  if (!callbackSecret) return;

  try {
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
            status: "failed",
            stage: "complete",
            sandboxName: "release-retraction",
            initiatedByUid: "release",
            command: "deploy:push",
            revision: input.revision,
            target: "all",
            startedAt: now,
            updatedAt: now,
            finishedAt: now,
            exitCode: 1,
            emailStatus: "sent",
            inAppNotified: true,
          },
          logTail: `Release readiness withdrawn: ${input.reason}`,
          releaseStateMutation: {
            revision: input.revision,
            runId: input.runId,
            operationId: `${input.runId}:retract`,
            source: "cli",
            status: "failed",
            failureDetails: [input.reason],
          },
        }),
      },
    );
    console.error(
      response.ok
        ? `${input.logPrefix} Release readiness withdrawn for ${input.revision}.`
        : `${input.logPrefix} Could not withdraw readiness: HTTP ${response.status}.`,
    );
  } catch (error) {
    console.error(
      `${input.logPrefix} Could not withdraw readiness: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
