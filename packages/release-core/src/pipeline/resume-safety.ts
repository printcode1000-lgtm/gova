import type { DeployAllRunState } from "./state";

export interface ResumeSafetyDecision {
  forceFullValidation: boolean;
  reason?: "missing-state" | "revision-changed" | "input-changed";
}

/**
 * Resume precision is available only for the exact source identity previously
 * proven. Unknown or changed identity expands to a full validation run.
 */
export function decideResumeSafety(input: {
  resumeRequested: boolean;
  currentRevision: string;
  currentSourceFingerprint: string;
  state?: DeployAllRunState;
}): ResumeSafetyDecision {
  if (!input.resumeRequested) return { forceFullValidation: false };
  if (!input.state) return { forceFullValidation: true, reason: "missing-state" };
  if (input.state.revision !== input.currentRevision) {
    return { forceFullValidation: true, reason: "revision-changed" };
  }
  if (input.state.sourceFingerprint !== input.currentSourceFingerprint) {
    return { forceFullValidation: true, reason: "input-changed" };
  }
  return { forceFullValidation: false };
}
