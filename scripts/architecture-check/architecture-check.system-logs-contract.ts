import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, addViolation } from './architecture-check.architecture-types';

const REQUIRED_LAYOUT_MARKERS = [
  'SystemLogCollector',
  'SystemLogErrorBoundary',
];

const REQUIRED_CAPTURE_FILES = [
  'src/app/global-error.tsx',
  'src/features/system-logs/SystemLogCollector.tsx',
  'src/features/system-logs/system-logs-core-bootstrap.ts',
  'src/features/system-logs/system-logs-core-bootstrap.server.ts',
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

  const packageJson = JSON.parse(
    readFileSync(join(ROOT, 'package.json'), 'utf8'),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};
  for (const chain of ['build', 'build:static', 'test'] as const) {
    const value = scripts[chain] ?? '';
    if (!value.includes('test:system-logs-core')) {
      addViolation(
        'configuration',
        'package.json',
        `${chain} script must run test:system-logs-core`,
      );
    }
    if (chain === 'test' && !value.includes('validate:error-logging')) {
      addViolation(
        'configuration',
        'package.json',
        'test script must run validate:error-logging',
      );
    }
  }
}
