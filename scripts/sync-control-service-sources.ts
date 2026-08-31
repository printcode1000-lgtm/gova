#!/usr/bin/env tsx
import { syncServiceMirror } from '@asol/service-mirror-core';
import { CONTROL_DECLARATION } from '@asol/account-declarations/control';

syncServiceMirror({
  serviceName: 'control',
  serviceDir: CONTROL_DECLARATION.serviceDir!,
  entryPoints: CONTROL_DECLARATION.mirrorEntryPoints,
  runtimeAssets: CONTROL_DECLARATION.runtimeAssets,
});
