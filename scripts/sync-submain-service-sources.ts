import { syncServiceMirror } from '@asol/service-mirror-core';
import { SUBMAIN_DECLARATION } from '@asol/vercel-deploy-core';

syncServiceMirror({
  serviceName: 'submain',
  serviceDir: SUBMAIN_DECLARATION.serviceDir!,
  entryPoints: SUBMAIN_DECLARATION.mirrorEntryPoints,
  runtimeAssets: SUBMAIN_DECLARATION.runtimeAssets,
});
