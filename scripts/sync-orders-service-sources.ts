import { syncServiceMirror } from '@asol/service-mirror-core';
import { ORDERS_DECLARATION } from '@asol/vercel-deploy-core';

syncServiceMirror({
  serviceName: 'orders',
  serviceDir: ORDERS_DECLARATION.serviceDir!,
  entryPoints: ORDERS_DECLARATION.mirrorEntryPoints,
  runtimeAssets: ORDERS_DECLARATION.runtimeAssets,
});
