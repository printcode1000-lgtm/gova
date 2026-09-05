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

/**
 * What `npm run deploy:push:fast` actually does, branch by branch.
 *
 * `--fast` is what the console runs, and it keeps only the checks that cost
 * nothing and cannot be recovered from afterwards. The account-access check,
 * the scratch-file / manifest-downgrade / non-empty refusals, the mirror builds
 * and `secrets:backup` are all skipped — listing them here would promise gates
 * the run does not perform. Use `deploy:all` when those are required.
 */
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
          branch("push-secrets-restore", "restore release secrets from the encrypted archive", "secrets:restore", "npm"),
          branch("push-main-credentials", "main Vercel token and project link", "assert:main-deployment-credentials", "assertion"),
        ],
      },
    ],
  },
  {
    id: "fast-publish",
    label: "GitHub publish",
    sections: [
      {
        id: "push-git",
        label: "Git revision",
        branches: [
          branch("push-clear-git-lock", "clear abandoned git lock only", "git:index-lock:clear-stale", "git"),
          branch("push-advance-origin", "fast-forward HEAD to origin/main", "git:fetch+merge --ff-only", "git"),
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
    label: "release transaction",
    sections: [
      {
        id: "push-rollback-baseline",
        label: "rollback baseline",
        branches: [branch("push-capture-baseline", "capture the live production deployments", "vercel:capture-baseline", "vercel")],
      },
      {
        id: "push-isolated-targets",
        label: "six isolated accounts",
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
        id: "push-control",
        label: "control",
        branches: [branch("push-control-deploy", "control production deploy at the same SHA", "control:deploy", "npm", true)],
      },
      {
        id: "push-readiness",
        label: "exact-SHA readiness",
        // Readiness is published from inside the run (deploy-push.ts calls
        // publishReleaseReadiness after control and the six workloads), not by a
        // separate npm script. Typed like its deploy-all counterpart so the
        // console describes the stage without offering a button for it.
        branches: [branch("push-publish-readiness", "publish readiness so the gova build may publish", "control:release-readiness", "vercel", true)],
      },
      {
        id: "push-main-verification",
        label: "main app deployment",
        branches: [branch("push-main-ready", "deploy gova and wait for READY", "main:deploy", "npm", true)],
      },
    ],
  },
] as const;

export function deployPushBranchIds(): string[] {
  return DEPLOY_PUSH_RUNBOOK.flatMap((phase) =>
    phase.sections.flatMap((section) => section.branches.map((item) => item.id)),
  );
}
