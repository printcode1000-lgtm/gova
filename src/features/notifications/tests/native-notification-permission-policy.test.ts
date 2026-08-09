import assert from "node:assert/strict";

import {
  NativeNotificationPromptActions,
  resolveNativeNotificationPromptAction,
} from "../application/native-notification-permission-policy";

const decide = (
  permissionState: "granted" | "denied" | "prompt" | "blocked" | "unsupported",
  deviceEnabled = false,
  authenticated = true,
  nativePushSupported = true,
) =>
  resolveNativeNotificationPromptAction({
    authenticated,
    nativePushSupported,
    deviceEnabled,
    permissionState,
  });

assert.equal(
  decide("prompt"),
  NativeNotificationPromptActions.Request,
  "A fresh Android 13+ install must offer the in-app opt-in.",
);
assert.equal(
  decide("granted"),
  NativeNotificationPromptActions.Request,
  "Android 12 and below still need the user's app-level opt-in.",
);
assert.equal(
  decide("granted", true),
  NativeNotificationPromptActions.Hidden,
  "An enabled and granted device must not be prompted again.",
);
assert.equal(
  decide("denied"),
  NativeNotificationPromptActions.OpenSettings,
);
assert.equal(
  decide("blocked"),
  NativeNotificationPromptActions.OpenSettings,
);
assert.equal(
  decide("unsupported"),
  NativeNotificationPromptActions.Hidden,
);
assert.equal(
  decide("prompt", false, false),
  NativeNotificationPromptActions.Hidden,
  "Session hydration or guest browsing must not show the dialog.",
);
assert.equal(
  decide("prompt", false, true, false),
  NativeNotificationPromptActions.Hidden,
  "The web application must not show the native opt-in.",
);

console.log("Native notification permission policy tests passed.");
