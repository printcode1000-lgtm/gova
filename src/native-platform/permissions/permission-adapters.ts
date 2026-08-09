/**
 * Per-kind permission adapters.
 *
 * Single responsibility: translate one permission kind between the unified
 * vocabulary and the plugin that actually owns it. The manager holds no
 * plugin knowledge; every plugin detail lives in exactly one adapter here.
 */

import { createLazyPlugin } from "../core/lazy-plugin";
import { toNativeError } from "../core/errors";
import { hasDom, isNativePlatform } from "../core/platform";
import {
  fromCapacitorState,
  PermissionKinds,
  PermissionStates,
  type PermissionKind,
  type PermissionState,
} from "./types";

interface CapacitorPermissionStatus {
  [key: string]: string | undefined;
}

interface PermissionCapablePlugin {
  checkPermissions: () => Promise<CapacitorPermissionStatus>;
  requestPermissions: (
    options?: Record<string, unknown>,
  ) => Promise<CapacitorPermissionStatus>;
}

export interface PermissionAdapter {
  check(): Promise<PermissionState>;
  request(): Promise<PermissionState>;
}

const cameraPlugin = createLazyPlugin("Camera", async () => {
  const { Camera } = await import("@capacitor/camera");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: Camera as unknown as PermissionCapablePlugin };
});

const geolocationPlugin = createLazyPlugin("Location", async () => {
  const { Geolocation } = await import("@capacitor/geolocation");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: Geolocation as unknown as PermissionCapablePlugin };
});

const speechPlugin = createLazyPlugin("SpeechRecognition", async () => {
  const { SpeechRecognition } = await import(
    "@capgo/capacitor-speech-recognition"
  );
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: SpeechRecognition as unknown as PermissionCapablePlugin };
});

const pushPlugin = createLazyPlugin("Notifications", async () => {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: PushNotifications as unknown as PermissionCapablePlugin };
});

const localNotificationPlugin = createLazyPlugin("LocalNotifications", async () => {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: LocalNotifications as unknown as PermissionCapablePlugin };
});

/**
 * Read one alias out of a Capacitor status object.
 * Plugins name the same concept differently ("camera", "photos", "receive"),
 * so each adapter declares the aliases it accepts.
 */
function readStatus(
  status: CapacitorPermissionStatus,
  aliases: string[],
): PermissionState {
  for (const alias of aliases) {
    if (status[alias] !== undefined) return fromCapacitorState(status[alias]);
  }
  return PermissionStates.Unsupported;
}

function pluginAdapter(
  plugin: { optional: () => Promise<{ plugin: PermissionCapablePlugin } | null> },
  aliases: string[],
  requestOptions?: Record<string, unknown>,
): PermissionAdapter {
  return {
    async check() {
      const instance = (await plugin.optional())?.plugin ?? null;
      if (!instance) return PermissionStates.Unsupported;
      try {
        return readStatus(await instance.checkPermissions(), aliases);
      } catch (error) {
        throw toNativeError("Permissions", error);
      }
    },
    async request() {
      const instance = (await plugin.optional())?.plugin ?? null;
      if (!instance) return PermissionStates.Unsupported;
      try {
        return readStatus(
          await instance.requestPermissions(requestOptions),
          aliases,
        );
      } catch (error) {
        throw toNativeError("Permissions", error);
      }
    },
  };
}

/** Browser permission reads via the Permissions API, where supported. */
async function queryBrowserPermission(
  name: PermissionName,
): Promise<PermissionState> {
  if (!hasDom() || !navigator.permissions?.query) {
    return PermissionStates.Unsupported;
  }
  try {
    const status = await navigator.permissions.query({ name });
    return fromCapacitorState(status.state);
  } catch {
    return PermissionStates.Unsupported;
  }
}

/**
 * Browser media permissions can only be requested by actually opening the
 * device, so the request path starts and immediately stops a stream.
 */
async function requestBrowserMedia(
  constraints: MediaStreamConstraints,
): Promise<PermissionState> {
  if (!hasDom() || !navigator.mediaDevices?.getUserMedia) {
    return PermissionStates.Unsupported;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    for (const track of stream.getTracks()) track.stop();
    return PermissionStates.Granted;
  } catch {
    return PermissionStates.Denied;
  }
}

