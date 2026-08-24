import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, addViolation } from './architecture-types';

const REQUIRED_LAYOUT_MARKERS = [
  'SystemLogCollector',
  'SystemLogErrorBoundary',
];

const REQUIRED_CAPTURE_FILES = [
  'src/app/global-error.tsx',
  'src/features/system-logs/application/SystemLogCollector.tsx',
  'src/features/system-logs/application/system-logs-core-bootstrap.ts',
  // The server half is `src/core/config/system-logs.server.ts` itself. The feature folder used to
  // carry a one-line re-export of it; a second name for one surface is not a second surface.
  'src/core/config/system-logs.server.ts',
  'packages/system-logs-core/src/browser/global-capture.ts',
  'packages/native-core/android/src/main/java/hgh/asol/app/NativeCrashPlugin.java',
  'packages/native-core/ios/Sources/AsolNativeCore/NativeCrashPlugin.swift',
];

const FORBIDDEN_APP_IMPORTS = [
  '@asol/data-core/system-logs',
];

export function checkSystemLogsContract(filePath: string, content: string): void {
  const rel = filePath.replace(/\\/g, '/');
  if (!rel.startsWith(join(ROOT, 'src').replace(/\\/g, '/'))) return;
  if (rel.includes('/tests/')) return;

  for (const forbidden of FORBIDDEN_APP_IMPORTS) {
    if (content.includes(forbidden)) {
      addViolation(
        'shared',
        rel,
        `Direct legacy system-logs import (${forbidden}). Use @asol/system-logs-core instead.`,
      );
    }
  }
}

export function checkSystemLogsBootstrapContract(): void {
  const layoutPath = join(ROOT, 'src/app/layout.tsx');
  const layout = readFileSync(layoutPath, 'utf8');
  for (const marker of REQUIRED_LAYOUT_MARKERS) {
    if (!layout.includes(marker)) {
      addViolation(
        'presentation',
        'src/app/layout.tsx',
        `Root layout missing required system-logs marker: ${marker}`,
      );
    }
  }

  for (const relative of REQUIRED_CAPTURE_FILES) {
    const full = join(ROOT, relative);
    if (!existsSync(full)) {
      addViolation(
        'shared',
        relative,
        `Missing required system-logs capture surface: ${relative}`,
      );
    }
  }

  const globalError = readFileSync(join(ROOT, 'src/app/global-error.tsx'), 'utf8');
  if (!globalError.includes('reportSystemIssue')) {
    addViolation(
      'presentation',
      'src/app/global-error.tsx',
      'global-error.tsx must call reportSystemIssue for root-level failures',
    );
  }

  // Build/test composition is generated centrally by scripts/generated-gates.ts and is verified
  // before the repository-wide architecture scan by scripts/generated-gate-contract.ts. Requiring
  // literal test names inside package.json here would contradict those generated entrypoints and
  // duplicate ownership of the gate policy.
}
