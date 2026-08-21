import type { BuildJobStage } from "./build-job-types";

const STAGE_ORDER: readonly BuildJobStage[] = [
  "queued", "starting", "checking-compatibility", "testing", "building-web",
  "preparing-artifacts", "syncing-native", "building-android", "optimizing", "signing",
  "detecting-device", "wiping-device", "installing-device", "testing-on-device",
  "uploading", "publishing-manifest", "mirroring", "verifying", "finalizing-results", "completed",
];

const STAGE_IDS = new Set<string>(STAGE_ORDER);

/**
 * A stage a script announced about itself (see scripts/release-stage.ts).
 *
 * Announced stages are authoritative and are *not* held to `STAGE_ORDER`: a
 * script reports its steps in the order it actually performs them, and that
 * order differs between paths — publishing verifies R2 before syncing
 * Capacitor, while a store release never verifies anything at all. Ranking
 * those against one fixed sequence is what made a real step look like it never
 * happened.
 */
const ANNOUNCED_STAGE = /\[stage\]\s+([a-z-]+)/gi;

const STAGE_PATTERNS: readonly [BuildJobStage, RegExp][] = [
  ["checking-compatibility", /OTA native compatibility|native compatibility report/i],
  ["building-web", /npm run build:static|next build|Creating an optimized production build/i],
  ["preparing-artifacts", /collecting page data|generating static pages|R2 delta:/i],
  ["syncing-native", /npx cap (?:sync|copy)|Syncing (?:Android|iOS)|capacitor sync/i],
  ["building-android", /assembleDebug|assembleRelease|bundleRelease|Gradle build/i],
  ["optimizing", /\bR8\b|minif(?:y|ication)|shrinkResources/i],
  ["signing", /Signing (?:the )?(?:AAB|APK|bundle)|jarsigner|apksigner/i],
  ["testing", /npm (?:run )?test|tests? passed|running tests?/i],
  ["uploading", /uploaded \d+\/\d+|Uploading .*R2|R2 delta:/i],
  ["publishing-manifest", /Per-file publish window|manifest commit/i],
  ["mirroring", /Refreshing the legacy OTA origin|mirrored \(/i],
  ["verifying", /OTA .* published|Manifest: https?:\/\//i],
];

/** The last stage a script announced in this chunk, if any. */
function announcedStage(output: string): BuildJobStage | undefined {
  let latest: BuildJobStage | undefined;
  for (const match of output.matchAll(ANNOUNCED_STAGE)) {
    const candidate = match[1]!.toLowerCase();
    if (STAGE_IDS.has(candidate)) latest = candidate as BuildJobStage;
  }
  return latest;
}

export function nextBuildJobStage(
  current: BuildJobStage,
  output: string,
): BuildJobStage {
  const announced = announcedStage(output);
  if (announced) return announced;
  let next = current;
  for (const [stage, pattern] of STAGE_PATTERNS) {
    if (pattern.test(output) && STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(next)) next = stage;
  }
  return next;
}

/** Free text a script announced about the work inside the current stage. */
const ANNOUNCED_STEP = /\[step\][ \t]*(.+)/g;

/**
 * The step a script last announced, or the current one when this chunk of
 * output carried none.
 *
 * Capped because it is rendered inside a button: a step that reported a full
 * command line would push the label past the edge of the card.
 */
export function nextBuildJobActivity(
  current: string | undefined,
  output: string,
): string | undefined {
  let latest: string | undefined;
  for (const match of output.matchAll(ANNOUNCED_STEP)) {
    const text = match[1]!.trim();
    if (text) latest = text.length > 80 ? `${text.slice(0, 79)}…` : text;
  }
  return latest ?? current;
}
