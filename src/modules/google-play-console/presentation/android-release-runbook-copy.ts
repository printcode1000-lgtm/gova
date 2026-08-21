import {
  allAndroidReleaseBranchIds,
  findAndroidReleaseBranch,
  type AndroidReleaseRunbookBranch,
} from "@asol/release-core/console";

import { BUILD_STATIC_CAP_PREPARE_PATH_HELP } from "./runbook-copy/build-static-cap-prepare-path";
import { DEBUG_HOST_DEVICE_PATH_HELP } from "./runbook-copy/debug-host-device-path";
import { HOST_VERIFY_ALL_PATH_HELP } from "./runbook-copy/host-verify-all-path";
import { OTA_PUBLISH_PATH_HELP } from "./runbook-copy/ota-path";
import { RELEASE_ANDROID_PATH_HELP } from "./runbook-copy/release-android-path";

/** Arabic help overrides for high-signal runnable commands and sensitive paths. */
const DETAILED_HELP: Record<string, string> = {
  ...RELEASE_ANDROID_PATH_HELP,
  ...BUILD_STATIC_CAP_PREPARE_PATH_HELP,
  ...DEBUG_HOST_DEVICE_PATH_HELP,
  ...HOST_VERIFY_ALL_PATH_HELP,
  ...OTA_PUBLISH_PATH_HELP,
};

function defaultHelp(branch: AndroidReleaseRunbookBranch): string {
  if (branch.patternOnly) {
    return (
      `${branch.label} — مرجع فقط داخل الشجرة؛ لا يُشغَّل مباشرة من البطاقة. ` +
      `الصيغة المعروضة: ${branch.command}`
    );
  }
  if (branch.dangerous) {
    return (
      `${branch.label} — أمر حساس (${branch.commandId}). ` +
      "قد يغيّر ملفات الإصدار أو ينشر على R2/Play؛ راجع نافذة التأكيد قبل التشغيل."
    );
  }
  return `${branch.label} — يشغّل ${branch.command} عبر كتالوج release-core (${branch.commandId}).`;
}

export const ANDROID_RELEASE_BRANCH_HELP: Record<string, string> = Object.fromEntries(
  allAndroidReleaseBranchIds().map((id) => {
    const item = findAndroidReleaseBranch(id);
    if (!item) return [id, ""];
    return [id, (DETAILED_HELP[id] ?? defaultHelp(item)).trim()];
  }),
);
