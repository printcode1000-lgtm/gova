import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

/**
 * Configures branch protection on `main` — rule 6 of docs/01-architecture/module-isolation-rules.md.
 *
 * Rule 6 was the one rule that could not be satisfied from the tree: the configuration
 * lives in GitHub's settings, so it needs a credential.
 *
 * Its ownership half no longer exists. CODEOWNERS was removed deliberately — one
 * developer, and releases push straight to main rather than through pull requests, so a
 * required code-owner review could never be satisfied and never fired. What remains is
 * the half that does work on a solo repository, and it is applied and read back here.
 *
 * The credential is never held by this project: `GITHUB_ADMIN_TOKEN` is read from
 * `.env.local`, which is git-ignored, exactly as every Vercel and Turso token already is.
 * Nothing here prints it, and `--dry-run` shows the whole payload without sending it.
 *
 * The token should be fine-grained and scoped to this repository with
 * `Administration: Read and write`. A classic token would grant this script write access
 * to every repository the owner has, to do one job on one of them.
 */

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');

function resolveRepository(): string {
  const configured = process.env.GITHUB_REPOSITORY?.trim();
  if (configured) return configured;

  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const match = remote.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?$/);
  if (!match) throw new Error(`Could not read owner/repo from origin remote: ${remote}`);
  return match[1];
}

/**
 * Status checks that must pass before `main` moves.
 *
 * Deliberately the workflow's checks and nothing invented here: a required check that
 * never reports blocks every merge forever, which is a worse failure than no protection
 * at all. Verify the names against a recent run before adding to this list.
 */
const REQUIRED_STATUS_CHECKS: string[] = [
  // The `native-core` workflow's single job. Confirmed against a real green run
  // (commit 251ef3ce) before being listed here — GitHub matches on the check-run name it
  // actually reports, and a name that never reports blocks every merge permanently.
  'verify',
];

interface ProtectionPayload {
  required_status_checks: { strict: boolean; contexts: string[] } | null;
  enforce_admins: boolean;
  required_pull_request_reviews: {
    required_approving_review_count: number;
    dismiss_stale_reviews: boolean;
  } | null;
  restrictions: null;
  allow_force_pushes: boolean;
  allow_deletions: boolean;
  required_linear_history: boolean;
  required_conversation_resolution: boolean;
}

/**
 * Two settings are deliberately absent, and both would look like improvements.
 *
 * `required_signatures` — `deploy:all` creates unsigned commits. Requiring signatures
 * would reject the only supported release path, and the first sign of it would be a
 * failed production deploy.
 *
 * `enforce_admins: true` — same reason, more directly: it would apply the pull-request
 * requirement to the owner's own direct pushes, which is exactly what `deploy:all` does.
 *
 * A protection rule that blocks releases is not stricter, it is broken. Both belong to a
 * future where releases go through pull requests.
 */

function buildPayload(): ProtectionPayload {
  return {
    required_status_checks:
      REQUIRED_STATUS_CHECKS.length > 0
        ? { strict: true, contexts: REQUIRED_STATUS_CHECKS }
        : null,
    // False on purpose. `deploy:all` pushes to main directly, by design — the four
    // service accounts are updated by that command and nothing else. Enforcing
    // protection on admins would break the only supported release path.
    enforce_admins: false,
    required_pull_request_reviews: {
      // No approval count: GitHub will not accept a review from the author, and there is
      // exactly one developer. Requiring one would block every pull request permanently —
      // the same failure as a required status check that never reports.
      required_approving_review_count: 0,
      dismiss_stale_reviews: true,
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
    // Both are safe for the release path: they constrain how a *pull request* may land,
    // and `deploy:all` pushes a single commit directly. They are also the strongest
    // guarantees available on a single-owner repository, where no second person exists to
    // satisfy a review requirement.
    required_linear_history: true,
    required_conversation_resolution: true,
  };
}

async function main(): Promise<void> {
  const repository = resolveRepository();
  const payload = buildPayload();

  console.log(`Repository : ${repository}`);
  console.log(`Branch     : main`);
  if (REQUIRED_STATUS_CHECKS.length === 0) {
    console.log(
      'Required status checks: none configured. Add the workflow check names to\n' +
        '  REQUIRED_STATUS_CHECKS in this file after confirming them on a real run —\n' +
        '  a required check that never reports blocks every merge permanently.',
    );
  }
  console.log(`\nPayload:\n${JSON.stringify(payload, null, 2)}`);

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing sent.');
    return;
  }

  const token = process.env.GITHUB_ADMIN_TOKEN;
  if (!token) {
    console.error(
      '\nGITHUB_ADMIN_TOKEN is missing from .env.local / .env.\n' +
        'Create a fine-grained token scoped to this repository with\n' +
        '"Administration: Read and write" — see .env.example for the exact settings.\n' +
        'Run with --dry-run to review the payload without a token.',
    );
    process.exit(1);
  }

  const response = await fetch(
    `https://api.github.com/repos/${repository}/branches/main/protection`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    // The body can echo back request details; the token is never in the body.
    throw new Error(`GitHub refused the change: ${response.status} ${await response.text()}`);
  }

  console.log('\nBranch protection applied. Verifying...');

  const verify = await fetch(
    `https://api.github.com/repos/${repository}/branches/main/protection`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  const live = (await verify.json()) as {
    allow_force_pushes?: { enabled: boolean };
    allow_deletions?: { enabled: boolean };
    required_status_checks?: { contexts?: string[] };
    required_linear_history?: { enabled: boolean };
    required_conversation_resolution?: { enabled: boolean };
  };

  console.log(`  force pushes blocked   : ${live.allow_force_pushes?.enabled === false}`);
  console.log(`  deletions blocked      : ${live.allow_deletions?.enabled === false}`);
  console.log(`  linear history         : ${live.required_linear_history?.enabled === true}`);
  console.log(
    `  conversations resolved : ${live.required_conversation_resolution?.enabled === true}`,
  );
  console.log(
    `  required checks        : ${JSON.stringify(live.required_status_checks?.contexts ?? [])}`,
  );

  console.log(
    '\nEverything a single-developer repository can enforce is on. Code-owner review is\n' +
      'deliberately absent, not pending: CODEOWNERS was removed because GitHub refuses a\n' +
      'review from the author, and releases push directly to main rather than through\n' +
      'pull requests. The required status check is the reviewer here.',
  );
  console.log('\nRule 6 is enforcement rather than documentation.');
}

main().catch((error) => {
  console.error('Branch protection failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
