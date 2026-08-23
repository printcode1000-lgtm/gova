import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  BUILD_COMMAND_CATALOG,
  DEPLOY_ALL_RUNBOOK,
  DEPLOY_PUSH_RUNBOOK,
} from "@asol/release-core/console";

/**
 * The console pages must describe commands that exist.
 *
 * `/dev/deploy-all` and `/dev/release-console` render entirely from
 * `DEPLOY_ALL_RUNBOOK`, `DEPLOY_PUSH_RUNBOOK` and `BUILD_COMMAND_CATALOG`, so
 * they follow the repository automatically — a branch added to the runbook
 * appears with no edit to the page.
 *
 * What derivation alone cannot catch is the other direction. Renaming or
 * removing an npm script leaves the catalogs pointing at a command that no
 * longer exists, and the pages keep offering a button that fails only when a
 * person presses it. Nothing was checking that, so this does: every npm command
 * these pages can run must resolve to a real script in `package.json`.
 */
interface PackageJson {
  readonly scripts: Record<string, string>;
}

function rootScripts(): Record<string, string> {
  const file = path.join(process.cwd(), "package.json");
  return (JSON.parse(readFileSync(file, "utf8")) as PackageJson).scripts;
}

function assertScriptExists(scripts: Record<string, string>, command: string, source: string): void {
  // Runbook commands are npm script names, sometimes with arguments appended.
  const name = command.split(" ")[0];
  assert.ok(
    name in scripts,
    `${source} references npm script "${name}", which package.json does not define.`,
  );
}

function main(): void {
  const scripts = rootScripts();

  let checked = 0;
  for (const phase of DEPLOY_ALL_RUNBOOK) {
    for (const section of phase.sections) {
      for (const branch of section.branches) {
        if (branch.kind !== "npm") continue;
        assertScriptExists(scripts, branch.command, `DEPLOY_ALL_RUNBOOK ${phase.id}/${branch.id}`);
        checked += 1;
      }
    }
  }

  for (const phase of DEPLOY_PUSH_RUNBOOK) {
    for (const section of phase.sections) {
      for (const branch of section.branches) {
        if (branch.kind !== "npm") continue;
        assertScriptExists(scripts, branch.command, `DEPLOY_PUSH_RUNBOOK ${phase.id}/${branch.id}`);
        checked += 1;
      }
    }
  }

  for (const command of BUILD_COMMAND_CATALOG) {
    const entry = command as unknown as { id: string; npmScript?: string; script?: string };
    const script = entry.npmScript ?? entry.script;
    if (!script) continue;
    assertScriptExists(scripts, script, `BUILD_COMMAND_CATALOG ${entry.id}`);
    checked += 1;
  }

  assert.ok(checked > 0, "parity check found no commands to verify — the catalogs cannot be empty");
  console.log(
    `console-command parity: ${checked} command(s) referenced by /dev/deploy-all and /dev/release-console all resolve to real npm scripts.`,
  );
}

main();
