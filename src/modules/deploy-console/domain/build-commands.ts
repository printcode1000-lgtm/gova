import {
  DEPLOY_ALL_FLAG_CLI,
  DEPLOY_ALL_PHASE_ORDER,
  type DeployAllFlagId,
  type DeployAllPhaseId,
  type IsolatedDeployTarget,
  isDeployAllFlagId,
  isDeployAllPhaseId,
  isIsolatedDeployTarget,
} from "./catalog";

export type DeployConsoleEngine = "deploy-all" | "deploy-push";

export interface DeployAllRequest {
  engine: "deploy-all";
  phases: DeployAllPhaseId[];
  flags: DeployAllFlagId[];
  revision?: string;
}

export interface DeployPushRequest {
  engine: "deploy-push";
  targets: IsolatedDeployTarget[];
  retryFailed: boolean;
}

export type DeployConsoleLaunchRequest = DeployAllRequest | DeployPushRequest;

export interface BuiltDeployCommands {
  engine: DeployConsoleEngine;
  commands: string[];
  summaryLines: string[];
}

const DEPLOY_ALL_SCRIPT = "npx tsx scripts/deploy-all.ts";
const DEPLOY_PUSH_SCRIPT = "npx tsx scripts/deploy-push.ts";
const REVISION_PATTERN = /^[0-9a-f]{7,40}$/i;

function sortPhasesInOrder(phases: readonly DeployAllPhaseId[]): DeployAllPhaseId[] {
  return DEPLOY_ALL_PHASE_ORDER.filter((id) => phases.includes(id));
}

function flagArgs(flags: readonly DeployAllFlagId[]): string[] {
  return flags.map((id) => DEPLOY_ALL_FLAG_CLI[id]);
}

export function buildDeployAllCommands(input: {
  phases: readonly string[];
  flags: readonly string[];
  revision?: string;
}): BuiltDeployCommands {
  const phases = sortPhasesInOrder(input.phases.filter(isDeployAllPhaseId));
  if (phases.length === 0) {
    throw new Error("deployConsoleNoPhasesSelected");
  }

  const flags = input.flags.filter(isDeployAllFlagId);
  const revision = input.revision?.trim() ?? "";
  if (revision && !REVISION_PATTERN.test(revision)) {
    throw new Error("deployConsoleInvalidRevision");
  }

  const shared = [...flagArgs(flags)];
  if (revision) shared.push(`--revision=${revision}`);

  const commands = phases.map((phase) => {
    const args = [...shared, `--phase=${phase}`];
    return `${DEPLOY_ALL_SCRIPT} ${args.join(" ")}`.trim();
  });

  const summaryLines = [
    `المحرك: Deploy All`,
    `المراحل (${phases.length}): ${phases.join(" → ")}`,
    flags.length > 0
      ? `الخيارات: ${flags.map((id) => DEPLOY_ALL_FLAG_CLI[id]).join(" ")}`
      : "الخيارات: (لا يوجد)",
    revision ? `revision: ${revision}` : "revision: (افتراضي من حالة التشغيل)",
    "التنفيذ: متسلسل — يتوقف عند أول فشل.",
  ];

  return { engine: "deploy-all", commands, summaryLines };
}

export function buildDeployPushCommands(input: {
  targets: readonly string[];
  retryFailed: boolean;
}): BuiltDeployCommands {
  const targets = [
    ...new Set(input.targets.filter(isIsolatedDeployTarget)),
  ] as IsolatedDeployTarget[];

  const args: string[] = [];
  if (input.retryFailed) args.push("--retry-failed");

  if (targets.length === 0) {
    args.push("--vercel-target=none");
  } else if (targets.length === 6) {
    args.push("--vercel-target=all");
  } else {
    args.push(`--vercel-target=${targets.join(",")}`);
  }

  const command = `${DEPLOY_PUSH_SCRIPT} ${args.join(" ")}`.trim();
  const summaryLines = [
    `المحرك: Deploy Push`,
    "خطوات إلزامية: secrets:backup → GitHub push → تحقق main",
    targets.length === 0
      ? "أهداف معزولة: لا شيء (main فقط)"
      : `أهداف معزولة: ${targets.join(", ")}`,
    input.retryFailed ? "الخيار: --retry-failed" : "الخيار: (لا يوجد)",
  ];

  return { engine: "deploy-push", commands: [command], summaryLines };
}

export function parseLaunchRequest(body: unknown): DeployConsoleLaunchRequest {
  if (!body || typeof body !== "object") {
    throw new Error("deployConsoleInvalidBody");
  }
  const record = body as Record<string, unknown>;
  const engine = record.engine;

  if (engine === "deploy-all") {
    if (!Array.isArray(record.phases) || !Array.isArray(record.flags)) {
      throw new Error("deployConsoleInvalidBody");
    }
    const phases = record.phases.filter(
      (value): value is string => typeof value === "string",
    );
    const flags = record.flags.filter(
      (value): value is string => typeof value === "string",
    );
    const revision =
      typeof record.revision === "string" ? record.revision : undefined;
    buildDeployAllCommands({ phases, flags, revision });
    return {
      engine: "deploy-all",
      phases: sortPhasesInOrder(phases.filter(isDeployAllPhaseId)),
      flags: flags.filter(isDeployAllFlagId),
      revision,
    };
  }

  if (engine === "deploy-push") {
    if (!Array.isArray(record.targets)) {
      throw new Error("deployConsoleInvalidBody");
    }
    const targets = record.targets.filter(
      (value): value is string => typeof value === "string",
    );
    const retryFailed = record.retryFailed === true;
    buildDeployPushCommands({ targets, retryFailed });
    return {
      engine: "deploy-push",
      targets: [
        ...new Set(targets.filter(isIsolatedDeployTarget)),
      ] as IsolatedDeployTarget[],
      retryFailed,
    };
  }

  throw new Error("deployConsoleUnknownEngine");
}

export function buildCommandsForRequest(
  request: DeployConsoleLaunchRequest,
): BuiltDeployCommands {
  if (request.engine === "deploy-all") {
    return buildDeployAllCommands(request);
  }
  return buildDeployPushCommands(request);
}
