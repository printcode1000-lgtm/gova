"use client";

export const STATIC_PREVIEW_URL = "http://127.0.0.1:5500/";
export const PREVIEW_PROBE_TIMEOUT_MS = 2500;

export type AndroidReleaseSecondaryAction = {
  readonly id: string;
  readonly label: string;
  readonly icon: "folder" | "install" | "tests" | "device";
};

export type AndroidReleasePath = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly action: string;
  readonly danger?: boolean;
  readonly secondaries?: readonly AndroidReleaseSecondaryAction[];
};

export const ANDROID_RELEASE_PATHS = [
  {
    id: "release-android",
    title: "releaseConsole.androidPaths.release.title",
    description: "releaseConsole.androidPaths.release.description",
    action: "releaseConsole.androidPaths.release.action",
  },
  {
    id: "build-static",
    title: "releaseConsole.androidPaths.buildStatic.title",
    description: "releaseConsole.androidPaths.buildStatic.description",
    action: "releaseConsole.androidPaths.buildStatic.action",
  },
  {
    id: "cap-prepare-android",
    title: "releaseConsole.androidPaths.prepare.title",
    description: "releaseConsole.androidPaths.prepare.description",
    action: "releaseConsole.androidPaths.prepare.action",
    secondaries: [
      { id: "cap-open-android", label: "releaseConsole.build.openAndroidStudio", icon: "folder" },
    ],
  },
  {
    id: "android-build-debug",
    title: "releaseConsole.androidPaths.debugApk.title",
    description: "releaseConsole.androidPaths.debugApk.description",
    action: "releaseConsole.androidPaths.debugApk.action",
    secondaries: [
      {
        id: "android-device-install",
        label: "releaseConsole.androidPaths.debugApk.install",
        icon: "install",
      },
      { id: "run-test-suite", label: "releaseConsole.androidPaths.debugApk.tests", icon: "tests" },
      {
        id: "run-device-tests",
        label: "releaseConsole.androidPaths.debugApk.deviceTests",
        icon: "device",
      },
    ],
  },
  {
    id: "ota-publish",
    title: "releaseConsole.androidPaths.publishOta.title",
    description: "releaseConsole.androidPaths.publishOta.description",
    action: "releaseConsole.androidPaths.publishOta.action",
    danger: true,
  },
] as const satisfies readonly AndroidReleasePath[];
