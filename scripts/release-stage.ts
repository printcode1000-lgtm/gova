/**
 * Single responsibility: announce which stage of a release a script has
 * reached, in a form the release console can read back.
 *
 * The console used to infer the stage from whatever the build happened to
 * print, which meant a long silent step looked identical to a stalled one —
 * the card showed a spinner and a job id and nothing else. A script that knows
 * its own plan should say so rather than leave the reader to guess, so each
 * step prints a marker and `nextBuildJobStage` trusts it over the heuristics.
 *
 * The marker is deliberately its own line and prefixed: build output is
 * interleaved from several child processes, and a bare word would be matched
 * inside unrelated text.
 */
import type { BuildJobStage } from "@asol/release-core/console";

export const RELEASE_STAGE_MARKER_PREFIX = "[stage]";
export const RELEASE_STEP_MARKER_PREFIX = "[step]";

export function reportStage(stage: BuildJobStage): void {
  console.log(`${RELEASE_STAGE_MARKER_PREFIX} ${stage}`);
}

/**
 * The specific piece of work running inside the current stage — which check,
 * which test, which package is being removed.
 *
 * A stage answers "what part of the build is this"; a run of thirty checks
 * spends all of it under one stage, and the reader still cannot tell progress
 * from a hang. The step is free text on purpose: the set of checks changes, and
 * an enum would have to be edited every time one is added.
 */
export function reportStep(step: string): void {
  console.log(`${RELEASE_STEP_MARKER_PREFIX} ${step.replace(/[\r\n]+/g, " ").trim()}`);
}
