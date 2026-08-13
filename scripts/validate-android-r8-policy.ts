import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface AndroidR8PolicySources {
  buildGradle: string;
  properties: string;
  appRules: string;
  capacitorRules: string;
  fastfile: string;
}

function requireMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) throw new Error(message);
}

export function findGradleBlock(source: string, blockName: string, startAt = 0): string | null {
  const pattern = new RegExp(`${blockName}\\s*\\{`, "g");
  pattern.lastIndex = startAt;
  const match = pattern.exec(source);
  if (!match) return null;
  let depth = 1;
  const bodyStart = pattern.lastIndex;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart, index);
  }
  return null;
}

export function findFastlaneLanes(source: string): Array<{ name: string; body: string }> {
  const lanes: Array<{ name: string; body: string }> = [];
  const lanePattern = /lane\s+:(\w+)\s+do\b/g;
  let match: RegExpExecArray | null;
  while ((match = lanePattern.exec(source))) {
    let depth = 1;
    const bodyStart = lanePattern.lastIndex;
    const tokens = /\b(do|end)\b/g;
    tokens.lastIndex = bodyStart;
    let token: RegExpExecArray | null;
    while ((token = tokens.exec(source))) {
      if (token[1] === "do") depth += 1;
      else depth -= 1;
      if (depth === 0) {
        lanes.push({ name: match[1]!, body: source.slice(bodyStart, token.index) });
        lanePattern.lastIndex = tokens.lastIndex;
        break;
      }
    }
    if (depth !== 0) throw new Error(`Fastlane lane ${match[1]} has an unmatched do/end block.`);
  }
  return lanes;
}

