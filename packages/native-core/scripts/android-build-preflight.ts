import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

export const REQUIRED_JDK_MAJOR = 21;

export interface JdkSearchEntry {
  label: string;
  path: string;
  status: "valid" | "missing" | "invalid" | "wrong-version";
  majorVersion?: number;
}

export interface AndroidBuildPreflightFailure {
  missing: string[];
  jdkSearch: JdkSearchEntry[];
  configuredJavaHome?: string;
  resolvedJavaHome?: string;
  configuredAndroidSdkRoot?: string;
  androidSdkRoot?: string;
  gradleWrapper?: string;
}

export interface AndroidBuildPreflightResult {
  javaHome: string;
  androidSdkRoot: string;
  gradleWrapper: string;
  jdkSearch: JdkSearchEntry[];
  env: NodeJS.ProcessEnv;
}

function javaExecutable(javaHome: string): string {
  return path.join(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java");
}

export function isValidJavaHome(candidate: string | undefined): candidate is string {
  return Boolean(candidate && existsSync(javaExecutable(candidate)));
}

function readJdkMajorVersion(javaHome: string): number | null {
  const releaseFile = path.join(javaHome, "release");
  if (existsSync(releaseFile)) {
    const match = /JAVA_VERSION="(\d+)/.exec(readFileSync(releaseFile, "utf8"));
    if (match) return Number(match[1]);
  }
  const result = spawnSync(javaExecutable(javaHome), ["-version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const versionMatch = /version "(\d+)/.exec(output);
  return versionMatch ? Number(versionMatch[1]) : null;
}

function classifyJavaHome(label: string, candidate: string | undefined): JdkSearchEntry | null {
  if (!candidate?.trim()) return null;
  const normalized = candidate.trim();
  if (!existsSync(normalized)) {
    return { label, path: normalized, status: "missing" };
  }
  if (!isValidJavaHome(normalized)) {
    return { label, path: normalized, status: "invalid" };
  }
  const majorVersion = readJdkMajorVersion(normalized);
  if (majorVersion !== null && majorVersion !== REQUIRED_JDK_MAJOR) {
    return { label, path: normalized, status: "wrong-version", majorVersion };
  }
  return { label, path: normalized, status: "valid", majorVersion: majorVersion ?? undefined };
}

function listMatchingDirectories(root: string, pattern: RegExp): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && pattern.test(entry.name))
    .map((entry) => path.join(root, entry.name))
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
}

function discoverFilesystemJdkCandidates(): Array<{ label: string; path: string }> {
  const candidates: Array<{ label: string; path: string }> = [];
  if (process.platform === "win32") {
    const roots: Array<{ root: string; pattern: RegExp; label: string }> = [
      { root: "C:\\Program Files\\Java", pattern: /^jdk-21/i, label: "Program Files\\Java (jdk-21*)" },
      { root: "C:\\Program Files\\Eclipse Adoptium", pattern: /^jdk-21/i, label: "Eclipse Adoptium (jdk-21*)" },
      { root: "C:\\Program Files\\Microsoft", pattern: /^jdk-21/i, label: "Microsoft Build of OpenJDK (jdk-21*)" },
      { root: "C:\\Program Files\\Amazon Corretto", pattern: /^jdk21/i, label: "Amazon Corretto (jdk21*)" },
      { root: "C:\\Program Files (x86)\\Java", pattern: /^jdk-21/i, label: "Program Files (x86)\\Java (jdk-21*)" },
    ];
    for (const { root, pattern, label } of roots) {
      for (const directory of listMatchingDirectories(root, pattern)) {
        candidates.push({ label, path: directory });
      }
    }
    return candidates;
  }
  if (process.platform === "darwin") {
    const jvmRoot = "/Library/Java/JavaVirtualMachines";
    for (const directory of listMatchingDirectories(jvmRoot, /\.jdk$/i)) {
      candidates.push({
        label: "macOS JVM",
        path: path.join(directory, "Contents", "Home"),
      });
    }
    return candidates;
  }
  for (const directory of listMatchingDirectories("/usr/lib/jvm", /^java-(?:21|17)/)) {
    candidates.push({ label: "Linux JVM", path: directory });
  }
  return candidates;
}

export function buildJdkSearchReport(env: NodeJS.ProcessEnv = process.env): JdkSearchEntry[] {
  const entries: JdkSearchEntry[] = [];
  const push = (entry: JdkSearchEntry | null): void => {
    if (entry) entries.push(entry);
  };

  push(classifyJavaHome("ASOL_ANDROID_JAVA_HOME", env.ASOL_ANDROID_JAVA_HOME));
  if (process.platform === "win32") {
    push(classifyJavaHome(
      "Android Studio JBR",
      "C:\\Program Files\\Android\\Android Studio\\jbr",
    ));
  } else if (process.platform === "darwin") {
    push(classifyJavaHome(
      "Android Studio JBR",
      "/Applications/Android Studio.app/Contents/jbr",
    ));
  }
  push(classifyJavaHome("JAVA_HOME", env.JAVA_HOME));

  for (const candidate of discoverFilesystemJdkCandidates()) {
    push(classifyJavaHome(candidate.label, candidate.path));
  }

  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.label}:${entry.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveJavaHome(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return buildJdkSearchReport(env).find((entry) => entry.status === "valid")?.path;
}

export function resolveAndroidSdkRoot(
  root = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const envRoot = env.ANDROID_SDK_ROOT?.trim() || env.ANDROID_HOME?.trim();
  if (envRoot && existsSync(envRoot)) return envRoot;

  const localProperties = path.join(root, "android", "local.properties");
  if (existsSync(localProperties)) {
    const match = /^sdk\.dir=(.+)$/m.exec(readFileSync(localProperties, "utf8"));
    const sdkDir = match?.[1]?.replace(/\\\\/g, "\\").trim();
    if (sdkDir && existsSync(sdkDir)) return sdkDir;
  }

  if (process.platform === "win32" && env.LOCALAPPDATA) {
    const defaultSdk = path.join(env.LOCALAPPDATA, "Android", "Sdk");
    if (existsSync(defaultSdk)) return defaultSdk;
  }

  if (process.platform === "darwin") {
    const defaultSdk = path.join(process.env.HOME ?? "", "Library", "Android", "sdk");
    if (existsSync(defaultSdk)) return defaultSdk;
  }

  const linuxDefault = path.join(process.env.HOME ?? "", "Android", "Sdk");
  if (existsSync(linuxDefault)) return linuxDefault;
  return undefined;
}

function gradleWrapperPath(androidDirectory: string): string {
  return path.join(
    androidDirectory,
    process.platform === "win32" ? "gradlew.bat" : "gradlew",
  );
}

function collectPreflightFailures(options: {
  root: string;
  env: NodeJS.ProcessEnv;
  androidDirectory: string;
}): AndroidBuildPreflightFailure {
  const { root, env, androidDirectory } = options;
  const jdkSearch = buildJdkSearchReport(env);
  const resolvedJavaHome = jdkSearch.find((entry) => entry.status === "valid")?.path;
  const configuredJavaHome = env.JAVA_HOME?.trim();
  const configuredAndroidSdkRoot = env.ANDROID_SDK_ROOT?.trim() || env.ANDROID_HOME?.trim();
  const androidSdkRoot = resolveAndroidSdkRoot(root, env);
  const wrapper = gradleWrapperPath(androidDirectory);
  const missing: string[] = [];

  if (!resolvedJavaHome) {
    if (configuredJavaHome && !existsSync(configuredJavaHome)) {
      missing.push(
        `JDK ${REQUIRED_JDK_MAJOR} (JAVA_HOME is set to an invalid directory: ${configuredJavaHome})`,
      );
    } else if (configuredJavaHome && !isValidJavaHome(configuredJavaHome)) {
      missing.push(
        `JDK ${REQUIRED_JDK_MAJOR} (JAVA_HOME points to ${configuredJavaHome} but bin/java is missing)`,
      );
    } else if (jdkSearch.some((entry) => entry.status === "wrong-version")) {
      const wrong = jdkSearch.find((entry) => entry.status === "wrong-version");
      missing.push(
        `JDK ${REQUIRED_JDK_MAJOR} (found JDK ${wrong?.majorVersion ?? "?"} at ${wrong?.path ?? "unknown path"})`,
      );
    } else {
      missing.push(
        `JDK ${REQUIRED_JDK_MAJOR} (no valid JDK found after searching ASOL_ANDROID_JAVA_HOME, Android Studio JBR, JAVA_HOME, and common install directories)`,
      );
    }
  }

  if (!androidSdkRoot) {
    if (configuredAndroidSdkRoot && !existsSync(configuredAndroidSdkRoot)) {
      missing.push(
        `Android SDK (ANDROID_SDK_ROOT/ANDROID_HOME points to a missing directory: ${configuredAndroidSdkRoot})`,
      );
    } else {
      missing.push(
        "Android SDK root (set ANDROID_SDK_ROOT or ANDROID_HOME, or android/local.properties sdk.dir, or install the default SDK under %LOCALAPPDATA%\\Android\\Sdk)",
      );
    }
  }

  if (!existsSync(wrapper)) {
    missing.push(`Gradle wrapper at ${wrapper}`);
  }

  return {
    missing,
    jdkSearch,
    configuredJavaHome,
    resolvedJavaHome,
    configuredAndroidSdkRoot,
    androidSdkRoot,
    gradleWrapper: wrapper,
  };
}

export function formatAndroidBuildPreflightFailure(failure: AndroidBuildPreflightFailure): string {
  const lines = [
    "Android build preflight failed — could not resolve required paths.",
    "فشل ما قبل بناء Android — تعذّر حل المسارات المطلوبة.",
    "",
    "Unresolved paths / المسارات التي لم تُحل:",
    ...failure.missing.map((item) => `- ${item}`),
    "",
  ];

  if (failure.configuredJavaHome) {
    lines.push(`Configured JAVA_HOME / JAVA_HOME المُعرَّف: ${failure.configuredJavaHome}`);
  }
  if (failure.resolvedJavaHome) {
    lines.push(`Resolved JDK / JDK المُكتشَف: ${failure.resolvedJavaHome}`);
  } else {
    lines.push("Resolved JDK / JDK المُكتشَف: none / لا يوجد");
  }
  if (failure.configuredAndroidSdkRoot) {
    lines.push(
      `Configured ANDROID_SDK_ROOT/ANDROID_HOME / ANDROID_SDK_ROOT المُعرَّف: ${failure.configuredAndroidSdkRoot}`,
    );
  }
  if (failure.androidSdkRoot) {
    lines.push(`Resolved Android SDK root / جذر Android SDK المُكتشَف: ${failure.androidSdkRoot}`);
  } else {
    lines.push("Resolved Android SDK root / جذر Android SDK المُكتشَف: none / لا يوجد");
  }
  if (failure.gradleWrapper) {
    lines.push(`Gradle wrapper / ملف Gradle: ${failure.gradleWrapper}`);
  }

  lines.push("", "Searched JDK locations / مسارات JDK التي تم البحث فيها:");
  for (const entry of failure.jdkSearch) {
    const detail = entry.majorVersion !== undefined ? ` (Java ${entry.majorVersion})` : "";
    lines.push(`- [${entry.status}] ${entry.label}: ${entry.path}${detail}`);
  }

  lines.push(
    "",
    "Fix / الإصلاح:",
    `- Install JDK ${REQUIRED_JDK_MAJOR} LTS and point JAVA_HOME or ASOL_ANDROID_JAVA_HOME at its root directory (the folder that contains bin\\java.exe), for example C:\\Program Files\\Java\\jdk-21.0.12.`,
    `- ثبّت JDK ${REQUIRED_JDK_MAJOR} LTS ووجّه JAVA_HOME أو ASOL_ANDROID_JAVA_HOME إلى جذر التثبيت (المجلد الذي يحتوي bin\\java.exe)، مثل C:\\Program Files\\Java\\jdk-21.0.12.`,
    "- Install the Android SDK through Android Studio, then set ANDROID_SDK_ROOT or add sdk.dir to android/local.properties.",
    "- ثبّت Android SDK عبر Android Studio، ثم عيّن ANDROID_SDK_ROOT أو أضف sdk.dir إلى android/local.properties.",
    "- Optional full environment audit: npm run doctor:environment -- --scenario=android",
    "- تدقيق بيئة اختياري: npm run doctor:environment -- --scenario=android",
  );

  return lines.join("\n");
}

export function runAndroidBuildPreflight(options: {
  root?: string;
  env?: NodeJS.ProcessEnv;
  androidDirectory?: string;
} = {}): AndroidBuildPreflightResult {
  const root = options.root ?? process.cwd();
  const env = options.env ?? process.env;
  const androidDirectory = options.androidDirectory ?? path.join(root, "android");
  const failure = collectPreflightFailures({ root, env, androidDirectory });

  if (failure.missing.length > 0) {
    throw new Error(formatAndroidBuildPreflightFailure(failure));
  }

  const javaHome = failure.resolvedJavaHome!;
  const androidSdkRoot = failure.androidSdkRoot!;
  const gradleWrapper = failure.gradleWrapper!;
  const nextEnv: NodeJS.ProcessEnv = {
    ...env,
    JAVA_HOME: javaHome,
    ANDROID_SDK_ROOT: env.ANDROID_SDK_ROOT ?? androidSdkRoot,
    ANDROID_HOME: env.ANDROID_HOME ?? androidSdkRoot,
    PATH: `${path.join(javaHome, "bin")}${path.delimiter}${env.PATH ?? ""}`,
  };

  return {
    javaHome,
    androidSdkRoot,
    gradleWrapper,
    jdkSearch: failure.jdkSearch,
    env: nextEnv,
  };
}

export function withAndroidBuildPreflightEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return runAndroidBuildPreflight({ env }).env;
}

export function main(): void {
  const result = runAndroidBuildPreflight();
  const configuredJavaHome = process.env.JAVA_HOME?.trim();
  const javaNote = configuredJavaHome && configuredJavaHome !== result.javaHome
    ? ` (JAVA_HOME was ${configuredJavaHome})`
    : "";
  console.log(
    [
      "Android build preflight passed — paths resolved.",
      `JDK: ${result.javaHome}${javaNote}`,
      `Android SDK: ${result.androidSdkRoot}`,
      `Gradle wrapper: ${result.gradleWrapper}`,
    ].join("\n"),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
