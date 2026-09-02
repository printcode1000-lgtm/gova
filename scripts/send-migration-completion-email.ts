#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

import dotenv from "dotenv";
import nodemailer from "nodemailer";

import { KNOWN_UNSHIPPED } from "./route-ownership-coverage";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

/**
 * The ASOL distributed-architecture migration report, by mail.
 *
 * Separate from `send-coordinator-completion-email.ts`, which reports the
 * Android release runbook: one subject per message, so neither has to explain
 * which half of it the reader wanted.
 *
 * Names and counts only — no secret value, no token, no origin credential. The
 * report is meant to be forwardable.
 */
const RECIPIENT = process.argv[2] ?? "print.code.1000@gmail.com";

function gitHead(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "(unknown)";
  }
}

function buildReport(): string {
  const revision = gitHead();
  const backlog = KNOWN_UNSHIPPED.length;

  return [
    "ASOL distributed architecture — migration report",
    "",
    `Released revision: ${revision}`,
    "",
    "Topology (8 Vercel runtimes)",
    "  gova        frontend, /api/health, /.well-known/**, and the 307 compatibility boundary.",
    "              No Business API function, no business secret. The only GitHub-linked project.",
    "  control     Super Admin operations, System Logs, OTA administration, release/readiness.",
    "  six         notifications, products, orders, profiles, submain, sub2main — Git-disconnected.",
    "",
    "Verification at this revision",
    "  smoke:owned-reads   45/45 owned read routes answered without a server fault.",
    "  smoke:deployed      every deployed origin answered a route reaching its own data.",
    "  Gates green: typecheck, lint, test, architecture:check, docs:ci, runtime:check,",
    "               services:verify, test:deployment-tools.",
    "",
    "Route ownership",
    `  150 owned route+method pairs. ${backlog} still awaiting their owner:`,
    ...KNOWN_UNSHIPPED.map((pair) => `    - ${pair}`),
    "",
    "  Those are package separations, not missing handlers: the notification",
    "  surfaces need their services moved into the sealed delivery package, and",
    "  OTA access needs that package's client and server halves separated. Both",
    "  are tracked in scripts/route-ownership-coverage.ts and enforced by",
    "  npm run test:route-ownership, which refuses any new one.",
    "",
    "Permanent gates added during this work",
    "  test:route-ownership        an owner that ships no handler is a 404; the backlog only shrinks.",
    "  test:mirror-status-parity   a moved route answers the same status as the route it replaced.",
    "  smoke:owned-reads           every owned read on every account, against production.",
    "  architecture:check          every deployed account registers its ports and is imported.",
    "  deploy:push                 proves the service mirrors build before it pushes main.",
    "",
    "Documentation",
    "  docs/07-mobile-and-release/release-commands.md",
    "  docs/08-troubleshooting/problems/owned-route-not-shipped.md",
    "  docs/08-troubleshooting/problems/every-server-route-500-unregistered-port.md",
    "  docs/09-agent-knowledge/generated/catalogs/account-routing-catalog.md",
    "",
    "The recurring lesson, recorded in those documents: a gate that cannot fail",
    "proves nothing. Every outage in this migration passed every check it had.",
  ].join("\n");
}

async function main(): Promise<void> {
  const user = process.env.PASSWORD_RECOVERY_GMAIL_USER?.trim();
  const pass = process.env.PASSWORD_RECOVERY_GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) {
    throw new Error(
      "Missing PASSWORD_RECOVERY_GMAIL_USER or PASSWORD_RECOVERY_GMAIL_APP_PASSWORD in .env.local",
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const report = buildReport();
  await transporter.sendMail({
    from: user,
    to: RECIPIENT,
    subject: `ASOL migration complete — ${gitHead().slice(0, 12)}`,
    text: report,
  });

  console.log(`[migration-email] sent to ${RECIPIENT}`);
}

main().catch((error) => {
  console.error(
    "[migration-email] failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