export function validateAndroidR8PolicySources(sources: AndroidR8PolicySources): void {
  const buildTypesBlock = findGradleBlock(sources.buildGradle, "buildTypes");
  const releaseBlock = buildTypesBlock ? findGradleBlock(buildTypesBlock, "release") : null;
  const releaseNoR8Block = buildTypesBlock ? findGradleBlock(buildTypesBlock, "releaseNoR8") : null;
  if (!releaseBlock) throw new Error("android/app/build.gradle must define a release build type with R8 settings.");
  requireMatch(releaseBlock, /minifyEnabled\s*(?:=\s*)?true/, "The Android release build must enable R8 with minifyEnabled true.");
  requireMatch(releaseBlock, /shrinkResources\s*(?:=\s*)?true/, "The Android release build must enable shrinkResources true.");
  requireMatch(releaseBlock, /getDefaultProguardFile\(['\"]proguard-android-optimize\.txt['\"]\)/, "The Android release build must use proguard-android-optimize.txt.");
  requireMatch(releaseBlock, /['\"]proguard-rules\.pro['\"]/, "The Android release build must include the app ProGuard rules.");
  // The testing variant exists so a device runs the same shrunk, obfuscated
  // code a release ships. A `debugR8` that quietly stopped minifying would
  // still build, still install, and still pass — while testing nothing R8 does.
  const debugR8Block = buildTypesBlock ? findGradleBlock(buildTypesBlock, "debugR8") : null;
  if (debugR8Block) {
    requireMatch(debugR8Block, /minifyEnabled\s*(?:=\s*)?true/, "The debugR8 build type must enable R8 with minifyEnabled true; it exists to test the optimized code on a device.");
    requireMatch(debugR8Block, /shrinkResources\s*(?:=\s*)?true/, "The debugR8 build type must enable shrinkResources true.");
    requireMatch(debugR8Block, /getDefaultProguardFile\(['\"]proguard-android-optimize\.txt['\"]\)/, "The debugR8 build type must use proguard-android-optimize.txt, like release.");
    requireMatch(debugR8Block, /['\"]proguard-rules\.pro['\"]/, "The debugR8 build type must include the app ProGuard rules, like release.");
    // Debuggable and debug-signed on purpose: WebView inspection and the
    // instrumentation runner both need it, and the debug key must never be
    // confused for the release one.
    requireMatch(debugR8Block, /debuggable\s*(?:=\s*)?true/, "The debugR8 build type must stay debuggable for WebView inspection and instrumented tests.");
    requireMatch(debugR8Block, /signingConfig\s+signingConfigs\.debug/, "The debugR8 build type must be signed with the debug key, never the release keystore.");
    // The instrumentation APK is minified too, because it links against this
    // obfuscated app. Its rules keep the reflectively discovered test classes;
    // without them the suite shrinks away and reports a green run that
    // executed nothing.
    requireMatch(debugR8Block, /testProguardFiles\s+['\"]proguard-rules-test-apk\.pro['\"]/, "The debugR8 build type must apply the test-APK R8 rules, or the instrumented suite is shrunk away.");
  }
  if (releaseNoR8Block) {
    requireMatch(releaseNoR8Block, /versionNameSuffix\s*(?:=)?\s*['\"][^'\"]*-nor8[^'\"]*['\"]/, "releaseNoR8 must declare a versionNameSuffix containing -nor8.");
    if (/minifyEnabled\s*(?:=\s*)?true/.test(releaseNoR8Block)) throw new Error("releaseNoR8 must not set minifyEnabled true.");
    requireMatch(sources.buildGradle, /asol\.allowNoR8/, "releaseNoR8 assemble/bundle tasks must be protected by the asol.allowNoR8 Gradle property.");
  }
  for (const lane of findFastlaneLanes(sources.fastfile)) {
    if (/upload_to_play_store/.test(lane.body) && /ReleaseNoR8|releaseNoR8|no_r8/.test(lane.body)) throw new Error(`Publishing lane ${lane.name} must not reference releaseNoR8/no_r8 outputs.`);
  }
  if (/android\.enableR8\.fullMode\s*=\s*false/.test(sources.properties)) throw new Error("R8 full mode must not be disabled.");
  if (/android\.r8\.strictFullModeForKeepRules\s*=\s*false/.test(sources.properties)) throw new Error("Strict R8 keep-rule semantics must not be disabled.");
  if (/android\.r8\.optimizedResourceShrinking\s*=\s*false/.test(sources.properties)) throw new Error("Optimized R8 resource shrinking must not be disabled.");
  requireMatch(sources.appRules, /@android\.webkit\.JavascriptInterface\s+<methods>;/, "App R8 rules must preserve WebView JavaScript interface methods.");
  requireMatch(sources.appRules, /RuntimeVisibleAnnotations/, "App R8 rules must preserve runtime-visible annotations.");
  requireMatch(sources.capacitorRules, /extends\s+com\.getcapacitor\.Plugin/, "Installed Capacitor consumer rules must preserve Plugin subclasses.");
  requireMatch(sources.capacitorRules, /@com\.getcapacitor\.PluginMethod/, "Installed Capacitor consumer rules must preserve PluginMethod entry points.");
  for (const forbidden of [/-dontshrink\b/, /-dontoptimize\b/, /-dontobfuscate\b/, /-keep\s+class\s+\*\*/]) {
    if (forbidden.test(sources.appRules)) throw new Error(`App R8 rules contain an optimization-blocking rule: ${forbidden.source}`);
  }
}

function readRequired(filePath: string): string {
  if (!existsSync(filePath)) throw new Error(`Required R8 policy file is missing: ${filePath}`);
  return readFileSync(filePath, "utf8");
}

export function validateAndroidR8Policy(root = process.cwd()): void {
  validateAndroidR8PolicySources({
    buildGradle: readRequired(path.resolve(root, "android", "app", "build.gradle")),
    properties: readRequired(path.resolve(root, "android", "gradle.properties")),
    appRules: readRequired(path.resolve(root, "android", "app", "proguard-rules.pro")),
    capacitorRules: readRequired(path.resolve(root, "node_modules", "@capacitor", "android", "capacitor", "proguard-rules.pro")),
    fastfile: readRequired(path.resolve(root, "fastlane", "Fastfile")),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  validateAndroidR8Policy();
  console.log("Android R8 policy verified: release code/resource optimization is enabled with Capacitor reflection safeguards and no broad optimization blockers.");
}
