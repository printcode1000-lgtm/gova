export {
  isValidJavaHome,
  resolveJavaHome,
  REQUIRED_JDK_MAJOR,
} from "@asol/native-core/scripts/android-build-preflight";

import { resolveJavaHome as resolvePreflightJavaHome } from "@asol/native-core/scripts/android-build-preflight";
import path from "node:path";

export function withGradleJavaEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const javaHome = resolvePreflightJavaHome(env);
  if (!javaHome) return env;
  return {
    ...env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, "bin")}${path.delimiter}${env.PATH ?? ""}`,
  };
}
