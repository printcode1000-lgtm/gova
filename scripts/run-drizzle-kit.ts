import { execFileSync } from "node:child_process";

const drizzleArgs = process.argv.slice(2);
if (drizzleArgs.length === 0) {
  throw new Error("Pass a drizzle-kit command, for example: generate");
}

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const prefix = npmCli ? [npmCli] : [];

function npm(args: string[]): void {
  execFileSync(command, [...prefix, ...args], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

try {
  npm([
    "install",
    "--no-save",
    "--package-lock=false",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "drizzle-kit@0.31.10",
  ]);
  npm(["exec", "--no", "--", "drizzle-kit", ...drizzleArgs]);
} finally {
  npm(["prune", "--no-fund"]);
}
