import { syncServiceMirror } from '@asol/service-mirror-core';
import { PROFILES_DECLARATION } from '@asol/vercel-deploy-core';

syncServiceMirror({
  serviceName: 'profiles',
  serviceDir: PROFILES_DECLARATION.serviceDir!,
  entryPoints: PROFILES_DECLARATION.mirrorEntryPoints,
  runtimeAssets: PROFILES_DECLARATION.runtimeAssets,
});
