import { execSync, spawn, type SpawnOptions } from "node:child_process";

export const processAdapter = {
  execSync: (command: string, options?: { cwd?: string; env?: NodeJS.ProcessEnv }) => {
    return execSync(command, {
      cwd: options?.cwd,
      env: options?.env,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  },
  spawn: (command: string, args: string[], options?: SpawnOptions) => {
    return options !== undefined
      ? spawn(command, args, options)
      : spawn(command, args);
  },
  cwd: () => process.cwd(),
  exit: (code?: number) => process.exit(code),
  env: () => process.env,
};
