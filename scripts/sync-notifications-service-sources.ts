import { syncServiceMirror } from '@asol/service-mirror-core';
import { NOTIFICATIONS_DECLARATION } from '@asol/vercel-deploy-core';

syncServiceMirror({
  serviceName: 'notifications',
  serviceDir: NOTIFICATIONS_DECLARATION.serviceDir!,
  entryPoints: NOTIFICATIONS_DECLARATION.mirrorEntryPoints,
  runtimeAssets: NOTIFICATIONS_DECLARATION.runtimeAssets,
});
