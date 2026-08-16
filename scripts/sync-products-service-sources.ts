import { syncServiceMirror } from '@asol/service-mirror-core';
import { PRODUCTS_DECLARATION } from '@asol/vercel-deploy-core';

syncServiceMirror({
  serviceName: 'products',
  serviceDir: PRODUCTS_DECLARATION.serviceDir!,
  entryPoints: PRODUCTS_DECLARATION.mirrorEntryPoints,
  runtimeAssets: PRODUCTS_DECLARATION.runtimeAssets,
});
