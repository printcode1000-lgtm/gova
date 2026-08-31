import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

import { CONTROL_PLANE_BRANCH_NAMESPACES } from '@asol/local-agent-core';

/**
 * Blocks branch creation on GitHub for every ref except the two recognized branches.
 *
 * NOT a required-status-check ruleset. Pushes to `main` stay unrestricted.
 *
 * A ruleset with no bypass actors refuses the owner's own *other-branch* pushes as well as an
 * agent's. `refs/heads/main` is excluded so this ruleset cannot delay or reject a push to main.
 *
 * `.githooks/pre-push` and rule 10 of `CLAUDE.md` also carry the rule. The hook only runs when
 * `core.hooksPath` points at `.githooks`.
 *
 * This is a repository *ruleset*, not branch protection. `scripts/protect-main-branch.ts`
 * must not apply protection on `main`. This script only governs whether any other branch
 * may come into existence.
 *
 * The credential is `GITHUB_ADMIN_TOKEN` from git-ignored `.env.local`, the same
 * fine-grained token `github:protect` uses (`Administration: Read and write`, this
 * repository only). Nothing here prints it, and `--dry-run` shows the whole payload
 * without sending it. `--remove` deletes the ruleset again.
 */

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

const DRY_RUN = process.argv.includes('--dry-run');
const REMOVE = process.argv.includes('--remove');

/** Stable name — the script finds an existing ruleset by it rather than creating duplicates. */
const RULESET_NAME = 'fixed-two-branches';
const LEGACY_RULESET_NAME = 'main-only';

const API = 'https://api.github.com';


function resolveRepository(): string {
  const configured = process.env.GITHUB_REPOSITORY?.trim();
  if (configured) return configured;

  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const match = remote.match(/github\.com[/:]([^/]+\/[^/.]+)(\.git)?$/);
  if (!match) throw new Error(`Could not read owner/repo from origin remote: ${remote}`);
  return match[1];
}

interface RulesetPayload {
  name: string;
  target: 'branch';
  enforcement: 'active';
  bypass_actors: never[];
  conditions: { ref_name: { include: string[]; exclude: string[] } };
  rules: { type: 'creation' }[];
}

function buildPayload(): RulesetPayload {
  return {
    name: RULESET_NAME,
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [],
    conditions: {
      ref_name: {
        // `~ALL` matches every branch; main is excluded so the ruleset can never interfere
        // with the one branch that is supposed to exist. main already exists, so the
        // creation rule would not fire on it either way — the exclusion is there so a
        // future rule added to this ruleset cannot accidentally catch it.
        include: ['~ALL'],
        exclude: ['refs/heads/main', ...CONTROL_PLANE_BRANCH_NAMESPACES],
      },
    },
    // Creation only. Not `deletion` and not `update`: deleting a stray branch must stay
    // possible, and pushes to `main` stay unrestricted.
    rules: [{ type: 'creation' }],
  };
}

function headers(token: string, json = false): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function requireToken(): string {
  const token = process.env.GITHUB_ADMIN_TOKEN;
  if (!token) {
    console.error(
      '\nGITHUB_ADMIN_TOKEN is missing from .env.local / .env.\n' +
      'It needs a fine-grained token scoped to this repository with\n' +
      '"Administration: Read and write" — the same token github:protect uses.\n' +
      'Run with --dry-run to review the payload without a token.',
    );
    process.exit(1);
  }
  return token;
}

/** Returns the id of the fixed two-branch ruleset or its legacy main-only predecessor. */
async function findRuleset(repository: string, token: string): Promise<number | null> {
  const response = await fetch(`${API}/repos/${repository}/rulesets`, {
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(`Could not list rulesets: ${response.status} ${await response.text()}`);
  }
  const rulesets = (await response.json()) as { id: number; name: string }[];
  return rulesets.find((ruleset) => ruleset.name === RULESET_NAME || ruleset.name === LEGACY_RULESET_NAME)?.id ?? null;
}

async function remove(repository: string, token: string): Promise<void> {
  const id = await findRuleset(repository, token);
  if (id === null) {
    console.log(`No '${RULESET_NAME}' ruleset on ${repository}. Nothing to remove.`);
    return;
  }

  const response = await fetch(`${API}/repos/${repository}/rulesets/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!response.ok) {
    throw new Error(`GitHub refused the delete: ${response.status} ${await response.text()}`);
  }
  console.log(`Removed ruleset '${RULESET_NAME}' (${id}). Branch creation is open again.`);
}

async function apply(repository: string, token: string, payload: RulesetPayload): Promise<void> {
  const existing = await findRuleset(repository, token);

  const response = await fetch(
    existing === null
      ? `${API}/repos/${repository}/rulesets`
      : `${API}/repos/${repository}/rulesets/${existing}`,
    {
      method: existing === null ? 'POST' : 'PUT',
      headers: headers(token, true),
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    // The body can echo back request details; the token is never in the body.
    throw new Error(`GitHub refused the change: ${response.status} ${await response.text()}`);
  }

  const saved = (await response.json()) as { id: number };
  console.log(`\nRuleset ${existing === null ? 'created' : 'updated'} (${saved.id}). Verifying...`);

  // Read back rather than trusting the response code — the same reason github:protect does.
  const verify = await fetch(`${API}/repos/${repository}/rulesets/${saved.id}`, {
    headers: headers(token),
  });
  const live = (await verify.json()) as {
    enforcement?: string;
    conditions?: { ref_name?: { include?: string[]; exclude?: string[] } };
    rules?: { type: string }[];
    bypass_actors?: unknown[];
  };

  console.log(`  enforcement   : ${live.enforcement}`);
  console.log(`  applies to    : ${JSON.stringify(live.conditions?.ref_name?.include ?? [])}`);
  console.log(`  except        : ${JSON.stringify(live.conditions?.ref_name?.exclude ?? [])}`);
  console.log(`  rules         : ${JSON.stringify((live.rules ?? []).map((rule) => rule.type))}`);
  console.log(`  bypass actors : ${(live.bypass_actors ?? []).length}`);

  const blocking =
    live.enforcement === 'active' && (live.rules ?? []).some((rule) => rule.type === 'creation');
  console.log(
    blocking
      ? '\nBranch creation is blocked for every ref except main and agent-request/chatgpt.'
      : '\nWARNING: the ruleset came back without an active creation rule. Check it on GitHub.',
  );
}

async function main(): Promise<void> {
  const repository = resolveRepository();
  const payload = buildPayload();

  console.log(`Repository : ${repository}`);
  console.log(`Ruleset    : ${RULESET_NAME}`);

  if (REMOVE) {
    if (DRY_RUN) {
      console.log('\n--dry-run: would delete the ruleset. Nothing sent.');
      return;
    }
    await remove(repository, requireToken());
    return;
  }

  console.log(`\nPayload:\n${JSON.stringify(payload, null, 2)}`);

  if (DRY_RUN) {
    console.log('\n--dry-run: nothing sent.');
    return;
  }

  await apply(repository, requireToken(), payload);
}

main().catch((error) => {
  console.error('Blocking branch creation failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
