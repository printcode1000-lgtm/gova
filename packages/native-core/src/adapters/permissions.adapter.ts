import { Camera } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { registerPlugin } from "@capacitor/core";
import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import { isAndroid, isIos, isNativePlatform, hasDom } from "./platform.adapter";
import {
  PermissionKinds,
  PermissionStates,
  mapPermissionState,
  toPermissionResult,
  type PermissionKind,
  type PermissionResult,
  type PermissionState,
} from "../domain/permissions/permission-kinds";

const MODULE = "Permissions";

interface NativeSettingsPlugin {
  open: () => Promise<void>;
}

const appSettingsPlugin = createLazyPlugin("AppSettings", async () => {
  return { plugin: registerPlugin<NativeSettingsPlugin>("AppSettings") };
});

interface CapacitorPermissionStatus {
  [key: string]: string | undefined;
}

interface PermissionCapablePlugin {
  checkPermissions: () => Promise<CapacitorPermissionStatus>;
  requestPermissions: (options?: Record<string, unknown>) => Promise<CapacitorPermissionStatus>;
}

const cameraPlugin = createLazyPlugin("Camera", async () => {
  return { plugin: Camera as unknown as PermissionCapablePlugin };
});

const geolocationPlugin = createLazyPlugin("Location", async () => {
  return { plugin: Geolocation as unknown as PermissionCapablePlugin };
});

const speechPlugin = createLazyPlugin("SpeechRecognition", async () => {
  return { plugin: SpeechRecognition as unknown as PermissionCapablePlugin };
});

const pushPlugin = createLazyPlugin("Notifications", async () => {
  return { plugin: PushNotifications as unknown as PermissionCapablePlugin };
});

const localNotificationPlugin = createLazyPlugin("LocalNotifications", async () => {
  return { plugin: LocalNotifications as unknown as PermissionCapablePlugin };
});

function readStatus(status: CapacitorPermissionStatus, aliases: string[]): PermissionState {
  for (const alias of aliases) {
    if (status[alias] !== undefined) return mapPermissionState(status[alias]);
  }
  return PermissionStates.Unsupported;
}

interface PermissionAdapterInterface {
  check(): Promise<PermissionState>;
  request(): Promise<PermissionState>;
}

function pluginAdapter(
  plugin: { optional: () => Promise<{ plugin: PermissionCapablePlugin } | null> },
  aliases: string[],
  requestOptions?: Record<string, unknown>,
): PermissionAdapterInterface {
  return {
    async check() {
      const instance = (await plugin.optional())?.plugin ?? null;
      if (!instance) return PermissionStates.Unsupported;
      try {
        return readStatus(await instance.checkPermissions(), aliases);
      } catch (error) {
        throw toNativeCoreError(MODULE, error);
      }
    },
    async request() {
      const instance = (await plugin.optional())?.plugin ?? null;
      if (!instance) return PermissionStates.Unsupported;
      try {
        return readStatus(await instance.requestPermissions(requestOptions), aliases);
      } catch (error) {
        throw toNativeCoreError(MODULE, error);
      }
    },
  };
}

async function queryBrowserPermission(name: PermissionName): Promise<PermissionState> {
  if (!hasDom() || !navigator.permissions?.query) {
    return PermissionStates.Unsupported;
  }
  try {
    const status = await navigator.permissions.query({ name });
    return mapPermissionState(status.state);
  } catch {
    return PermissionStates.Unsupported;
  }
}

