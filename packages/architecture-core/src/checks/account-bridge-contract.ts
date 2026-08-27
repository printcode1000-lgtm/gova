import { addViolation, extractImports, rel } from './architecture-types';

/**
 * The declared runtime doors `@asol/vercel-deploy-core` publishes besides its root.
 *
 * Rule 5 forbids reaching *into* a sealed package, not importing a declared
 * door — the same exception `@asol/account-bridge/notifications` already has.
 * These exist because the package root pulls in the Vercel CLI, `child_process`
 * and the Sandbox SDK: the production deploy console needs the run contracts in
 * the browser, and only the server may hold the sandbox driver. Anything not
 * listed here is still a deep import.
 */
const VERCEL_DEPLOY_CORE_DOORS = new Set([
  '@asol/vercel-deploy-core/github-push-identity',
  '@asol/vercel-deploy-core/remote-deploy-contracts',
  '@asol/vercel-deploy-core/remote-deploy-sandbox',
]);

export function checkAccountBridgeContract(filePath: string, content: string): void {
  const fileRel = rel(filePath);

  // Rule 0: No file under services/ may import account-bridge, service-bridge, or notification-bridge
  if (fileRel.startsWith('services/')) {
    const imports = extractImports(content);
    for (const imp of imports) {
      if (
        imp.startsWith('@asol/account-bridge') ||
        imp.includes('service-bridge') ||
        imp.includes('notification-bridge')
      ) {
        addViolation(
          'Rule 0 Contract',
          filePath,
          `Service deployment file ${fileRel} imports inter-account channel module "${imp}".`,
          'Inter-account channel runs on client device only and must NOT be reachable from any backend service.',
        );
      }
    }
  }

  // Rule 5: No relative path traversal into packages/ and no deep imports of sealed packages
  const imports = extractImports(content);
  for (const imp of imports) {
    if (imp.startsWith('.') && imp.includes('packages/')) {
      addViolation(
        'Rule 5 Contract',
        filePath,
        `Relative path traversal into packages/ via "${imp}".`,
        'Import package via @asol/<package-name> instead of relative path traversal into packages/.',
      );
    }

    if (
      (imp.startsWith('@asol/vercel-deploy-core/') &&
        !VERCEL_DEPLOY_CORE_DOORS.has(imp)) ||
      imp.startsWith('@asol/service-mirror-core/') ||
      (imp.startsWith('@asol/account-bridge/') && imp !== '@asol/account-bridge/notifications') ||
      imp.startsWith('@asol/notifications-composition/') ||
      imp.startsWith('@asol/products-composition/') ||
      imp.startsWith('@asol/orders-composition/') ||
      imp.startsWith('@asol/profiles-composition/') ||
      imp.startsWith('@asol/submain-composition/') ||
      imp.startsWith('@asol/sub2main-composition/')
    ) {
      addViolation(
        'Rule 5 Contract',
        filePath,
        `Deep import of sealed package "${imp}".`,
        'Import only from declared package root or doors.',
      );
    }
  }
}
