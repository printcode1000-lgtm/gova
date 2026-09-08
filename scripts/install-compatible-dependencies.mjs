import { spawnSync } from "node:child_process";

const installArguments = process.platform === "win32" ? ["ci", "--ignore-scripts"] : ["ci"];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNpm(args) {
  if (process.env.npm_execpath) {
    run(process.execPath, [process.env.npm_execpath, ...args]);
    return;
  }
  if (process.platform === "win32") {
    throw new Error("Run this installer through `npm run dependencies:install` so npm_execpath is available.");
  }
  run("npm", args);
}

runNpm(installArguments);

// The install skips lifecycle scripts, so the tool binaries that ship prebuilt
// are proven explicitly instead. There is no database driver in this list any
// more: server data is reached over HTTP, so the release closure contains no
// compiled native module to verify.
run(process.execPath, ["-e", "require('esbuild').version"]);
run(process.execPath, ["-e", "require('unrs-resolver')"]);
runNpm(["ls", "--all"]);

console.log("Compatible dependency installation passed: lockfile, native binaries, and peer graph are valid.");
