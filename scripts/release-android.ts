import { execFileSync } from "node:child_process";
import path from "node:path";

import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import { reportStage } from "./release-stage";

const tsxCliPath = path.resolve("node_modules", "tsx", "dist", "cli.mjs");
const capBuildPath = path.resolve("scripts", "cap-build.ts");
const signedBuildPath = path.resolve("scripts", "build-android-signed.ts");
const releaseArguments = process.argv.slice(2);
const environment = withoutVsCodeDebuggerEnv(process.env);

reportStage("starting");

// Release choices belong to cap-build: it plans the native version, opens the
// content line, and synchronizes Capacitor. Passing the arguments through a
// compound npm script attached them to the final command instead.
//
// `--no-ota` is not an option here, it is what this path *is*: the shell is
// built to carry its own complete, current bundle, so there is nothing to
// publish at release time and nothing on R2 to reach for. Publishing an OTA
// onto the new shell is a separate, later act.
execFileSync(process.execPath, [tsxCliPath, capBuildPath, "--no-ota", ...releaseArguments], {
  stdio: "inherit",
  env: environment,
});

// A dry run proves the complete release plan and argument forwarding without
// producing signed artifacts.
if (releaseArguments.includes("--dry-run")) process.exit(0);

// Signing starts only after the complete web/native preparation succeeds.
// `ASOL_WEB_BUNDLE_READY` is that proof: cap-build built the bundle, stamped
// the versions it ships with, and synced it into the native projects.
execFileSync(process.execPath, [tsxCliPath, signedBuildPath], {
  stdio: "inherit",
  env: { ...environment, ASOL_WEB_BUNDLE_READY: "1" },
});
