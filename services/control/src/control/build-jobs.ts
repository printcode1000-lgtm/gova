import 'server-only';

import { artifactsForJob, buildCommandCatalogPayload, cancelBuildJob, configureReleaseConsolePorts, readBuildJobLog, readBuildJobRecord, listBuildJobs, startBuildJob } from '@asol/release-core/console-server';
import { assertGooglePlayConsoleAllowed, googlePlayFastlaneEnvironment, releaseRequirementSatisfied, resolveNpmCliPath } from '@/features/google-play-console/domain/development-guard.server';
import { analyzeBundleArtifact, compareCachedBundleAnalyses, listCachedBundleAnalyses } from '@asol/release-core/console-artifacts';

/** Exact build-job runner seam for the control plane; no gova composition root. */
configureReleaseConsolePorts({
  assertAllowed: assertGooglePlayConsoleAllowed,
  currentWebContentVersion: process.env.NEXT_PUBLIC_ASOL_WEB_CONTENT_VERSION?.trim() ?? '0.0.0.0',
  releaseRequirementSatisfied,
  resolveNpmCliPath,
  childProcessEnvironment: googlePlayFastlaneEnvironment,
  getAbsoluteJson: async (url, options) => {
    const response = await fetch(url, { cache: 'no-store', signal: options.signal });
    if (!response.ok) throw new Error(`releaseConsoleHttp:${response.status}`);
    return response.json();
  },
});

export { analyzeBundleArtifact, artifactsForJob, buildCommandCatalogPayload, cancelBuildJob, compareCachedBundleAnalyses, listCachedBundleAnalyses, readBuildJobLog, readBuildJobRecord, listBuildJobs, startBuildJob };
