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
      // Reads the build's own route traces. Vercel rejects a function over
      // 250MB at *upload*, after the deployment commit is pushed and the
      // isolated services are live, and reports it as a build failure. Measuring
      // here turns that into a preflight stop that names the route.
      branch(
        "function-size",
        "Vercel function size budget",
        "vercel:function-size:check",
        "npm",
      ),
      // Starts the built server and asks it real questions. Nothing else in
      // the pipeline does: `deploy:all` builds, uploads and waits for READY,
      // and READY means the deployment exists, not that a request succeeds —
      // it reported seven targets READY while every server route answered 500.
      // That fault was a bundler giving a port module two instances, which no
      // static check and no `tsx` test can see because Node resolves one path
      // to one instance. Only a real server answering a real request can.
      branch("smoke", "built server answers real requests", "smoke:production", "npm"),
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
      // Health is not enough, and that is the whole lesson: none of the six
      // composition roots registered data-core's runtime-config port, so every
      // route that reached a repository answered 500 while /api/health stayed
      // 200. All six deployed READY with the profiles account serving errors to
      // the browser. Each service is now asked for a route that reaches its own
      // data, before any account is published.
      branch("service-smoke", "services answer their own data routes", "smoke:services", "npm"),
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
        branches: [
          branch("main-ready", "match commit SHA and wait for READY", "vercel:wait-main-ready", "vercel"),
          // READY describes the deployment, not the site. This run once reported
          // six accounts READY and a main TIMEOUT while production served a build
          // from an hour earlier, answering 200 on every route — an older healthy
          // build answers exactly like a current one. Only the build identity
          // separates them.
          branch("main-serving", "production is serving this build", "release:check", "npm"),
          // READY and a matching manifest do not prove a data route works.
          // smoke:services tests locally built copies; the mobile app calls the
          // seven deployed origins baked in as NEXT_PUBLIC_ASOL_*_URL. Ask them.
          branch(
            "deployed-smoke",
            "deployed origins answer their data routes",
            "smoke:deployed",
            "npm",
          ),
        ],
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
