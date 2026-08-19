import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import { reportStage, reportStep } from "./release-stage";

/**
 * Run every check this repository can run on its own.
 *
 * "On its own" is the boundary: a step belongs here when it needs nothing but
 * the working tree. Steps that write to R2 or require release credentials are
 * deliberately excluded — a verification button that quietly publishes, or that
 * fails because a secret is absent, teaches people to ignore it.
 *
 * Every step runs even after an earlier one fails, so a single run reports the
 * whole picture instead of stopping at the first problem. The exit code is
 * non-zero when any required step failed.
 */
interface Step {
  /** npm script to run. */
  script: string;
  /** Skip with this reason when the prerequisite is missing. */
  skipUnless?: { path: string; reason: string };
}

const STEPS: readonly Step[] = [
  // Static analysis first: the cheapest signals, and the ones that explain the
  // most confusing downstream failures.
  { script: "typecheck" },
  { script: "lint" },
  { script: "architecture:check" },
  { script: "validate-storage-profiles" },
  { script: "validate:error-logging" },
  { script: "version:validate" },
  // The gate list in `.github/workflows/native-core.yml` is a hand-maintained copy of the
  // package gates in package.json, and it had already drifted by seven packages. This asserts
  // the copy rather than trusting it, and pins the `verify` job id that branch protection
  // requires — renaming that job leaves a required check that never reports.
  { script: "ci:coverage" },

  // Native container policy. These read committed project files only.
  { script: "android:backup:validate" },
  { script: "android:r8:validate" },
  { script: "ios:push:validate" },

  // Unit and contract suites.
  { script: "test:categories" },
  { script: "test:installation-bootstrap" },
  { script: "test:runtime-context" },
  { script: "test:r2-storage" },
  { script: "test:release-commands" },
  { script: "test:deployment-tools" },
  { script: "test:shipping-pricing" },
  { script: "test:delivery-planner" },
  { script: "test:seller-discounts" },
  { script: "test:marketplace-orders" },
  { script: "test:notifications" },
  { script: "test:follow" },
  { script: "test:favorites" },
  { script: "test:password-recovery" },
  { script: "test:image-upload-queue" },
  { script: "test:feature-flags" },
  { script: "test:native-core" },
  { script: "test:ota-compatibility" },
  { script: "test:ota-delivery" },
  { script: "test:ota-background" },
  { script: "test:ota-hardening" },
  { script: "test:data-health" },
  { script: "test:dev-cloud-backup" },

  // The package seals. `test:data-core` also carries the offline schema-parity half — the
  // declared shards, the migration DDL, and the table→shard lookup describing one schema. The
  // live half is `db:schema:sync:release` during `deploy:all`, and is deliberately not repeated
  // here: a check that needs a credential cannot be part of a suite meant to run on any checkout.
  { script: "test:data-core" },
  { script: "test:orders-core" },
  { script: "test:compositions" },

  // Between "the mirror was written" and "the mirror builds": a specifier the walker cannot see
  // is never copied, and the remote build still succeeds. Skipped rather than failed when the
  // git-ignored mirrors are absent, so a clean checkout can still run this suite.
  {
    script: "services:verify",
    skipUnless: {
      path: path.join("services", "orders", "generated"),
      reason: "no service mirrors on disk — run npm run services:sync first",
    },
  },

  // Needs a static build to inspect; skipped rather than failed when absent so
  // the suite stays runnable on a clean checkout.
  {
    script: "cap:verify-defaults",
    skipUnless: {
      path: path.join("out", "index.html"),
      reason: "no static build in out/ — run build:static or the debug APK build first",
    },
  },
];

/** Excluded on purpose, with the reason shown in the summary. */
const EXCLUDED: ReadonlyArray<{ script: string; reason: string }> = [
  {
    script: "ota:self-test",
    reason: "writes and deletes a live R2 object and needs the OTA signing key",
  },
];

type Outcome = "passed" | "failed" | "skipped";

function main(): void {
  const env = withoutVsCodeDebuggerEnv(process.env);
  const results: Array<{ script: string; outcome: Outcome; detail?: string; ms: number }> = [];

  reportStage("testing");
  for (const [index, step] of STEPS.entries()) {
    if (step.skipUnless && !existsSync(path.resolve(step.skipUnless.path))) {
      console.log(`\n=== SKIP ${step.script} — ${step.skipUnless.reason} ===`);
      results.push({ script: step.script, outcome: "skipped", detail: step.skipUnless.reason, ms: 0 });
      continue;
    }

    // The console shows this on the button: thirty checks under one stage are
    // indistinguishable from a hang unless each one says its own name.
    reportStep(`${index + 1}/${STEPS.length} ${step.script}`);
    console.log(`\n=== RUN ${step.script} ===`);
    const startedAt = Date.now();
    try {
      execSync(`npm run ${step.script}`, { stdio: "inherit", env });
      results.push({ script: step.script, outcome: "passed", ms: Date.now() - startedAt });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`=== FAILED ${step.script} ===`);
      results.push({ script: step.script, outcome: "failed", detail, ms: Date.now() - startedAt });
    }
  }

  const failed = results.filter((result) => result.outcome === "failed");
  const skipped = results.filter((result) => result.outcome === "skipped");

  console.log("\n\n================ VERIFICATION SUMMARY ================");
  for (const result of results) {
    const mark = result.outcome === "passed" ? "PASS" : result.outcome === "failed" ? "FAIL" : "SKIP";
    const seconds = result.ms > 0 ? ` (${Math.round(result.ms / 1000)}s)` : "";
    console.log(`${mark}  ${result.script}${seconds}`);
  }
  for (const excluded of EXCLUDED) {
    console.log(`OMIT  ${excluded.script} — ${excluded.reason}`);
  }
  console.log(
    `\n${results.length - failed.length - skipped.length} passed, ` +
      `${failed.length} failed, ${skipped.length} skipped, ${EXCLUDED.length} omitted.`,
  );

  if (failed.length > 0) {
    console.error(`\nFailed steps: ${failed.map((result) => result.script).join(", ")}`);
    process.exit(1);
  }
  console.log("\nEverything this repository can verify on its own passed.");
}

main();
