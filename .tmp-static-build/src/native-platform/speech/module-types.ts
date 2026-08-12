/**
 * Re-exports used by `speech.ts` so the facade depends on one import path.
 * Keeps the permission type out of the speech contract file itself.
 */

export type { PermissionResult as PermissionResultLike } from "../permissions/types";
export type { SpeechOptions, SpeechResult, SpeechSession } from "./types";
