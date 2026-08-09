import { execFileSync } from "node:child_process";
import path from "node:path";

import { withoutVsCodeDebuggerEnv } from "./child-process-env";

const tsxCliPath = path.resolve("node_modules", "tsx", "dist", "cli.mjs");
const capBuildPath = path.resolve("scripts", "cap-build.ts");
const signedBuildPath = path.resolve("scripts", "build-android-signed.ts");
const releaseArguments = process.argv.slice(2);
const environment = withoutVsCodeDebuggerEnv(process.env);

// Release choices belong to cap-build: it plans the native version, publishes
// or resumes OTA, verifies R2, and synchronizes Capacitor. Passing the arguments
// through a compound npm script attached them to the final command instead.
execFileSync(process.execPath, [tsxCliPath, capBuildPath, ...releaseArguments], {
  stdio: "inherit",
  env: environment,
});

// A dry run proves the complete release plan and argument forwarding without
// producing signed artifacts.
if (releaseArguments.includes("--dry-run")) process.exit(0);

// Signing starts only after the complete OTA/native preparation succeeds.
execFileSync(process.execPath, [tsxCliPath, signedBuildPath], {
  stdio: "inherit",
  env: { ...environment, ASOL_WEB_BUNDLE_READY: "1" },
});
