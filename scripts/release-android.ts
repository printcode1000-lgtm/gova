import { execFileSync } from "node:child_process";
import path from "node:path";

import { withoutVsCodeDebuggerEnv } from "./child-process-env";
import { loadReleaseEnvironment } from "./load-release-env";
import { reportStage } from "./release-stage";
import { runAndroidBuildPreflight } from "@asol/native-core/scripts/android-build-preflight";
import {
  NATIVE_VERSION_FLAG,
  resolveNativeVersionAction,
} from "./release-android-version-choice";

const tsxCliPath = path.resolve("node_modules", "tsx", "dist", "cli.mjs");
const capBuildPath = path.resolve("scripts", "cap-build.ts");
const signedBuildPath = path.resolve("scripts", "build-android-signed.ts");
const releaseArguments = process.argv.slice(2);
loadReleaseEnvironment();
const environment = withoutVsCodeDebuggerEnv(process.env);

/**
 * A full Android release. The same command the "start full release" button runs
 * (`releaseConsole.androidPaths.release.action`).
 *
 * The button collects one required choice — the Android version action — and
 * `build-job-runner` spawns this script with `--native-version=…`. Launched from VS Code
 * it received no arguments, and `cap-build` fell back to `auto`: a third behaviour the
 * dialog never offers. `auto` is now unreachable on this path. The action is either given
 * as an argument or asked for at the prompt, and a run that can do neither is refused.
 */
async function main(): Promise<void> {
  // Every artifact this command produces is signed and R8-processed. Signing is already
  // unavoidable — `build-android-signed.ts` refuses when any keystore variable is missing —
  // but R8 was not: `cap-build` permits `--no-r8` alongside `--no-ota`, and `--no-ota` is
  // exactly what this path passes. So `release:android --no-r8` would have assembled
  // `releaseNoR8` artifacts with `minifyEnabled false`, then signed a separate `release`
  // build on top, leaving two different outputs from one release run.
  //
  // `--no-r8` stays available where it belongs: local diagnostics through
  // `cap-build --skip-ota --no-r8`, which produces nothing anyone can ship.
  if (releaseArguments.includes("--no-r8")) {
    throw new Error(
      [
        "release:android does not accept --no-r8.",
        "",
        "Every package this command produces is signed and R8-processed: an unminified",
        "shell is not a release candidate, and Google Play would receive something no",
        "local test exercised.",
        "",
        "For an unminified diagnostic build, use cap-build directly:",
        "  npx tsx scripts/cap-build.ts --skip-ota --no-r8",
      ].join("\n"),
    );
  }

  const nativeVersionAction = await resolveNativeVersionAction(releaseArguments);

  // The resolved action replaces any copy that arrived in argv, so `cap-build` cannot
  // receive two conflicting values and reject the run after the question was answered.
  const forwarded = [
    ...releaseArguments.filter((argument) => !argument.startsWith(NATIVE_VERSION_FLAG)),
    `${NATIVE_VERSION_FLAG}${nativeVersionAction}`,
  ];

  reportStage("starting");
  reportStage("preflight");
  runAndroidBuildPreflight({ env: environment });

  // Release choices belong to cap-build: it plans the native version, opens the
  // content line, and synchronizes Capacitor. Passing the arguments through a
  // compound npm script attached them to the final command instead.
  //
  // `--no-ota` is not an option here, it is what this path *is*: the shell is
  // built to carry its own complete, current bundle, so there is nothing to
  // publish at release time and nothing on R2 to reach for. Publishing an OTA
  // onto the new shell is a separate, later act.
  execFileSync(process.execPath, [tsxCliPath, capBuildPath, "--no-ota", ...forwarded], {
    stdio: "inherit",
    env: environment,
  });

  // A dry run proves the complete release plan and argument forwarding without
  // producing signed artifacts.
  if (forwarded.includes("--dry-run")) return;

  // Signing starts only after the complete web/native preparation succeeds.
  // `ASOL_WEB_BUNDLE_READY` is that proof: cap-build built the bundle, stamped
  // the versions it ships with, and synced it into the native projects.
  execFileSync(process.execPath, [tsxCliPath, signedBuildPath], {
    stdio: "inherit",
    env: { ...environment, ASOL_WEB_BUNDLE_READY: "1" },
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
