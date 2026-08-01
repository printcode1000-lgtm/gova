/**
 * Permission vocabulary for the whole Native Platform layer.
 *
 * Single responsibility: define the unified permission kinds and states.
 * No plugin-specific status strings ever escape the permission adapters.
 */

export const PermissionKinds = {
  Camera: "camera",
  Photos: "photos",
  Location: "location",
  Microphone: "microphone",
  SpeechRecognition: "speech-recognition",
  Notifications: "notifications",
} as const;

export type PermissionKind =
  (typeof PermissionKinds)[keyof typeof PermissionKinds];

export const PermissionStates = {
  /** Access is allowed. */
  Granted: "granted",
  /** Access was refused and can still be asked for. */
  Denied: "denied",
  /** Not asked yet — a request will show the system prompt. */
  Prompt: "prompt",
  /**
   * Refused permanently: the system will not show a prompt again.
   * The only way forward is `openSettings()`.
   */
  Blocked: "blocked",
  /** The platform has no such permission concept, or no plugin is present. */
  Unsupported: "unsupported",
} as const;

export type PermissionState =
  (typeof PermissionStates)[keyof typeof PermissionStates];

export interface PermissionResult {
  kind: PermissionKind;
  state: PermissionState;
  /** True when the caller may proceed with the native operation. */
  granted: boolean;
  /** True when only the OS settings screen can change the outcome. */
  requiresSettings: boolean;
}

export function toPermissionResult(
  kind: PermissionKind,
  state: PermissionState,
): PermissionResult {
  return {
    kind,
    state,
    granted: state === PermissionStates.Granted,
    requiresSettings: state === PermissionStates.Blocked,
  };
}

/**
 * Map a Capacitor `PermissionState` string onto the unified vocabulary.
 * Capacitor reports "prompt-with-rationale" after one denial on Android.
 */
export function fromCapacitorState(value: string | undefined): PermissionState {
  switch (value) {
    case "granted":
      return PermissionStates.Granted;
    case "denied":
      return PermissionStates.Denied;
    case "prompt":
      return PermissionStates.Prompt;
    case "prompt-with-rationale":
      return PermissionStates.Prompt;
    case "limited":
      // iOS "limited" photo access still allows the picker to run.
      return PermissionStates.Granted;
    default:
      return PermissionStates.Unsupported;
  }
}
