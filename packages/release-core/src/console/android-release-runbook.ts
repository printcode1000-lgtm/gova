export interface AndroidReleaseRunbookBranch {
  id: string;
  label: string;
  command: string;
  commandId: string;
  parameters?: Record<string, unknown>;
  dangerous?: boolean;
  /** Display-only variant; operator supplies values through the confirmation dialog. */
  patternOnly?: boolean;
}

export interface AndroidReleaseRunbookSection {
  id: string;
  label: string;
  branches: readonly AndroidReleaseRunbookBranch[];
}

export interface AndroidReleaseRunbookPhase {
  id: string;
  label: string;
  sections: readonly AndroidReleaseRunbookSection[];
}

function branch(
  id: string,
  label: string,
  command: string,
  commandId: string,
  options: {
    parameters?: Record<string, unknown>;
    dangerous?: boolean;
    patternOnly?: boolean;
  } = {},
): AndroidReleaseRunbookBranch {
  return {
    id,
    label,
    command,
    commandId,
    parameters: options.parameters,
    dangerous: options.dangerous,
    patternOnly: options.patternOnly,
  };
}

export const ANDROID_RELEASE_RUNBOOKS = {
  "release-android": [
    {
      id: "native-release",
      label: "full Android release orchestration",
      sections: [
        {
          id: "version-choice",
          label: "shell version selection",
          branches: [
            branch(
              "release-android-current",
              "rebuild at current Production versionName",
              "npm run release:android -- --native-version=current",
              "release-android",
              { parameters: { nativeVersionAction: "keep-current" } },
            ),
            branch(
              "release-android-next-patch",
              "increment versionName/versionCode to next patch",
              "npm run release:android -- --native-version=next-patch",
              "release-android",
              { parameters: { nativeVersionAction: "increment-patch" } },
            ),
          ],
        },
      ],
    },
  ],
  "build-static": [
    {
      id: "web-bundle",
      label: "static web export",
      sections: [
        {
          id: "static-export",
          label: "build:static variants",
          branches: [
            branch(
              "build-static-default",
              "standard static export",
              "npm run build:static",
              "build-static",
            ),
            branch(
              "build-static-diagnostic",
              "static export with diagnostic bundle metadata",
              "npm run build:static -- --diagnostic",
              "build-static",
              { parameters: { diagnostic: true } },
            ),
          ],
        },
      ],
    },
  ],
  "cap-prepare-android": [
    {
      id: "capacitor-prep",
      label: "Capacitor Android preparation",
      sections: [
        {
          id: "sync",
          label: "web bundle sync",
          branches: [
            branch(
              "cap-prepare-android",
              "fresh web build then cap sync into Android",
              "npm run cap:prepare:android",
              "cap-prepare-android",
            ),
          ],
        },
        {
          id: "ide",
          label: "Android Studio",
          branches: [
            branch(
              "cap-open-android",
              "open the native Android project in Android Studio",
              "npm run cap:open:android",
              "cap-open-android",
            ),
          ],
        },
      ],
    },
  ],
  "android-build-debug": [
    {
      id: "device-testing",
      label: "on-device testing path",
      sections: [
        {
          id: "package",
          label: "debugR8 package",
          branches: [
            branch(
              "android-build-debug",
              "fresh web sync then assembleDebugR8 APK",
              "npm run android:build:debug",
              "android-build-debug",
            ),
          ],
        },
        {
          id: "verification",
          label: "host and connected-device suites",
          branches: [
            branch(
              "run-test-suite",
              "repository host verification suite",
              "npm run verify:all",
              "run-test-suite",
            ),
            branch(
              "run-device-tests",
              "connected-device Android instrumentation",
              "npm run android:device:tests",
              "run-device-tests",
            ),
            branch(
              "run-device-tests-serial",
              "connected-device tests on one serial",
              "npm run android:device:tests -- --device=<serial>",
              "run-device-tests",
              { patternOnly: true },
            ),
          ],
        },
      ],
    },
  ],
  "ota-publish": [
    {
      id: "ota-publish",
      label: "OTA publish to R2",
      sections: [
        {
          id: "publish-mode",
          label: "ota:publish variants",
          branches: [
            branch(
              "ota-publish-default",
              "publish a new OTA from the current bundle",
              "npm run ota:publish",
              "ota-publish",
              { dangerous: true },
            ),
            branch(
              "ota-publish-mandatory",
              "publish and mark the update mandatory",
              "npm run ota:publish -- --mandatory",
              "ota-publish",
              { parameters: { mandatory: true }, dangerous: true },
            ),
            branch(
              "ota-publish-min-native",
              "publish with a minimum native shell version gate",
              "npm run ota:publish -- --minimum-native-version=<version>",
              "ota-publish",
              { patternOnly: true, dangerous: true },
            ),
            branch(
              "ota-publish-notes",
              "publish with operator notes attached",
              "npm run ota:publish -- --notes=<text>",
              "ota-publish",
              { patternOnly: true, dangerous: true },
            ),
          ],
        },
      ],
    },
  ],
} as const satisfies Record<string, readonly AndroidReleaseRunbookPhase[]>;

export type AndroidReleasePathId = keyof typeof ANDROID_RELEASE_RUNBOOKS;

export function androidReleaseRunbookFor(pathId: string): readonly AndroidReleaseRunbookPhase[] {
  return ANDROID_RELEASE_RUNBOOKS[pathId as AndroidReleasePathId] ?? [];
}

export function branchIdsFromAndroidRunbook(
  runbook: readonly AndroidReleaseRunbookPhase[],
): string[] {
  return runbook.flatMap((phase) =>
    phase.sections.flatMap((section) => section.branches.map((item) => item.id)),
  );
}

export function dangerousAndroidBranchIds(
  runbook: readonly AndroidReleaseRunbookPhase[],
): string[] {
  return runbook.flatMap((phase) =>
    phase.sections.flatMap((section) =>
      section.branches.filter((item) => item.dangerous).map((item) => item.id),
    ),
  );
}

export function allAndroidReleaseBranchIds(): string[] {
  return Object.values(ANDROID_RELEASE_RUNBOOKS).flatMap((runbook) =>
    branchIdsFromAndroidRunbook(runbook),
  );
}

export function findAndroidReleaseBranch(
  branchId: string,
): AndroidReleaseRunbookBranch | undefined {
  for (const runbook of Object.values(ANDROID_RELEASE_RUNBOOKS)) {
    for (const phase of runbook) {
      for (const section of phase.sections) {
        const match = section.branches.find((item) => item.id === branchId);
        if (match) return match;
      }
    }
  }
  return undefined;
}
