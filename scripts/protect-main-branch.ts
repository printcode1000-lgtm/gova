import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

/**
 * Configures branch protection on `main` — rule 6 of docs/01-architecture/module-isolation-rules.md.
 *
 * Rule 6 was the one rule that could not be satisfied from code: `.github/CODEOWNERS`
 * declares ownership, but nothing enforces it until the repository itself requires
 * review and blocks force-pushes. That configuration lives on GitHub, not in the tree,
 * so it needs a credential.
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
const WITH_CODEOWNER_REVIEW = process.argv.includes('--require-codeowner-review');

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
const REQUIRED_STATUS_CHECKS: string[] = [];

interface ProtectionPayload {
  required_status_checks: { strict: boolean; contexts: string[] } | null;
  enforce_admins: boolean;
  required_pull_request_reviews: {
    require_code_owner_reviews: boolean;
    required_approving_review_count: number;
    dismiss_stale_reviews: boolean;
  } | null;
  restrictions: null;
  allow_force_pushes: boolean;
  allow_deletions: boolean;
}

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
      // On a single-owner repository this blocks the owner's own pull requests: GitHub
      // will not accept a review from the author. Opt in with
      // --require-codeowner-review once the repository has a second member.
      require_code_owner_reviews: WITH_CODEOWNER_REVIEW,
      required_approving_review_count: WITH_CODEOWNER_REVIEW ? 1 : 0,
      dismiss_stale_reviews: true,
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  };
}

async function main(): Promise<void> {
  const repository = resolveRepository();
  const payload = buildPayload();

  console.log(`Repository : ${repository}`);
  console.log(`Branch     : main`);
  console.log(`Code-owner review required: ${WITH_CODEOWNER_REVIEW ? 'yes' : 'no'}`);
  if (!WITH_CODEOWNER_REVIEW) {
    console.log(
      '  (single-owner repositories cannot satisfy it — GitHub rejects a review from the\n' +
        '   pull request author. Re-run with --require-codeowner-review once a second\n' +
        '   member exists.)',
    );
  }
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
    required_pull_request_reviews?: { require_code_owner_reviews?: boolean };
  };

  console.log(`  force pushes blocked : ${live.allow_force_pushes?.enabled === false}`);
  console.log(`  deletions blocked    : ${live.allow_deletions?.enabled === false}`);
  console.log(
    `  code-owner review    : ${live.required_pull_request_reviews?.require_code_owner_reviews === true}`,
  );
  console.log('\nRule 6 is now enforcement rather than documentation.');
}

main().catch((error) => {
  console.error('Branch protection failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
