import { execFileSync } from "node:child_process";

import { withoutVsCodeDebuggerEnv } from "./child-process-env";

const APP_ID = "hgh.asol.app";
const platform = process.argv[2];
const targetArg = process.argv.find((argument) =>
  argument.startsWith("--target="),
);
const target = targetArg?.slice("--target=".length).trim();
const env = withoutVsCodeDebuggerEnv(process.env);
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const npxExecutable = process.platform === "win32" ? "npx.cmd" : "npx";

function runFile(executable: string, args: string[]): void {
  execFileSync(executable, args, { stdio: "inherit", env });
}

function ignoreMissingInstallation(action: () => void): void {
  try {
    action();
  } catch {
    console.log(
      "No previous test installation was cleared; the clean run will install a fresh copy.",
    );
  }
}

function runAndroid(): void {
  runFile(npmExecutable, ["run", "cap:build:local"]);
  ignoreMissingInstallation(() => {
    execFileSync(
      "adb",
      [...(target ? ["-s", target] : []), "shell", "pm", "clear", APP_ID],
      { stdio: "inherit", env },
    );
  });
  runFile(npxExecutable, [
    "cap",
    "run",
    "android",
    ...(target ? ["--target", target] : []),
  ]);
}

function runIos(): void {
  if (process.platform !== "darwin") {
    throw new Error("Clean iOS simulator runs require macOS and Xcode.");
  }
  runFile(npmExecutable, ["run", "cap:build:local"]);
  ignoreMissingInstallation(() => {
    execFileSync("xcrun", ["simctl", "uninstall", target || "booted", APP_ID], {
      stdio: "inherit",
      env,
    });
  });
  runFile(npxExecutable, [
    "cap",
    "run",
    "ios",
    ...(target ? ["--target", target] : []),
  ]);
}

if (platform === "android") runAndroid();
else if (platform === "ios") runIos();
else {
  throw new Error(
    "Choose a platform: cap-run-clean.ts android|ios [--target=device-id]",
  );
}
