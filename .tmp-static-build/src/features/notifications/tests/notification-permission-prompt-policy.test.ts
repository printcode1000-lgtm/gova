import assert from "node:assert/strict";

import {
  NotificationPromptActions,
  resolveNotificationPromptAction,
} from "../application/notification-permission-prompt-policy";

const decide = (
  permissionState: "granted" | "denied" | "prompt" | "blocked" | "unsupported",
  deviceEnabled = false,
  authenticated = true,
  pushSupported = true,
) =>
  resolveNotificationPromptAction({
    authenticated,
    pushSupported,
    deviceEnabled,
    permissionState,
  });

assert.equal(
  decide("prompt"),
  NotificationPromptActions.Request,
  "A fresh Android 13+ install must offer the in-app opt-in.",
);
assert.equal(
  decide("granted"),
  NotificationPromptActions.Request,
  "Android 12 and below still need the user's app-level opt-in.",
);
assert.equal(
  decide("granted", true),
  NotificationPromptActions.Hidden,
  "An enabled and granted device must not be prompted again.",
);
assert.equal(
  decide("denied"),
  NotificationPromptActions.OpenSettings,
);
assert.equal(
  decide("blocked"),
  NotificationPromptActions.OpenSettings,
);
assert.equal(
  decide("unsupported"),
  NotificationPromptActions.Hidden,
);
assert.equal(
  decide("prompt", false, false),
  NotificationPromptActions.Hidden,
  "Session hydration or guest browsing must not show the dialog.",
);
assert.equal(
  decide("prompt", false, true, false),
  NotificationPromptActions.Hidden,
  "A platform with no push transport at all must stay silent.",
);

// The dialog is platform-agnostic: a secure browser reports `pushSupported`
// exactly like a native shell, so the same states resolve the same way.
assert.equal(
  decide("prompt", false, true, true),
  NotificationPromptActions.Request,
  "A browser that supports Web Push must be offered the opt-in.",
);
assert.equal(
  decide("granted", true, true, true),
  NotificationPromptActions.Hidden,
  "A browser holding a live subscription must not be prompted again.",
);

console.log("Notification permission prompt policy tests passed.");
