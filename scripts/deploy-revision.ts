#!/usr/bin/env node
import { deployExistingRevision } from "./deploy-push";

function revisionArgument(argv: readonly string[]): string {
  const values = argv.filter((value) => value.startsWith("--revision="));
  if (values.length !== 1 || argv.length !== 1) {
    throw new Error("Usage: npm run deploy:revision -- --revision=<40-character-sha>");
  }
  return values[0]!.slice("--revision=".length);
}

deployExistingRevision(revisionArgument(process.argv.slice(2))).catch((error) => {
  console.error(`[deploy:revision] FAILED — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
