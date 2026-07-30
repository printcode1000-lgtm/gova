import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const appBuildGradlePath = path.resolve("android", "app", "build.gradle");
const gradlePropertiesPath = path.resolve("android", "gradle.properties");
const appRulesPath = path.resolve("android", "app", "proguard-rules.pro");
const capacitorRulesPath = path.resolve(
  "node_modules",
  "@capacitor",
  "android",
  "capacitor",
  "proguard-rules.pro",
);

function readRequired(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`Required R8 policy file is missing: ${filePath}`);
  }
  return readFileSync(filePath, "utf8");
}

function requireMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) throw new Error(message);
}

function findGradleBlock(source: string, blockName: string, startAt = 0): string | null {
  const pattern = new RegExp(`${blockName}\\s*\\{`, "g");
  pattern.lastIndex = startAt;
  const match = pattern.exec(source);
  if (!match) return null;

  let depth = 1;
  const bodyStart = pattern.lastIndex;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart, index);
  }
  return null;
}

const buildGradle = readRequired(appBuildGradlePath);
const properties = readRequired(gradlePropertiesPath);
const appRules = readRequired(appRulesPath);
const capacitorRules = readRequired(capacitorRulesPath);
const buildTypesBlock = findGradleBlock(buildGradle, "buildTypes");
const releaseBlock = buildTypesBlock ? findGradleBlock(buildTypesBlock, "release") : null;

if (!releaseBlock) {
  throw new Error("android/app/build.gradle must define a release build type with R8 settings.");
}

requireMatch(
  releaseBlock,
  /minifyEnabled\s*(?:=\s*)?true/,
  "The Android release build must enable R8 with minifyEnabled true.",
);
requireMatch(
  releaseBlock,
  /shrinkResources\s*(?:=\s*)?true/,
  "The Android release build must enable shrinkResources true.",
);
requireMatch(
  releaseBlock,
  /getDefaultProguardFile\(['"]proguard-android-optimize\.txt['"]\)/,
  "The Android release build must use proguard-android-optimize.txt.",
);
requireMatch(
  releaseBlock,
  /['"]proguard-rules\.pro['"]/,
  "The Android release build must include the app ProGuard rules.",
);

if (/android\.enableR8\.fullMode\s*=\s*false/.test(properties)) {
  throw new Error("R8 full mode must not be disabled.");
}
if (/android\.r8\.strictFullModeForKeepRules\s*=\s*false/.test(properties)) {
  throw new Error("Strict R8 keep-rule semantics must not be disabled.");
}
if (/android\.r8\.optimizedResourceShrinking\s*=\s*false/.test(properties)) {
  throw new Error("Optimized R8 resource shrinking must not be disabled.");
}

requireMatch(
  appRules,
  /@android\.webkit\.JavascriptInterface\s+<methods>;/,
  "App R8 rules must preserve WebView JavaScript interface methods.",
);
requireMatch(
  appRules,
  /RuntimeVisibleAnnotations/,
  "App R8 rules must preserve runtime-visible annotations.",
);
requireMatch(
  capacitorRules,
  /extends\s+com\.getcapacitor\.Plugin/,
  "Installed Capacitor consumer rules must preserve Plugin subclasses.",
);
requireMatch(
  capacitorRules,
  /@com\.getcapacitor\.PluginMethod/,
  "Installed Capacitor consumer rules must preserve PluginMethod entry points.",
);

for (const forbidden of [
  /-dontshrink\b/,
  /-dontoptimize\b/,
  /-dontobfuscate\b/,
  /-keep\s+class\s+\*\*/,
]) {
  if (forbidden.test(appRules)) {
    throw new Error(
      `App R8 rules contain an optimization-blocking rule: ${forbidden.source}`,
    );
  }
}

console.log(
  "Android R8 policy verified: release code/resource optimization is enabled with Capacitor reflection safeguards and no broad optimization blockers.",
);
