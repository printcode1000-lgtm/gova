#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import path from "node:path";

import { API_BASE_URL } from "@asol/native-core";

/**
 * Ask production what it is actually serving.
 *
 * Every other gate runs against a locally built server, and Vercel's own
 * verdict is about the deployment, not the site: `deploy:all` reported six
 * accounts READY and a main target TIMEOUT while production served a build from
 * an hour earlier — and every route answered 200, because an older healthy
 * build answers exactly like a current one.
 *
 * A status code proves the site is up. It cannot prove the site is running the
 * change that was just deployed. Only the build identity can, so this compares
 * the manifest production serves with the one this working tree produced.
 *
 * Run after the deployment reaches a terminal state. A mismatch is not
 * necessarily a failure — a deployment can still be propagating — so this
 * retries before reporting, and says which build it saw.
 */
const MANIFEST = "asol-web-manifest.json";
const ORIGIN = process.env.ASOL_PRODUCTION_ORIGIN ?? API_BASE_URL;
const ATTEMPTS = Number(process.env.ASOL_RELEASE_CHECK_ATTEMPTS ?? 20);
const INTERVAL_MS = 15_000;

interface WebManifest {
  readonly createdAt: string;
  readonly releaseId?: string;
}

function localManifest(): WebManifest {
  const file = path.join(process.cwd(), "public", MANIFEST);
  return JSON.parse(readFileSync(file, "utf8")) as WebManifest;
}

async function deployedManifest(): Promise<WebManifest> {
  const response = await fetch(`${ORIGIN}/${MANIFEST}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${ORIGIN}/${MANIFEST}`);
  return (await response.json()) as WebManifest;
}

async function main(): Promise<void> {
  const local = localManifest();
  console.log(`[release-check] expecting ${local.createdAt} at ${ORIGIN}`);

  let seen = "";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const deployed = await deployedManifest();
      seen = deployed.createdAt;
      if (deployed.createdAt === local.createdAt) {
        console.log(`[release-check] production is serving this build (${seen}).`);
        return;
      }
      console.log(
        `[release-check] attempt ${attempt}/${ATTEMPTS}: production still on ${seen}`,
      );
    } catch (error) {
      console.log(
        `[release-check] attempt ${attempt}/${ATTEMPTS}: ${error instanceof Error ? error.message : error}`,
      );
    }
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }

  console.error(
    `\n[release-check] production never served this build.\n` +
      `  expected: ${local.createdAt}\n` +
      `  serving:  ${seen || "(unreadable)"}\n\n` +
      `The deployment did not become production. The usual cause is a newer push:\n` +
      `the main app redeploys on every push to main, so a commit made during the\n` +
      `run supersedes the deployment that run created. Check the Vercel dashboard\n` +
      `for the newest deployment and whether it is promoted.`,
  );
  process.exit(1);
}

main().catch((error) => {
  console.error("[release-check] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
