"use client";

import {
  ANDROID_RELEASE_RUNBOOKS,
  type AndroidReleasePathId,
} from "@asol/release-core/console";

export const STATIC_PREVIEW_URL = "http://127.0.0.1:5500/";
export const PREVIEW_PROBE_TIMEOUT_MS = 2500;

export type AndroidReleaseSecondaryAction = {
  readonly id: string;
  readonly label: string;
  readonly icon: "folder" | "tests" | "device";
};

export type AndroidReleasePath = {
  readonly id: AndroidReleasePathId;
  readonly title: string;
  readonly description: string;
  readonly action: string;
  readonly danger?: boolean;
  readonly secondaries?: readonly AndroidReleaseSecondaryAction[];
};

/**
 * UI copy for each android runbook path. Keys are `AndroidReleasePathId` so a
 * new runbook without a card fails typecheck instead of shipping a silent gap.
 */
const ANDROID_RELEASE_PATH_META: {
  readonly [K in AndroidReleasePathId]: Omit<AndroidReleasePath, "id">;
} = {
  "release-android": {
    title: "releaseConsole.androidPaths.release.title",
    description: "releaseConsole.androidPaths.release.description",
    action: "releaseConsole.androidPaths.release.action",
  },
  "build-static": {
    title: "releaseConsole.androidPaths.buildStatic.title",
    description: "releaseConsole.androidPaths.buildStatic.description",
    action: "releaseConsole.androidPaths.buildStatic.action",
  },
  "cap-prepare-android": {
    title: "releaseConsole.androidPaths.prepare.title",
    description: "releaseConsole.androidPaths.prepare.description",
    action: "releaseConsole.androidPaths.prepare.action",
    secondaries: [
      { id: "cap-open-android", label: "releaseConsole.build.openAndroidStudio", icon: "folder" },
    ],
  },
  "android-build-debug": {
    title: "releaseConsole.androidPaths.debugApk.title",
    description: "releaseConsole.androidPaths.debugApk.description",
    action: "releaseConsole.androidPaths.debugApk.action",
    secondaries: [
      { id: "run-test-suite", label: "releaseConsole.androidPaths.debugApk.tests", icon: "tests" },
      {
        id: "run-device-tests",
        label: "releaseConsole.androidPaths.debugApk.deviceTests",
        icon: "device",
      },
    ],
  },
  "ota-publish": {
    title: "releaseConsole.androidPaths.publishOta.title",
    description: "releaseConsole.androidPaths.publishOta.description",
    action: "releaseConsole.androidPaths.publishOta.action",
    danger: true,
  },
};

/** Card order follows `ANDROID_RELEASE_RUNBOOKS` object key order. */
export const ANDROID_RELEASE_PATHS: readonly AndroidReleasePath[] = (
  Object.keys(ANDROID_RELEASE_RUNBOOKS) as AndroidReleasePathId[]
).map((id) => ({ id, ...ANDROID_RELEASE_PATH_META[id] }));