async function requestBrowserMedia(constraints: MediaStreamConstraints): Promise<PermissionState> {
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

const webCameraAdapter: PermissionAdapterInterface = {
  check: () => queryBrowserPermission("camera" as PermissionName),
  request: () => requestBrowserMedia({ video: true }),
};

const webMicrophoneAdapter: PermissionAdapterInterface = {
  check: () => queryBrowserPermission("microphone" as PermissionName),
  request: () => requestBrowserMedia({ audio: true }),
};

const webLocationAdapter: PermissionAdapterInterface = {
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

const webNotificationAdapter: PermissionAdapterInterface = {
  async check() {
    if (!hasDom() || !("Notification" in window)) {
      return PermissionStates.Unsupported;
    }
    return mapPermissionState(
      Notification.permission === "default" ? "prompt" : Notification.permission,
    );
  },
  async request() {
    if (!hasDom() || !("Notification" in window)) {
      return PermissionStates.Unsupported;
    }
    const result = await Notification.requestPermission();
    return mapPermissionState(result === "default" ? "prompt" : result);
  },
};

const alwaysGranted: PermissionAdapterInterface = {
  check: async () => PermissionStates.Granted,
  request: async () => PermissionStates.Granted,
};

const unsupportedAdapter: PermissionAdapterInterface = {
  check: async () => PermissionStates.Unsupported,
  request: async () => PermissionStates.Unsupported,
};

function nativePermissionRequestOptions(kind: PermissionKind): Record<string, unknown> | undefined {
  if (kind === PermissionKinds.Camera) return { permissions: ["camera"] };
  if (kind === PermissionKinds.Photos) return { permissions: ["photos"] };
  return undefined;
}

const NATIVE_ADAPTERS: Record<PermissionKind, PermissionAdapterInterface> = {
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

const WEB_ADAPTERS: Record<PermissionKind, PermissionAdapterInterface> = {
  [PermissionKinds.Camera]: webCameraAdapter,
  [PermissionKinds.Photos]: alwaysGranted,
  [PermissionKinds.Location]: webLocationAdapter,
  [PermissionKinds.Microphone]: webMicrophoneAdapter,
  [PermissionKinds.SpeechRecognition]: webMicrophoneAdapter,
  [PermissionKinds.Notifications]: webNotificationAdapter,
};

function resolveAdapter(kind: PermissionKind): PermissionAdapterInterface {
  const table = isNativePlatform() ? NATIVE_ADAPTERS : WEB_ADAPTERS;
  return table[kind] ?? unsupportedAdapter;
}

export const permissionsAdapter = {
  async check(kind: PermissionKind): Promise<PermissionResult> {
    const state = await resolveAdapter(kind).check();
    return toPermissionResult(kind, state);
  },

  async request(kind: PermissionKind): Promise<PermissionResult> {
    const state = await resolveAdapter(kind).request();
    return toPermissionResult(kind, state);
  },

  async requestIfNeeded(kind: PermissionKind): Promise<PermissionResult> {
    const adapter = resolveAdapter(kind);
    const current = await adapter.check();

    if (current === PermissionStates.Granted || current === PermissionStates.Unsupported) {
      return toPermissionResult(kind, current);
    }

    const next = await adapter.request();

    if (next === PermissionStates.Denied && current === PermissionStates.Denied) {
      return toPermissionResult(kind, PermissionStates.Blocked);
    }
    return toPermissionResult(kind, next);
  },

  async requestLocalNotificationsIfNeeded(): Promise<PermissionResult> {
    const adapter = isNativePlatform()
      ? pluginAdapter(localNotificationPlugin, ["display"])
      : webNotificationAdapter;
    const current = await adapter.check();
    if (current === PermissionStates.Granted || current === PermissionStates.Unsupported) {
      return toPermissionResult("notifications", current);
    }
    return toPermissionResult("notifications", await adapter.request());
  },

  canOpenSettings(): boolean {
    return isNativePlatform() && isAndroid();
  },

  async openSettings(): Promise<boolean> {
    if (!isNativePlatform()) return false;
    const app = (await appSettingsPlugin.optional())?.plugin ?? null;
    if (!app) return false;
    try {
      if (isAndroid() && typeof app.open === "function") {
        await app.open();
        return true;
      }
      if (isIos()) return false;
    } catch (error) {
      console.warn("[NativeCore:Permissions] openSettings failed.", error);
    }
    return false;
  },
};

export const permissionManager = permissionsAdapter;
