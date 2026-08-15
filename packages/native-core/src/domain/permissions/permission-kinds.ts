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
  Granted: "granted",
  Denied: "denied",
  Prompt: "prompt",
  Blocked: "blocked",
  Unsupported: "unsupported",
} as const;

export type PermissionState =
  (typeof PermissionStates)[keyof typeof PermissionStates];

export interface PermissionResult {
  kind: PermissionKind;
  state: PermissionState;
  granted: boolean;
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

export function mapPermissionState(value: string | undefined): PermissionState {
  switch (value) {
    case "granted":
      return PermissionStates.Granted;
    case "denied":
      return PermissionStates.Denied;
    case "prompt":
    case "prompt-with-rationale":
      return PermissionStates.Prompt;
    case "limited":
      return PermissionStates.Granted;
    default:
      return PermissionStates.Unsupported;
  }
}
