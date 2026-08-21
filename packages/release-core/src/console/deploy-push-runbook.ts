export interface DeployPushRunbookBranch {
  id: string;
  label: string;
  command: string;
  kind: "assertion" | "npm" | "git" | "vercel";
  dangerous?: boolean;
}

export interface DeployPushRunbookSection {
  id: string;
  label: string;
  branches: readonly DeployPushRunbookBranch[];
}

export interface DeployPushRunbookPhase {
  id: string;
  label: string;
  sections: readonly DeployPushRunbookSection[];
}

function branch(
  id: string,
  label: string,
  command: string,
  kind: DeployPushRunbookBranch["kind"],
  dangerous = false,
): DeployPushRunbookBranch {
  return { id, label, command, kind, dangerous };
}

export const DEPLOY_PUSH_RUNBOOK: readonly DeployPushRunbookPhase[] = [
  {
    id: "fast-guards",
    label: "fast publish guards",
    sections: [
      {
        id: "local-guards",
        label: "local safety checks",
        branches: [
          branch("push-main-branch", "must run on main", "assert:main-branch", "assertion"),
          branch("push-main-credentials", "main Vercel token and project link", "assert:main-deployment-credentials", "assertion"),
          branch("push-target-accounts", "selected Vercel account access", "assert:vercel-accounts-for-targets", "vercel"),
          branch("push-scratch-files", "scratch file refusal", "assert:no-scratch-files", "assertion"),
          branch("push-release-manifest", "release manifest downgrade refusal", "assert:release-manifest-not-downgraded", "assertion"),
          branch("push-non-empty", "non-empty deployment refusal", "assert:something-to-push", "assertion"),
        ],
      },
    ],
  },
  {
    id: "fast-publish",
    label: "GitHub publish",
    sections: [
      {
        id: "push-secrets",
        label: "secret archive",
        branches: [branch("push-secrets-backup", "encrypted secrets backup", "secrets:backup", "npm")],
      },
      {
        id: "push-git",
        label: "Git revision",
        branches: [
          branch("push-clear-git-lock", "clear abandoned git lock only", "git:index-lock:clear-stale", "git"),
          branch("push-stage-tree", "stage deployment tree", "git:add -A", "git", true),
          branch("push-commit-tree", "create deployment commit", "git:commit", "git", true),
          branch("push-clean-tree", "verify committed tree is stable", "git:status --porcelain", "git"),
          branch("push-github", "push main to GitHub", "git:push main", "git", true),
          branch("push-github-verify", "verify origin/main commit", "git:fetch+rev-parse", "git"),
        ],
      },
    ],
  },
  {
    id: "fast-vercel",
    label: "Vercel production targets",
    sections: [
      {
        id: "push-isolated-targets",
        label: "selected isolated accounts",
        branches: [
          branch("push-notifications", "notifications production deploy", "notifications:deploy", "npm", true),
          branch("push-products", "products production deploy", "products:deploy", "npm", true),
          branch("push-orders", "orders production deploy", "orders:deploy", "npm", true),
          branch("push-profiles", "profiles production deploy", "profiles:deploy", "npm", true),
          branch("push-submain", "submain production deploy", "submain:deploy", "npm", true),
          branch("push-sub2main", "sub2main production deploy", "sub2main:deploy", "npm", true),
        ],
      },
      {
        id: "push-main-verification",
        label: "main app readiness",
        branches: [branch("push-main-ready", "match commit SHA and wait for READY", "vercel:wait-main-ready", "vercel")],
      },
    ],
  },
] as const;

export function deployPushBranchIds(): string[] {
  return DEPLOY_PUSH_RUNBOOK.flatMap((phase) =>
    phase.sections.flatMap((section) => section.branches.map((item) => item.id)),
  );
}
