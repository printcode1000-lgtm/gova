import { syncServiceMirror } from '@asol/service-mirror-core';
import { SUB2MAIN_DECLARATION } from '@asol/vercel-deploy-core';

syncServiceMirror({
  serviceName: 'sub2main',
  serviceDir: SUB2MAIN_DECLARATION.serviceDir!,
  entryPoints: SUB2MAIN_DECLARATION.mirrorEntryPoints,
  runtimeAssets: SUB2MAIN_DECLARATION.runtimeAssets,
});
