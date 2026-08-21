import type { DeployAllPhaseId } from "../pipeline/phases";
import { SERVICE_PHASE_IDS } from "../pipeline/phases";

export interface DeployAllRunbookBranch {
  id: string;
  label: string;
  command: string;
  kind: "npm" | "assertion" | "git" | "vercel";
  dangerous?: boolean;
}

export interface DeployAllRunbookSection {
  id: string;
  label: string;
  branches: readonly DeployAllRunbookBranch[];
}

export interface DeployAllRunbookPhase {
  id: DeployAllPhaseId;
  label: string;
  sections: readonly DeployAllRunbookSection[];
}

function branch(
  id: string,
  label: string,
  command: string,
  kind: DeployAllRunbookBranch["kind"],
  dangerous = false,
): DeployAllRunbookBranch {
  return { id, label, command, kind, dangerous };
}

export const DEPLOY_ALL_PREFLIGHT_SECTIONS: readonly DeployAllRunbookSection[] = [
  {
    id: "environment",
    label: "environment and Vercel accounts",
    branches: [
      branch("production-doctor", "production environment readiness", "doctor:environment:production", "npm"),
      branch("vercel-account-access", "all seven Vercel account tokens", "vercel:accounts:check", "npm"),
    ],
  },
  {
    id: "source",
    label: "source quality and architecture",
    branches: [
      branch("lint", "lint", "lint", "npm"),
      branch("types", "TypeScript type check", "typecheck", "npm"),
      branch("architecture", "module and import boundaries", "architecture:check", "npm"),
      branch("tests", "full test suite", "test", "npm"),
    ],
  },
  {
    id: "data",
    label: "database and runtime contracts",
    branches: [
      branch("local-db", "local database availability", "db:ensure", "npm"),
      branch("release-schema", "release database schema sync", "db:schema:sync:release", "npm"),
    ],
  },
  {
    id: "main-builds",
    label: "main app builds",
    branches: [
      branch("server-build", "server build", "build", "npm"),
      branch("static-build", "static release export", "build:static", "npm"),
    ],
  },
  {
    id: "service-builds",
    label: "isolated service deployments",
    branches: [
      branch("service-mirror-sync", "service mirror sync", "services:sync", "npm"),
      branch("service-mirror-verify", "service mirror edge verification", "services:verify", "npm"),
      branch("service-builds", "Vercel-shaped service builds", "services:build", "npm"),
    ],
  },
] as const;

const SERVICE_DEPLOY_SCRIPTS = {
  notifications: "notifications:deploy",
  products: "products:deploy",
  orders: "orders:deploy",
  profiles: "profiles:deploy",
  submain: "submain:deploy",
  sub2main: "sub2main:deploy",
} as const;

export const DEPLOY_ALL_RUNBOOK: readonly DeployAllRunbookPhase[] = [
  {
    id: "preflight",
    label: "preflight gate before any git write",
    sections: DEPLOY_ALL_PREFLIGHT_SECTIONS,
  },
  {
    id: "publish",
    label: "publish one verified source revision",
    sections: [
      {
        id: "publish-guards",
        label: "local guards before staging",
        branches: [
          branch("main-branch", "must run on main", "assert:main-branch", "assertion"),
          branch("deployment-credentials", "deployment credentials and project link", "assert:deployment-credentials", "assertion"),
          branch("scratch-files", "scratch file refusal", "assert:no-scratch-files", "assertion"),
          branch("release-manifest", "release manifest downgrade refusal", "assert:release-manifest-not-downgraded", "assertion"),
          branch("non-empty-release", "non-empty deployment refusal", "assert:something-to-deploy", "assertion"),
        ],
      },
      {
        id: "publish-secrets",
        label: "secret archive",
        branches: [branch("secrets-backup", "encrypted secrets backup", "secrets:backup", "npm")],
      },
      {
        id: "publish-git",
        label: "Git revision",
        branches: [
          branch("clear-git-lock", "clear abandoned git lock only", "git:index-lock:clear-stale", "git"),
          branch("stage-tree", "stage deployment tree", "git:add -A", "git", true),
          branch("commit-tree", "create deployment commit", "git:commit", "git", true),
          branch("verify-clean-tree", "verify committed tree is stable", "git:status --porcelain", "git"),
          branch("push-main", "push main to GitHub", "git:push main", "git", true),
        ],
      },
    ],
  },
  ...SERVICE_PHASE_IDS.map(
    (id): DeployAllRunbookPhase => ({
      id,
      label: `deploy isolated ${id} target`,
      sections: [
        {
          id: `${id}-deploy`,
          label: "Vercel CLI production deployment",
          branches: [branch(`${id}-deploy-command`, `${id} deploy script`, SERVICE_DEPLOY_SCRIPTS[id], "npm", true)],
        },
      ],
    }),
  ),
  {
    id: "main",
    label: "verify GitHub-linked main deployment",
    sections: [
      {
        id: "main-verification",
        label: "Vercel production readiness",
        branches: [branch("main-ready", "match commit SHA and wait for READY", "vercel:wait-main-ready", "vercel")],
      },
    ],
  },
] as const;

export function deployAllBranchIds(): string[] {
  return DEPLOY_ALL_RUNBOOK.flatMap((phase) =>
    phase.sections.flatMap((section) => section.branches.map((item) => item.id)),
  );
}

export function formatDeployAllRunbook(): string {
  return DEPLOY_ALL_RUNBOOK.map((phase, phaseIndex) => {
    const sections = phase.sections
      .map((section, sectionIndex) => {
        const branches = section.branches
          .map(
            (item, branchIndex) =>
              `      ${phaseIndex + 1}.${sectionIndex + 1}.${branchIndex + 1} ${item.id}: ${item.command}`,
          )
          .join("\n");
        return `    ${phaseIndex + 1}.${sectionIndex + 1} ${section.id}: ${section.label}\n${branches}`;
      })
      .join("\n");
    return `  ${phaseIndex + 1}. ${phase.id}: ${phase.label}\n${sections}`;
  }).join("\n");
}
