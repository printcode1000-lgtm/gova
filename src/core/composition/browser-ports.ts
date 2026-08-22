'use client';

import { configureObservabilityCore } from '@asol/observability-core';

import { isDevelopment } from '@/core/config';
import { registerOtaCorePorts } from '@/features/ota/ota-core-ports';
import { registerAccountBridgePorts } from '@/features/account-bridge/account-bridge-ports';
import { registerDataCoreBrowserPorts } from '@/features/data/data-core-browser-ports';
import { registerPageSaveCorePorts } from '@/features/page-save/page-save-core-bootstrap';
import { registerPageSnapshotCorePorts } from '@/features/page-snapshot/services/page-snapshot-service';
import { registerSystemLogsCoreBrowserPorts } from '@/features/system-logs/system-logs-core-bootstrap';

/**
 * The composition root for every browser-side port a sealed package names.
 *
 * Registration used to be scattered: each consumer imported whichever seam it happened to need,
 * which is how the OTA ports once stayed at their defaults through the whole splash — the
 * component that registered them had not mounted yet, and the safe default hid it.
 *
 * One entry point makes "which seams exist" a single fact instead of per-file knowledge.
 * `src/core/composition/tests/ports-registry.test.ts` asserts that every seam in `src/` is
 * called from here, so adding a package without wiring it fails a gate rather than a user.
 *
 * Idempotent and side-effect free beyond the registration itself: every `configure*Core` merges,
 * so calling this from several modules costs nothing.
 */
let registered = false;

export function registerBrowserPorts(): void {
  if (registered) return;
  registered = true;

  // The developer monitor records nothing in production. It must not decide that for itself —
  // the runtime context knows about static export and the native container too.
  configureObservabilityCore({ isDevelopment: () => isDevelopment });
  registerOtaCorePorts();
  registerAccountBridgePorts();
  registerDataCoreBrowserPorts();
  registerPageSaveCorePorts();
  registerPageSnapshotCorePorts();
  registerSystemLogsCoreBrowserPorts();
}