const webCameraAdapter: PermissionAdapter = {
  check: () => queryBrowserPermission("camera" as PermissionName),
  request: () => requestBrowserMedia({ video: true }),
};

const webMicrophoneAdapter: PermissionAdapter = {
  check: () => queryBrowserPermission("microphone" as PermissionName),
  request: () => requestBrowserMedia({ audio: true }),
};

const webLocationAdapter: PermissionAdapter = {
  check: () => queryBrowserPermission("geolocation"),
  async request() {
    if (!hasDom() || !navigator.geolocation) {
      return PermissionStates.Unsupported;
    }
    return new Promise<PermissionState>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(PermissionStates.Granted),
        (error) =>
          resolve(
            error.code === error.PERMISSION_DENIED
              ? PermissionStates.Denied
              : PermissionStates.Prompt,
          ),
        { timeout: 10_000 },
      );
    });
  },
};

const webNotificationAdapter: PermissionAdapter = {
  async check() {
    if (!hasDom() || !("Notification" in window)) {
      return PermissionStates.Unsupported;
    }
    return fromCapacitorState(
      Notification.permission === "default" ? "prompt" : Notification.permission,
    );
  },
  async request() {
    if (!hasDom() || !("Notification" in window)) {
      return PermissionStates.Unsupported;
    }
    const result = await Notification.requestPermission();
    return fromCapacitorState(result === "default" ? "prompt" : result);
  },
};

/** Photo library access is implicit in the browser file input. */
const alwaysGranted: PermissionAdapter = {
  check: async () => PermissionStates.Granted,
  request: async () => PermissionStates.Granted,
};

const unsupported: PermissionAdapter = {
  check: async () => PermissionStates.Unsupported,
  request: async () => PermissionStates.Unsupported,
};

/**
 * Capacitor Camera accepts an explicit alias list. Requesting only the alias
 * behind the action avoids mixing camera and legacy storage permissions.
 */
export function nativePermissionRequestOptions(
  kind: PermissionKind,
): Record<string, unknown> | undefined {
  if (kind === PermissionKinds.Camera) return { permissions: ["camera"] };
  if (kind === PermissionKinds.Photos) return { permissions: ["photos"] };
  return undefined;
}

const NATIVE_ADAPTERS: Record<PermissionKind, PermissionAdapter> = {
  [PermissionKinds.Camera]: pluginAdapter(
    cameraPlugin,
    ["camera"],
    nativePermissionRequestOptions(PermissionKinds.Camera),
  ),
  [PermissionKinds.Photos]: pluginAdapter(
    cameraPlugin,
    ["photos"],
    nativePermissionRequestOptions(PermissionKinds.Photos),
  ),
  [PermissionKinds.Location]: pluginAdapter(geolocationPlugin, [
    "location",
    "coarseLocation",
  ]),
  [PermissionKinds.Microphone]: pluginAdapter(speechPlugin, [
    "microphone",
    "speechRecognition",
  ]),
  [PermissionKinds.SpeechRecognition]: pluginAdapter(speechPlugin, [
    "speechRecognition",
    "microphone",
  ]),
  [PermissionKinds.Notifications]: pluginAdapter(pushPlugin, ["receive"]),
};

const WEB_ADAPTERS: Record<PermissionKind, PermissionAdapter> = {
  [PermissionKinds.Camera]: webCameraAdapter,
  [PermissionKinds.Photos]: alwaysGranted,
  [PermissionKinds.Location]: webLocationAdapter,
  [PermissionKinds.Microphone]: webMicrophoneAdapter,
  [PermissionKinds.SpeechRecognition]: webMicrophoneAdapter,
  [PermissionKinds.Notifications]: webNotificationAdapter,
};

export function resolveAdapter(kind: PermissionKind): PermissionAdapter {
  const table = isNativePlatform() ? NATIVE_ADAPTERS : WEB_ADAPTERS;
  return table[kind] ?? unsupported;
}

/** Local notifications own a separate OS permission on Android 13+. */
export function localNotificationAdapter(): PermissionAdapter {
  if (!isNativePlatform()) return webNotificationAdapter;
  return pluginAdapter(localNotificationPlugin, ["display"]);
}
