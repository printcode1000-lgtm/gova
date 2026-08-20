import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

const requiredCaptureSurfaces = [
  'src/features/system-logs/SystemLogCollector.tsx',
  'src/features/system-logs/SystemLogErrorBoundary.tsx',
  'src/features/system-logs/RouteErrorFallback.tsx',
  // `reportSystemIssue` is imported straight from this package now — the application's one-line
  // re-export of it was a second name for one surface, not a second surface.
  'src/app/global-error.tsx',
  'src/core/api/traced-route.ts',
  'src/core/api/api-response.ts',
  'packages/system-logs-core/src/browser/global-capture.ts',
  'packages/system-logs-core/src/browser/capture-coordinator.ts',
  'packages/system-logs-core/src/server/persistent-log-service.ts',
  'scripts/validate-error-logging.ts',
];

const requiredPlatforms = ['web', 'android', 'ios', 'server'];

export function runScenarioCoverageTest() {
  for (const relative of requiredCaptureSurfaces) {
    const full = path.join(workspaceRoot, relative);
    assert.ok(readFileSync(full, 'utf8').length > 0, `missing capture surface: ${relative}`);
  }

  const collector = readFileSync(
    path.join(workspaceRoot, 'src/features/system-logs/SystemLogCollector.tsx'),
    'utf8',
  );
  assert.ok(collector.includes('installGlobalCapture'));
  assert.ok(collector.includes('registerSystemLogsCoreBrowserPorts'));

  const globalError = readFileSync(
    path.join(workspaceRoot, 'src/app/global-error.tsx'),
    'utf8',
  );
  assert.ok(globalError.includes('reportSystemIssue'));

  const tracedRoute = readFileSync(
    path.join(workspaceRoot, 'src/core/api/traced-route.ts'),
    'utf8',
  );
  assert.ok(tracedRoute.includes('isErrorAlreadyLogged'));
  assert.ok(tracedRoute.includes('markErrorAsLogged'));

  const captureCoordinator = readFileSync(
    path.join(workspaceRoot, 'packages/system-logs-core/src/browser/capture-coordinator.ts'),
    'utf8',
  );
  assert.ok(
    captureCoordinator.includes("import type { SystemLogInput, SystemLogLevel }"),
    'capture-coordinator must import SystemLogLevel for SystemIssueContext typing',
  );

  const preAuthReporter = readFileSync(
    path.join(workspaceRoot, 'src/features/system-logs/pre-auth-failure-reporter.ts'),
    'utf8',
  );
  assert.ok(
    preAuthReporter.includes('publicEnv.webBundleVersion'),
    'pre-auth-failure-reporter must attach app/native versions',
  );

  const entities = readFileSync(
    path.join(workspaceRoot, 'packages/system-logs-core/src/domain/entities.ts'),
    'utf8',
  );
  for (const platform of requiredPlatforms) {
    assert.ok(entities.includes(`'${platform}'`), `platform ${platform} missing`);
  }

  console.log('✅ system-logs-core scenario coverage test passed');
}
