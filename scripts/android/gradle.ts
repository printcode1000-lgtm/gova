import { execFileSync } from "node:child_process";
import path from "node:path";

/**
 * Run the Gradle wrapper from the Android project.
 *
 * The wrapper is always addressed by its **absolute** path. On Windows the
 * wrapper is a batch file, so it has to be run through `cmd.exe`, and `cmd`
 * resolves a bare name against `PATH` — it only falls back to the current
 * directory when `NoDefaultCurrentDirectoryInExePath` is unset. Visual Studio
 * and the VS Code terminal set that variable, so `cmd /d /c gradlew.bat` with
 * `cwd` pointing at `android/` fails there with "'gradlew.bat' is not
 * recognized" while the identical command works from a plain terminal. Passing
 * the full path removes the lookup entirely.
 */
export const ANDROID_DIRECTORY = path.resolve("android");

export function gradleWrapperPath(androidDirectory = ANDROID_DIRECTORY): string {
  return path.join(
    androidDirectory,
    process.platform === "win32" ? "gradlew.bat" : "gradlew",
  );
}

export function runGradle(
  tasks: string[],
  env: NodeJS.ProcessEnv = process.env,
  androidDirectory = ANDROID_DIRECTORY,
): void {
  const wrapper = gradleWrapperPath(androidDirectory);
  if (process.platform === "win32") {
    execFileSync(
      process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe",
      ["/d", "/c", wrapper, ...tasks],
      { cwd: androidDirectory, stdio: "inherit", env },
    );
    return;
  }
  execFileSync(wrapper, tasks, { cwd: androidDirectory, stdio: "inherit", env });
}
