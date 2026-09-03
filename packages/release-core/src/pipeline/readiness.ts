export interface ReleaseReadinessDeployment {
  readonly target: string;
  readonly state: string;
  readonly deploymentId?: string;
  readonly url?: string;
  readonly message: string;
}

export interface ReleaseReadinessComponent {
  readonly status: "passed" | "failed";
  readonly smokeStatus: "passed" | "failed";
  readonly deploymentId?: string;
  readonly url?: string;
  readonly failure?: string;
  readonly evidence: string;
}

export function releaseReadinessComponentFromDeployment(report: ReleaseReadinessDeployment): ReleaseReadinessComponent {
  if (report.state !== "READY") {
    return { status: "failed", smokeStatus: "failed", deploymentId: report.deploymentId, url: report.url, failure: report.message, evidence: `${report.target} deployment was ${report.state}` };
  }
  return { status: "passed", smokeStatus: "passed", deploymentId: report.deploymentId, url: report.url, evidence: `${report.target} deployment READY: ${report.message}` };
}

/** Fail closed: every required runtime must have its own READY report. */
export function requiredReadyComponents(input: {
  readonly reports: readonly ReleaseReadinessDeployment[];
  readonly targets: readonly string[];
}): Record<string, ReleaseReadinessComponent> {
  return Object.fromEntries(input.targets.map((target) => {
    const report = input.reports.find((candidate) => candidate.target === target);
    if (!report) throw new Error(`Missing Vercel deployment report for ${target}.`);
    if (report.state !== "READY") throw new Error(`${target} is ${report.state}: ${report.message}`);
    return [target, releaseReadinessComponentFromDeployment(report)];
  }));
}
