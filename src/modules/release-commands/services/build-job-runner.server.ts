import "server-only";

import { asolApi } from "@/core/api";
import { CURRENT_WEB_CONTENT_VERSION } from "@/core/config/app-version";
import {
  assertGooglePlayConsoleAllowed,
  googlePlayFastlaneEnvironment,
  releaseRequirementSatisfied,
  resolveNpmCliPath,
} from "@/modules/google-play-console/domain/development-guard.server";
import {
  configureReleaseConsolePorts,
} from "@asol/release-core/console-server";

configureReleaseConsolePorts({
  assertAllowed: assertGooglePlayConsoleAllowed,
  currentWebContentVersion: CURRENT_WEB_CONTENT_VERSION,
  releaseRequirementSatisfied,
  resolveNpmCliPath,
  childProcessEnvironment: googlePlayFastlaneEnvironment,
  getAbsoluteJson: (url, options) => asolApi.getAbsoluteJson(url, options),
});

export * from "@asol/release-core/console-server";
