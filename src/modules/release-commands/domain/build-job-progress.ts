import type { BuildJobStage } from "./build-job-types";

const STAGE_ORDER: readonly BuildJobStage[] = [
  "queued", "starting", "checking-compatibility", "testing", "building-web",
  "preparing-artifacts", "syncing-native", "building-android", "optimizing",
  "uploading", "publishing-manifest", "mirroring", "verifying", "finalizing-results", "completed",
];

const STAGE_PATTERNS: readonly [BuildJobStage, RegExp][] = [
  ["checking-compatibility", /OTA native compatibility|native compatibility report/i],
  ["building-web", /npm run build:static|next build|Creating an optimized production build/i],
  ["preparing-artifacts", /collecting page data|generating static pages|R2 delta:/i],
  ["syncing-native", /npx cap (?:sync|copy)|Syncing (?:Android|iOS)|capacitor sync/i],
  ["building-android", /assembleDebug|assembleRelease|bundleRelease|Gradle build/i],
  ["optimizing", /\bR8\b|minif(?:y|ication)|shrinkResources/i],
  ["testing", /npm (?:run )?test|tests? passed|running tests?/i],
  ["uploading", /uploaded \d+\/\d+|Uploading .*R2|R2 delta:/i],
  ["publishing-manifest", /Per-file publish window|manifest commit/i],
  ["mirroring", /Refreshing the legacy OTA origin|mirrored \(/i],
  ["verifying", /OTA .* published|Manifest: https?:\/\//i],
];

export function nextBuildJobStage(
  current: BuildJobStage,
  output: string,
): BuildJobStage {
  let next = current;
  for (const [stage, pattern] of STAGE_PATTERNS) {
    if (pattern.test(output) && STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(next)) next = stage;
  }
  return next;
}
